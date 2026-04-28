// Debug endpoint — à supprimer après diagnostic
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { caldavRequest, discoverPrincipal, getCalendarHomeSet, listCalendarUrls, makeAuth, CALDAV_BASE } from '@/lib/caldav'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { email, appPassword } = await req.json().catch(() => ({}))

  // Récupère les credentials stockés si pas fournis
  let em = email, pw = appPassword
  if (!em || !pw) {
    const { data: integ } = await supabase.from('integrations').select('access_token, metadata').eq('user_id', user.id).eq('provider', 'apple_calendar').single()
    if (!integ) return NextResponse.json({ error: 'Non connecté' })
    em = integ.metadata.email
    pw = integ.access_token
  }

  const auth  = makeAuth(em, pw)
  const debug: Record<string, unknown> = { email: em }

  // 1. Principal
  const principal = await discoverPrincipal(em, pw)
  debug.principal = principal

  if (!principal) return NextResponse.json({ ...debug, error: 'principal introuvable' })

  // 2. HomeSet
  const homeSet = await getCalendarHomeSet(principal, auth)
  debug.homeSet = homeSet

  if (!homeSet) return NextResponse.json({ ...debug, error: 'homeSet introuvable' })

  // 3. List calendars
  const calUrls = await listCalendarUrls(homeSet, auth)
  debug.calendarUrls = calUrls
  debug.calendarCount = calUrls.length

  // 4. Pour chaque calendrier, envoie le REPORT et montre le résultat brut
  const calResults: Record<string, unknown>[] = []
  const start = '20260101T000000Z'
  const end   = new Date(Date.now() + 730 * 24 * 3600_000).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  for (const calUrl of calUrls.slice(0, 5)) { // max 5
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    const { status, text } = await caldavRequest('REPORT', calUrl, auth, body, { Depth: '1' })
    const eventCount = (text.match(/BEGIN:VEVENT/g) ?? []).length
    calResults.push({
      url: calUrl,
      status,
      eventCount,
      // Montre les 500 premiers chars de la réponse
      preview: text.slice(0, 500),
    })
  }

  debug.calendarResults = calResults

  // 5. Essaie aussi sans filtre de date (pour voir si des events existent)
  if (calUrls.length > 0) {
    const bodyNoFilter = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`
    const { status, text } = await caldavRequest('REPORT', calUrls[0], auth, bodyNoFilter, { Depth: '1' })
    debug.noFilterTest = {
      url: calUrls[0],
      status,
      eventCount: (text.match(/BEGIN:VEVENT/g) ?? []).length,
      preview: text.slice(0, 800),
    }
  }

  return NextResponse.json(debug)
}
