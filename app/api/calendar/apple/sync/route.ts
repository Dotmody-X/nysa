// ============================================================
// NYSA — Apple Calendar Sync (user-facing)
// POST /api/calendar/apple/sync
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { runAppleSync }              from '@/lib/caldav'

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
  let { email, appPassword } = body as { email?: string; appPassword?: string }

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

  const result = await runAppleSync(user.id, email!, appPassword!, supabase)

  if (result.error) return NextResponse.json({ error: result.error }, { status: 401 })

  return NextResponse.json({
    synced:  result.added,
    removed: result.removed,
    message: `+${result.added} événement(s), -${result.removed} supprimé(s)`,
  })
}
