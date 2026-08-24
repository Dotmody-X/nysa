import { anonClient, serviceClient } from './supabase.js'
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
 * Résout un identifiant Discord en session Supabase valide.
 * Retourne null si le compte n'est pas encore lié (voir `linkAccount`).
 *
 * Le jeton obtenu est ensuite passé au serveur MCP, qui l'utilise pour toutes
 * les requêtes : la RLS reste donc le garde-fou de bout en bout, y compris
 * quand c'est Claude Code qui pilote.
 */
export async function resolveSession(discordUserId: string): Promise<Session | null> {
  const cached = cache.get(discordUserId)
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached

  const svc = serviceClient()
  const { data: identity, error } = await svc
    .from('bot_identities')
    .select('user_id, refresh_token')
    .eq('provider', 'discord')
    .eq('external_id', discordUserId)
    .maybeSingle()

  if (error) throw new Error(`Lecture de bot_identities impossible : ${error.message}`)
  if (!identity) return null

  // Supabase fait tourner les refresh tokens : le nouveau doit être persisté,
  // sinon la liaison casse au prochain appel.
  const { data: refreshed, error: refreshError } = await anonClient().auth.refreshSession({
    refresh_token: identity.refresh_token as string,
  })

  if (refreshError || !refreshed.session) {
    cache.delete(discordUserId)
    throw new Error(
      `Session expirée pour ce compte — relance /lier. (${refreshError?.message ?? 'aucune session'})`,
    )
  }

  const session = refreshed.session

  await svc
    .from('bot_identities')
    .update({ refresh_token: session.refresh_token, last_used_at: new Date().toISOString() })
    .eq('provider', 'discord')
    .eq('external_id', discordUserId)

  const entry: Session = {
    userId: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
    expiresAt: (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
  }
  cache.set(discordUserId, entry)
  return entry
}

/**
 * Lie un compte Discord à un compte Nysa sans aller-retour par e-mail :
 * service_role génère un lien magique, échangé immédiatement contre une session.
 *
 * L'appelant DOIT avoir vérifié la liste blanche au préalable — c'est la seule
 * chose qui empêche un tiers de se rattacher à ton adresse.
 */
export async function linkAccount(discordUserId: string, email: string): Promise<string> {
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
      provider: 'discord',
      external_id: discordUserId,
      user_id: verified.session.user.id,
      refresh_token: verified.session.refresh_token,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'provider,external_id' },
  )

  if (upsertError) throw new Error(`Enregistrement de la liaison impossible : ${upsertError.message}`)

  cache.delete(discordUserId)
  log.info(`Compte lié : discord:${discordUserId} -> ${verified.session.user.id}`)
  return verified.session.user.id
}
