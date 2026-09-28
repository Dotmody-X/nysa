import { anonClient, serviceClient } from './supabase.js'
import { alerter } from './alertes.js'
import { log } from './log.js'

export type Session = {
  userId: string
  email: string | null
  accessToken: string
  /** Epoch ms. */
  expiresAt: number
}

const cache = new Map<string, Session>()
const REFRESH_MARGIN_MS = 60_000

/**
 * Un seul rafraîchissement en vol par identité.
 *
 * Supabase fait TOURNER les refresh tokens : le jeton servi est invalidé dès
 * qu'il a servi. Trois consommateurs partagent l'identité Discord dans ce
 * processus — la passerelle, le worker des demandes (toutes les 30 s) et
 * celui du triage (toutes les 60 s). Quand le cache expirait, ils partaient
 * ensemble avec le même jeton : le premier réussissait, les autres
 * recevaient « Refresh Token Not Found », et la liaison était morte. C'est
 * la panne du 27 septembre 2026, et elle était inévitable sans cette file.
 */
const enVol = new Map<string, Promise<Session | null>>()

/**
 * Une liaison cassée ne se répare pas toute seule : sans ce frein, les
 * workers réessayaient toutes les 30 s — 3 671 erreurs en 21 heures.
 */
const RETENTATIVE_MS = 5 * 60_000
const echecs = new Map<string, { quand: number; message: string }>()

/**
 * Qui détient la session : un compte Discord, ou un service du Pi (nysa-mail)
 * qui agit pour le compte du propriétaire avec son propre jeton — deux
 * processus ne doivent jamais se partager un refresh token, Supabase les
 * fait tourner.
 */
export type Provider = 'discord' | 'telegram' | 'service'

/**
 * Résout un identifiant Discord en session Supabase valide.
 * Retourne null si le compte n'est pas encore lié (voir `linkAccount`).
 *
 * Le jeton obtenu est ensuite passé au serveur MCP, qui l'utilise pour toutes
 * les requêtes : la RLS reste donc le garde-fou de bout en bout, y compris
 * quand c'est Claude Code qui pilote.
 */
export async function resolveSession(externalId: string, provider: Provider = 'discord'): Promise<Session | null> {
  const cle = `${provider}:${externalId}`
  const cached = cache.get(cle)
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached

  // Liaison cassée récemment : on redit l'erreur sans marteler Supabase.
  const echec = echecs.get(cle)
  if (echec && Date.now() - echec.quand < RETENTATIVE_MS) throw new Error(echec.message)

  const existante = enVol.get(cle)
  if (existante) return existante

  const promesse = rafraichir(cle, externalId, provider).finally(() => enVol.delete(cle))
  enVol.set(cle, promesse)
  return promesse
}

/** Le rafraîchissement lui-même — jamais appelé deux fois en parallèle pour la même identité. */
async function rafraichir(cle: string, externalId: string, provider: Provider): Promise<Session | null> {
  const svc = serviceClient()
  const { data: identity, error } = await svc
    .from('bot_identities')
    .select('user_id, refresh_token')
    .eq('provider', provider)
    .eq('external_id', externalId)
    .maybeSingle()

  if (error) throw new Error(`Lecture de bot_identities impossible : ${error.message}`)
  if (!identity) return null

  // Supabase fait tourner les refresh tokens : le nouveau doit être persisté,
  // sinon la liaison casse au prochain appel.
  const { data: refreshed, error: refreshError } = await anonClient().auth.refreshSession({
    refresh_token: identity.refresh_token as string,
  })

  if (refreshError || !refreshed.session) {
    cache.delete(cle)
    const remede = provider === 'discord'
      ? 'relance `!lier ton@email.com` dans Discord.'
      : `relance le service ${externalId} pour qu'il recrée sa session.`
    const message = `Session expirée pour ce compte — ${remede} (${refreshError?.message ?? 'aucune session'})`
    echecs.set(cle, { quand: Date.now(), message })
    // Une liaison morte arrête le triage, les demandes et Discord : ça se crie.
    void alerter(`🔴 Session Supabase perdue (${cle}) — ${remede}\n\`${refreshError?.message ?? 'aucune session'}\``, `session-${cle}`)
    throw new Error(message)
  }

  const session = refreshed.session

  await svc
    .from('bot_identities')
    .update({ refresh_token: session.refresh_token, last_used_at: new Date().toISOString() })
    .eq('provider', provider)
    .eq('external_id', externalId)

  const entry: Session = {
    userId: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
    expiresAt: (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
  }
  cache.set(cle, entry)
  echecs.delete(cle)
  return entry
}

/**
 * Lie un compte Discord à un compte Nysa sans aller-retour par e-mail :
 * service_role génère un lien magique, échangé immédiatement contre une session.
 *
 * L'appelant DOIT avoir vérifié la liste blanche au préalable — c'est la seule
 * chose qui empêche un tiers de se rattacher à ton adresse.
 */
export async function linkAccount(externalId: string, email: string, provider: Provider = 'discord'): Promise<string> {
  const svc = serviceClient()

  const { data: link, error: linkError } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !link.properties?.hashed_token) {
    throw new Error(`Impossible de générer le lien : ${linkError?.message ?? 'jeton absent'}`)
  }

  const { data: verified, error: verifyError } = await anonClient().auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError || !verified.session) {
    throw new Error(`Échange du jeton impossible : ${verifyError?.message ?? 'aucune session'}`)
  }

  const { error: upsertError } = await svc.from('bot_identities').upsert(
    {
      provider,
      external_id: externalId,
      user_id: verified.session.user.id,
      refresh_token: verified.session.refresh_token,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'provider,external_id' },
  )

  if (upsertError) throw new Error(`Enregistrement de la liaison impossible : ${upsertError.message}`)

  cache.delete(`${provider}:${externalId}`)
  echecs.delete(`${provider}:${externalId}`)
  log.info(`Compte lié : ${provider}:${externalId} -> ${verified.session.user.id}`)
  return verified.session.user.id
}

/**
 * La session d'un service du Pi (ex. `nysa-mail`), au nom du propriétaire.
 * Créée au premier appel à partir du compte Discord lié : on retrouve son
 * adresse par l'API admin, puis on lie une identité `service` distincte —
 * son refresh token n'est partagé avec personne.
 */
export async function serviceSession(name: string, ownerDiscordId: string): Promise<Session> {
  const existante = await resolveSession(name, 'service').catch(e => {
    log.warn(`Session du service ${name} à recréer : ${e instanceof Error ? e.message : String(e)}`)
    return null
  })
  if (existante) return existante

  const svc = serviceClient()
  const { data: discord } = await svc
    .from('bot_identities')
    .select('user_id')
    .eq('provider', 'discord')
    .eq('external_id', ownerDiscordId)
    .maybeSingle()
  if (!discord) throw new Error(`Aucun compte Nysa lié au Discord ${ownerDiscordId} : envoie d'abord !lier dans Discord.`)

  const { data: utilisateur, error } = await svc.auth.admin.getUserById(discord.user_id as string)
  if (error || !utilisateur.user?.email) throw new Error(`Adresse du propriétaire introuvable : ${error?.message ?? 'pas d\'e-mail'}`)

  await linkAccount(name, utilisateur.user.email, 'service')
  const session = await resolveSession(name, 'service')
  if (!session) throw new Error(`Session du service ${name} impossible à ouvrir.`)
  return session
}
