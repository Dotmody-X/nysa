// ============================================================
// NYSA — Strava OAuth Callback
// Strava redirige ici après autorisation :
//   GET /api/strava/callback?code=xxx&scope=xxx
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { exchangeCode }              from '@/lib/strava'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // Strava a refusé l'accès
  if (error || !code) {
    return NextResponse.redirect(new URL('/sport?strava=denied', req.url))
  }

  try {
    // 1. Échange code → tokens
    const tokens = await exchangeCode(code)

    // 2. Sauvegarde dans Supabase (table integrations)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs: { name: string; value: string; options?: any }[]) => cs.forEach(c => cookieStore.set(c.name, c.value, c.options)),
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/sport', req.url))
    }

    await supabase
      .from('integrations')
      .upsert({
        user_id:       user.id,
        provider:      'strava',
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    new Date(tokens.expires_at * 1000).toISOString(),
        metadata:      { athlete_id: tokens.athlete_id },
      }, { onConflict: 'user_id,provider' })

    // 3. Redirect vers /sport avec indicateur succès
    return NextResponse.redirect(new URL('/sport?strava=connected', req.url))

  } catch (err) {
    console.error('[Strava callback error]', err)
    return NextResponse.redirect(new URL('/sport?strava=error', req.url))
  }
}
