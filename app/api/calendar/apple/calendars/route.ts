// ============================================================
// NYSA — Liste les calendriers Apple disponibles
// GET /api/calendar/apple/calendars
// ============================================================

import { NextResponse }          from 'next/server'
import { createServerClient }    from '@supabase/ssr'
import { cookies }               from 'next/headers'
import { CALDAV_BASE, makeAuth, discoverPrincipal, getCalendarHomeSet, listCalendarsWithNames } from '@/lib/caldav'

function abs(url: string) { return url.startsWith('http') ? url : `${CALDAV_BASE}${url}` }

export async function GET() {
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

  const { data: integ } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'apple_calendar')
    .single()

  if (!integ) return NextResponse.json({ error: 'Apple Calendar non connecté' }, { status: 400 })

  const email    = integ.metadata?.email
  const password = integ.access_token
  const auth     = makeAuth(email, password)

  let homeSet: string = integ.metadata?.homeSet
  if (!homeSet) {
    const principal = await discoverPrincipal(email, password)
    if (!principal) return NextResponse.json({ error: 'Connexion iCloud échouée' }, { status: 500 })
    const hs = await getCalendarHomeSet(abs(principal), auth)
    if (!hs) return NextResponse.json({ error: 'homeSet introuvable' }, { status: 500 })
    homeSet = hs
  }

  const calendars = await listCalendarsWithNames(homeSet, auth)
  const excluded: string[] = integ.metadata?.excludedCalendars ?? []

  return NextResponse.json({ calendars, excluded })
}
