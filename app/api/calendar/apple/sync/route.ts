// ============================================================
// NYSA — Apple Calendar CalDAV Sync
// POST /api/calendar/apple/sync
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'

const CALDAV_BASE = 'https://caldav.icloud.com'

// ── Helpers ───────────────────────────────────────────────────────────────────

// PROPFIND suit les redirects manuellement (fetch ne le fait pas pour PROPFIND)
async function caldavPropfind(url: string, authHeader: string, body: string, depth = '0'): Promise<string | null> {
  const doRequest = async (target: string) =>
    fetch(target, {
      method: 'PROPFIND',
      headers: {
        Authorization:   authHeader,
        Depth:           depth,
        'Content-Type':  'application/xml; charset=utf-8',
        'User-Agent':    'NYSA/1.0',
      },
      body,
      redirect: 'manual', // on gère manuellement
    })

  let res = await doRequest(url)

  // Suit les redirects 301/302/307/308 (max 5 fois)
  for (let i = 0; i < 5 && (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308); i++) {
    const location = res.headers.get('location')
    if (!location) break
    const next = location.startsWith('http') ? location : `${CALDAV_BASE}${location}`
    res = await doRequest(next)
  }

  if (res.status !== 207 && !res.ok) return null
  return res.text()
}

// Extrait le contenu d'un tag DAV (supporte tous les préfixes namespace)
function extractDavHref(xml: string, tagName: string): string | null {
  // Cherche <xxx:tagName> ou <tagName> puis extrait le <xxx:href> ou <href> à l'intérieur
  const openTag  = new RegExp(`<[^>]*:?${tagName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tagName}>`)
  const hrefTag  = /<[^>]*:?href[^>]*>([\s\S]*?)<\/[^>]*:?href>/
  const outer = xml.match(openTag)
  if (!outer) return null
  const inner = outer[1].match(hrefTag)
  return inner ? inner[1].trim() : null
}

async function discoverPrincipal(email: string, password: string): Promise<string | null> {
  const auth = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64')
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:current-user-principal/></D:prop>
</D:propfind>`

  // Essaie plusieurs points d'entrée iCloud
  const endpoints = [
    `${CALDAV_BASE}/`,
    `${CALDAV_BASE}/.well-known/caldav`,
  ]

  for (const url of endpoints) {
    const xml = await caldavPropfind(url, auth, body)
    if (!xml) continue
    const href = extractDavHref(xml, 'current-user-principal')
    if (href) return href
  }
  return null
}

async function getCalendarHomeSet(principalUrl: string, auth: string): Promise<string | null> {
  const url  = principalUrl.startsWith('http') ? principalUrl : `${CALDAV_BASE}${principalUrl}`
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-home-set/></D:prop>
</D:propfind>`

  const xml = await caldavPropfind(url, auth, body)
  if (!xml) return null
  return extractDavHref(xml, 'calendar-home-set')
}

interface CalDAVEvent {
  uid: string; summary: string; dtstart: string; dtend: string
  location?: string; description?: string
}

