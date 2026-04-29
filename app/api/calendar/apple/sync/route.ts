// ============================================================
// NYSA — Apple Calendar Sync (user-facing)
// POST /api/calendar/apple/sync
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { runAppleSync }              from '@/lib/caldav'

// PATCH — met à jour la liste des calendriers exclus + re-sync
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs: { name: string; value: string; options?: any }[]) =>
          cs.forEach(c => cookieStore.set(c.name, c.value, c.options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { excludedCalendars } = await req.json().catch(() => ({})) as { excludedCalendars?: string[] }

  const { data: integ } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'apple_calendar')
    .single()

  if (!integ) return NextResponse.json({ error: 'Apple Calendar non connecté' }, { status: 400 })

  // Met à jour les metadata avec les nouveaux excluded
  const newMeta = { ...integ.metadata, excludedCalendars: excludedCalendars ?? [] }
  await supabase.from('integrations')
    .update({ metadata: newMeta })
    .eq('user_id', user.id)
    .eq('provider', 'apple_calendar')

  // Re-sync avec le nouveau filtre
  const { runAppleSync } = await import('@/lib/caldav')
  const result = await runAppleSync(user.id, integ.metadata.email, integ.access_token, supabase)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ synced: result.added, removed: result.removed })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs: { name: string; value: string; options?: any }[]) =>
          cs.forEach(c => cookieStore.set(c.name, c.value, c.options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Mode 1 — premier connect (email + mdp fournis)
  // Mode 2 — auto-sync silencieux (utilise les credentials stockés)
  const body = await req.json().catch(() => ({}))
  let { email, appPassword, excludedCalendars } = body as { email?: string; appPassword?: string; excludedCalendars?: string[] }

  if (!email || !appPassword) {
    // Récupère les credentials stockés
    const { data: integ } = await supabase
      .from('integrations')
      .select('access_token, metadata')
      .eq('user_id', user.id)
      .eq('provider', 'apple_calendar')
      .single()

    if (!integ) return NextResponse.json({ skipped: true, reason: 'Apple Calendar non connecté' })
    email       = integ.metadata.email
    appPassword = integ.access_token
  }

  // Si l'utilisateur vient de fournir ses credentials (premier connect ou reconnect)
  // → on les sauvegarde immédiatement AVANT de lancer le sync
  if (body.email && body.appPassword) {
    const { error: upsertErr } = await supabase.from('integrations').upsert({
      user_id:      user.id,
      provider:     'apple_calendar',
      access_token: appPassword,
      metadata:     { email, ...(excludedCalendars !== undefined ? { excludedCalendars } : {}) },
      expires_at:   new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    }, { onConflict: 'user_id,provider' })

    if (upsertErr) {
      console.error('[sync] Échec upsert integrations:', upsertErr)
      return NextResponse.json({ error: `Impossible de sauvegarder les credentials: ${upsertErr.message}` }, { status: 500 })
    }
  }

  const result = await runAppleSync(user.id, email!, appPassword!, supabase)

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({
    synced:  result.added,
    removed: result.removed,
    message: `+${result.added} événement(s), -${result.removed} supprimé(s)`,
  })
}
