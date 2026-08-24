import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const NO_PERSIST = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const

/** La config a déjà été validée par le point d'entrée du processus. */
function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`)
  return v
}

/**
 * Client service_role. Réservé à deux usages, tous deux dans la passerelle :
 * lire `bot_identities` et créer une session lors de la liaison d'un compte.
 * Il contourne la RLS — ne jamais l'utiliser pour des données métier.
 */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), NO_PERSIST)
}

/** Client anonyme, sans session : sert uniquement aux échanges de jetons. */
export function anonClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), NO_PERSIST)
}

/**
 * Client agissant AU NOM de l'utilisateur : il porte son JWT, donc la RLS
 * s'applique exactement comme dans l'application web. C'est ce qui garantit
 * qu'un bug dans un tool ne peut pas atteindre les données d'un autre compte.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    ...NO_PERSIST,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