function parseICalDate(val: string): string {
  const raw = val.includes(':') ? val.split(':').pop()! : val
  if (raw.length === 8) {
    return new Date(
      parseInt(raw.slice(0, 4)),
      parseInt(raw.slice(4, 6)) - 1,
      parseInt(raw.slice(6, 8)),
    ).toISOString()
  }
  const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8)
  const h = raw.slice(9, 11), mi = raw.slice(11, 13), s = raw.slice(13, 15) || '00'
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${raw.endsWith('Z') ? 'Z' : ''}`).toISOString()
}

function parseVCalendar(ics: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = []
  const vevents = ics.split('BEGIN:VEVENT')
  for (let i = 1; i < vevents.length; i++) {
    const block    = vevents[i].split('END:VEVENT')[0]
    const unfolded = block.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
    const lines: Record<string, string> = {}
    for (const line of unfolded.split(/\r?\n/)) {
      const sep = line.indexOf(':')
      if (sep < 0) continue
      const key = line.slice(0, sep).split(';')[0].trim().toUpperCase()
      lines[key] = line.slice(sep + 1).trim()
    }
    if (!lines.UID || !lines.SUMMARY || !lines.DTSTART) continue
    events.push({
      uid:         lines.UID,
      summary:     lines.SUMMARY,
      dtstart:     parseICalDate(lines.DTSTART),
      dtend:       lines.DTEND ? parseICalDate(lines.DTEND) : parseICalDate(lines.DTSTART),
      location:    lines.LOCATION  || undefined,
      description: lines.DESCRIPTION || undefined,
    })
  }
  return events
}

async function fetchCalendarEvents(homeSetUrl: string, auth: string): Promise<CalDAVEvent[]> {
  const url  = homeSetUrl.startsWith('http') ? homeSetUrl : `${CALDAV_BASE}${homeSetUrl}`
  const now    = new Date()
  const future = new Date(now.getTime() + 90 * 24 * 3600_000)
  const fmt    = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmt(now)}" end="${fmt(future)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

  const xml = await caldavPropfind(url, auth, body, '1')
  if (!xml) return []

  const allEvents: CalDAVEvent[] = []
  const rx = /<[^>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^>]*:?calendar-data>/g
  let m: RegExpExecArray | null
  while ((m = rx.exec(xml)) !== null) {
    const ics = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#xD;/g, '')
    allEvents.push(...parseVCalendar(ics))
  }
  return allEvents
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

  const body = await req.json().catch(() => ({}))
  const { email, appPassword } = body as { email?: string; appPassword?: string }
  if (!email || !appPassword) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const auth = 'Basic ' + Buffer.from(`${email}:${appPassword}`).toString('base64')

  // 1. Discover principal
  const principal = await discoverPrincipal(email, appPassword)
  if (!principal) {
    return NextResponse.json({
      error: 'Connexion iCloud échouée. Vérifie que tu utilises bien un mot de passe spécifique à l\'app (pas ton mot de passe Apple ID)',
    }, { status: 401 })
  }

  // 2. Calendar home set
  const homeSet = await getCalendarHomeSet(principal, auth)
  if (!homeSet) {
    return NextResponse.json({ error: 'Impossible de trouver les calendriers iCloud' }, { status: 500 })
  }

  // 3. Fetch events
  const calEvents = await fetchCalendarEvents(homeSet, auth)
  if (calEvents.length === 0) {
    return NextResponse.json({ synced: 0, message: 'Aucun événement trouvé dans les 90 prochains jours' })
  }

  // 4. Deduplicate
  const uids = calEvents.map(e => e.uid)
  const { data: existing } = await supabase
    .from('events')
    .select('external_id')
    .eq('user_id', user.id)
    .eq('source', 'apple')
    .in('external_id', uids)

  const existingSet = new Set((existing ?? []).map((e: any) => e.external_id))
  const toInsert = calEvents
    .filter(e => !existingSet.has(e.uid))
    .map(e => ({
      user_id:     user.id,
      title:       e.summary,
      description: e.description ?? null,
      start_at:    e.dtstart,
      end_at:      e.dtend,
      location:    e.location ?? null,
      all_day:     false,
      source:      'apple',
      external_id: e.uid,
    }))

  if (toInsert.length === 0) {
    return NextResponse.json({ synced: 0, message: 'Tout est déjà synchronisé' })
  }

  const { error: insertError } = await supabase.from('events').insert(toInsert)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 5. Save integration
  await supabase.from('integrations').upsert({
    user_id:      user.id,
    provider:     'apple_calendar',
    access_token: appPassword,
    metadata:     { email, principal, homeSet },
    expires_at:   new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
  }, { onConflict: 'user_id,provider' })

  return NextResponse.json({
    synced:  toInsert.length,
    message: `${toInsert.length} événement${toInsert.length > 1 ? 's' : ''} importé${toInsert.length > 1 ? 's' : ''}`,
  })
}
