// Helpers ADMIN — réservés au serveur (routes /api/admin). Ne jamais importer
// côté client : utilise la clé service_role (accès à tous les comptes).

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

/** Emails administrateurs (variable d'env ADMIN_EMAILS, séparés par des virgules). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

/** Client Supabase avec la clé service_role (bypass RLS) — serveur uniquement. */
export function serviceClient(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Renvoie l'admin courant (depuis la session) ou null si non-admin / non connecté. */
export async function getAdmin(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!user || !email) return null
    return adminEmails().includes(email) ? { id: user.id, email } : null
  } catch {
    return null
  }
}
