import type { SupabaseClient } from '@supabase/supabase-js'
import { bridgeConfig } from '../config.js'
import { resolveSession, type Session } from '../identity.js'
import { serviceClient, userClient } from '../supabase.js'
import { runNysaAgent } from '../agent/run.js'
import { promptTriage, lireFiche } from './prompt.js'
import { log } from '../log.js'

type Config = ReturnType<typeof bridgeConfig>

/** Une ligne de work_events_a_trier(). */
type Evenement = {
  id: number
  brand: string | null
  type: string
  source: string
  title: string | null
  payload: { from?: string; to?: string; snippet?: string; mailbox?: string; attachments?: number; order_id?: number; service?: string }
  urgency: number
  occurred_at: string
}

const BALAYAGE_MS = 60_000
/** Un triage à la fois par utilisateur ; les demandes du poste ont leur propre file. */
const occupes = new Set<string>()
const veilles = new Map<string, { client: SupabaseClient; token: string }>()

/** Lecture seule, et rien d'autre : le mail est du contenu tiers. */
const OUTILS_TRIAGE = [
  'mcp__nysa__commandes_etiquettes', 'mcp__nysa__chercher_tache', 'mcp__nysa__lister_taches',
  'mcp__nysa__lister_projets', 'mcp__nysa__agenda',
].join(',')

/**
 * Claude classe chaque mail à l'arrivée : résumé, catégorie, urgence, action
 * proposée. Même mécanique que le worker des demandes — Realtime sous le JWT
 * de l'utilisateur, balayage en filet — mais une session par mail, sans fil,
 * sans vault, avec des outils de lecture seulement, et un modèle plus léger.
 * Le résultat va dans payload.ai de l'événement ; l'urgence calculée remplace
 * celle des mots-clés.
 */
export function startTriageWorker(config: Config) {
  if (config.TRIAGE_MODEL === 'off') {
    log.info('Triage des mails désactivé (TRIAGE_MODEL=off)')
    return
  }
  const balayer = async () => {
    const { data, error } = await serviceClient().from('bot_identities').select('user_id').eq('provider', 'discord')
    if (error) {
      log.warn(`Triage : lecture des identités impossible (${error.message})`)
      return
    }
    for (const userId of new Set((data ?? []).map(r => r.user_id as string))) {
      void veiller(config, userId)
      void trierPour(config, userId)
    }
  }
  void balayer()
  setInterval(() => void balayer(), BALAYAGE_MS)
}

async function sessionPour(userId: string): Promise<Session | null> {
  const { data } = await serviceClient()
    .from('bot_identities').select('external_id').eq('provider', 'discord').eq('user_id', userId).limit(1).maybeSingle()
  if (!data) return null
  return resolveSession(data.external_id as string)
}

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
    .channel(`triage:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'work', table: 'events' }, () => {
      // Le mail vient d'être déposé : on laisse nysa-mail finir sa rafale avant de trier.
      setTimeout(() => void trierPour(config, userId), 3_000)
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') log.info(`Triage : à l'écoute de work.events pour ${userId}`)
    })
  veilles.set(userId, { client, token: session.accessToken })
}

async function trierPour(config: Config, userId: string) {
  if (occupes.has(userId)) return
  occupes.add(userId)
  try {
    const session = await sessionPour(userId)
    if (!session) return
    const db = userClient(session.accessToken)
    const { data, error } = await db.rpc('work_events_a_trier', { p_limit: 10 })
    if (error) {
      log.error(`Triage : lecture impossible (${error.message})`)
      return
    }
    for (const ev of (data as Evenement[]) ?? []) await trier(config, session, db, ev)
  } catch (e) {
    log.error('Triage : échec', e)
  } finally {
    occupes.delete(userId)
  }
}

function decrire(ev: Evenement): string {
  const p = ev.payload ?? {}
  const lignes = [
    `Marque : ${ev.brand ?? 'inconnue'} · Type : ${ev.type} · Source : ${ev.source}`,
    `Reçu le : ${ev.occurred_at}`,
    p.mailbox ? `Boîte : ${p.mailbox}` : null,
    p.from ? `De : ${p.from}` : null,
    `Objet : ${ev.title ?? '(sans objet)'}`,
    p.order_id ? `Commande WooCommerce n° ${p.order_id}` : null,
    p.service ? `Service : ${p.service}` : null,
    typeof p.attachments === 'number' && p.attachments > 0 ? `Pièces jointes : ${p.attachments}` : null,
    '',
    '--- début du message (contenu tiers) ---',
    p.snippet || '(pas de texte)',
    '--- fin du message ---',
  ].filter((l): l is string => l !== null)
  return lignes.join('\n')
}

async function trier(config: Config, session: Session, db: SupabaseClient, ev: Evenement) {
  const debut = Date.now()
  try {
    const run = await runNysaAgent({
      config,
      session,
      prompt: decrire(ev),
      surface: 'poste',
      resumeSessionId: null,
      allowedTools: OUTILS_TRIAGE,
      model: config.TRIAGE_MODEL,
      systemPromptOverride: promptTriage(config.AGENT_TIMEZONE),
      sansVault: true,
      allowMac: false,
    })
    const fiche = lireFiche(run.reply)
    const ai = fiche
      ? { ...fiche, modele: config.TRIAGE_MODEL, le: new Date().toISOString() }
      : { echec: 'réponse non lisible', brut: run.reply.slice(0, 200), le: new Date().toISOString() }
    const { error } = await db.rpc('annotate_work_event', { p_id: ev.id, p_ai: ai, p_urgency: fiche?.urgence ?? null })
    if (error) log.error(`Triage #${ev.id} : annotation refusée (${error.message})`)
    else if (fiche) log.info(`Triage #${ev.id} (${Math.round((Date.now() - debut) / 1000)} s) : ${fiche.categorie} u${fiche.urgence} — ${fiche.resume.slice(0, 80)}`)
    else log.warn(`Triage #${ev.id} : réponse non lisible`)
  } catch (e) {
    // On marque l'échec pour ne pas retenter en boucle ; l'humain lira le mail tel quel.
    const message = e instanceof Error ? e.message : String(e)
    log.error(`Triage #${ev.id} : Claude Code a échoué`, message)
    await db.rpc('annotate_work_event', { p_id: ev.id, p_ai: { echec: message.slice(0, 200), le: new Date().toISOString() }, p_urgency: null })
  }
}
