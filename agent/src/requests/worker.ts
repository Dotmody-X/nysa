import type { SupabaseClient } from '@supabase/supabase-js'
import { bridgeConfig } from '../config.js'
import { resolveSession, type Session } from '../identity.js'
import { serviceClient, userClient } from '../supabase.js'
import { runNysaAgent } from '../agent/run.js'
import { BRANDS, type Brand } from '../brands.js'
import { log } from '../log.js'

type Config = ReturnType<typeof bridgeConfig>

/** Ce que renvoie public.agent_request_claim(). */
type Demande = {
  id: number
  source: string
  question: string
  context: Record<string, unknown>
  created_at: string
}

/** Filet de sécurité si le Realtime rate un réveil. */
const BALAYAGE_MS = 30_000
/** Un seul Claude à la fois par utilisateur : les limites d'usage ne sont pas infinies. */
const occupes = new Set<string>()
/** Fil Claude Code par utilisateur et par source, pour garder le contexte comme un salon. */
const fils = new Map<string, string>()
/** Un abonnement Realtime par utilisateur, sous son JWT. */
const veilles = new Map<string, { client: SupabaseClient; token: string }>()

/**
 * Les demandes déposées depuis l'application (l'iPad du bureau) dans
 * work.agent_requests. Le worker vit dans le processus de la passerelle :
 * même session Supabase, même fil Claude Code, aucun jeton partagé entre
 * deux processus.
 *
 * Deux signaux : un abonnement Realtime par utilisateur, sous son propre JWT
 * (le schéma work n'accorde rien à service_role — un abonnement avec cette
 * clé reçoit l'événement vidé, avec une erreur 401), et un balayage toutes
 * les trente secondes. La prise et la réponse passent aussi par le JWT de
 * l'utilisateur : la RLS reste le garde-fou de bout en bout.
 */
export function startRequestWorker(config: Config) {
  const balayer = async () => {
    // Un identifiant Discord lié par utilisateur : c'est par lui qu'on obtient la session.
    const { data, error } = await serviceClient().from('bot_identities').select('user_id').eq('provider', 'discord')
    if (error) {
      log.warn(`Worker des demandes : lecture des identités impossible (${error.message})`)
      return
    }
    for (const userId of new Set((data ?? []).map(r => r.user_id as string))) {
      void veiller(config, userId)
      void traiterPour(config, userId)
    }
  }
  void balayer()
  setInterval(() => void balayer(), BALAYAGE_MS)
}

/**
 * Ouvre (ou rafraîchit) l'abonnement Realtime de cet utilisateur. Le JWT
 * expire toutes les heures : à chaque balayage, si la session a tourné, on
 * passe le nouveau jeton à la connexion existante.
 */
async function veiller(config: Config, userId: string) {
  const session = await sessionPour(userId).catch(() => null)
  if (!session) return
  const existante = veilles.get(userId)
  if (existante) {
    if (existante.token !== session.accessToken) {
      existante.client.realtime.setAuth(session.accessToken)
      existante.token = session.accessToken
    }
    return
  }
  const client = userClient(session.accessToken)
  client.realtime.setAuth(session.accessToken)
  client
    .channel(`agent_requests:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'work', table: 'agent_requests' }, () => {
      void traiterPour(config, userId)
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') log.info(`Worker des demandes : à l'écoute pour ${userId}`)
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') log.warn(`Worker des demandes : Realtime ${status}, le balayage prend le relais`)
    })
  veilles.set(userId, { client, token: session.accessToken })
}

/** Le Discord lié à cet utilisateur : la clé de resolveSession(). */
async function sessionPour(userId: string): Promise<Session | null> {
  const { data } = await serviceClient()
    .from('bot_identities')
    .select('external_id')
    .eq('provider', 'discord')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return resolveSession(data.external_id as string)
}

async function traiterPour(config: Config, userId: string) {
  if (occupes.has(userId)) return
  occupes.add(userId)
  try {
    const session = await sessionPour(userId)
    if (!session) return
    const db = userClient(session.accessToken)

    // Tant qu'il y a des demandes en attente, on enchaîne.
    for (;;) {
      const { data, error } = await db.rpc('agent_request_claim')
      if (error) {
        log.error(`Worker des demandes : prise impossible (${error.message})`)
        return
      }
      const demande = data as Demande | null
      if (!demande) return
      await repondre(config, session, db, demande)
    }
  } catch (e) {
    log.error('Worker des demandes : échec', e)
  } finally {
    occupes.delete(userId)
  }
}

function marqueDuContexte(ctx: Record<string, unknown>): Brand | null {
  const b = typeof ctx.brand === 'string' ? ctx.brand.toLowerCase() : ''
  return BRANDS[b] ?? null
}

/** Le contexte structuré devient une ligne lisible en fin de prompt. */
function promptDe(d: Demande): string {
  const ctx = { ...d.context }
  delete ctx.brand
  const lignes = Object.entries(ctx)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k} : ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  return lignes.length ? `${d.question}\n\nContexte transmis par l'application :\n${lignes.join('\n')}` : d.question
}

async function repondre(config: Config, session: Session, db: ReturnType<typeof userClient>, d: Demande) {
  const cle = `${session.userId}:${d.source}`
  log.info(`Demande #${d.id} (${d.source}) : ${d.question.slice(0, 80)}`)
  try {
    const run = await runNysaAgent({
      config,
      session,
      prompt: promptDe(d),
      surface: 'poste',
      brand: marqueDuContexte(d.context),
      resumeSessionId: fils.get(cle) ?? null,
      // Le prompt peut contenir un mail écrit par un tiers : jamais le Mac ici.
      allowMac: false,
    })
    if (run.sessionId) fils.set(cle, run.sessionId)
    const { error } = await db.rpc('agent_request_finish', {
      p_id: d.id, p_reply: run.reply, p_error: null, p_session_id: run.sessionId,
    })
    if (error) log.error(`Demande #${d.id} : réponse non enregistrée (${error.message})`)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log.error(`Demande #${d.id} : Claude Code a échoué`, message)
    await db.rpc('agent_request_finish', { p_id: d.id, p_reply: null, p_error: message, p_session_id: null })
  }
}
