// ============================================================
// NYSA — Shared CalDAV utilities
// ============================================================

export const CALDAV_BASE = 'https://caldav.icloud.com'

// ── Réseau ────────────────────────────────────────────────────────────────────

export async function caldavRequest(
  method: string,
  url: string,
  auth: string,
  body?: string,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; text: string; headers: Headers }> {
  const headers: Record<string, string> = {
    Authorization: auth,
    'User-Agent':  'NYSA/1.0',
    ...extraHeaders,
  }
  if (body) headers['Content-Type'] = headers['Content-Type'] ?? 'application/xml; charset=utf-8'

  // PROPFIND/REPORT ne suivent pas les redirects automatiquement
  let res = await fetch(url, { method, headers, body, redirect: 'manual' })

  // Suit les redirections manuellement (max 5)
  for (let i = 0; i < 5 && [301, 302, 307, 308].includes(res.status); i++) {
    const loc = res.headers.get('location')
    if (!loc) break
    const next = loc.startsWith('http') ? loc : `${CALDAV_BASE}${loc}`
    res = await fetch(next, { method, headers, body, redirect: 'manual' })
  }

  return { status: res.status, text: await res.text().catch(() => ''), headers: res.headers }
}

// ── XML helpers ───────────────────────────────────────────────────────────────

export function extractHref(xml: string, tagName: string): string | null {
  const outer = xml.match(new RegExp(`<[^>]*:?${tagName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tagName}>`))
  if (!outer) return null
  const inner = outer[1].match(/<[^>]*:?href[^>]*>([\s\S]*?)<\/[^>]*:?href>/)
  return inner ? inner[1].trim() : null
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export async function discoverPrincipal(email: string, password: string): Promise<string | null> {
  const auth = makeAuth(email, password)
  const body = propfindBody('<D:current-user-principal/>')
  for (const url of [`${CALDAV_BASE}/`, `${CALDAV_BASE}/.well-known/caldav`]) {
    const { status, text } = await caldavRequest('PROPFIND', url, auth, body)
    if (status === 207) {
      const href = extractHref(text, 'current-user-principal')
      if (href) return href
    }
  }
  return null
}

export async function getCalendarHomeSet(principalUrl: string, auth: string): Promise<string | null> {
  const url  = toAbsolute(principalUrl)
  const body = propfindBody('<C:calendar-home-set/>', true)
  const { status, text } = await caldavRequest('PROPFIND', url, auth, body)
  if (status !== 207) return null
  return extractHref(text, 'calendar-home-set')
}

export async function findPrimaryCalendarUrl(homeSet: string, auth: string): Promise<string | null> {
  const absUrl = toAbsolute(homeSet)
  const serverBase = absUrl.match(/^(https?:\/\/[^/]+)/)?.[1] ?? CALDAV_BASE
  const body = propfindBody('<D:resourcetype/><D:displayname/>', false, '1')
  const { status, text } = await caldavRequest('PROPFIND', absUrl, auth, body, { Depth: '1' })
  if (status !== 207) return null

  const blocks = text.split(/<(?:[^>]*:)?response\b[^/][^>]*>/).slice(1)
  const candidates: string[] = []

  for (const block of blocks) {
    const hasCalendar = /<(?:[^>]*:)?calendar[\s/>]/.test(block)
    const href        = block.match(/<(?:[^>]*:)?href[^>]*>([\s\S]*?)<\/(?:[^>]*:)?href>/)
    if (hasCalendar && href) {
      const h = href[1].trim()
      if (!h.includes('inbox') && !h.includes('outbox') && !h.includes('notification')) {
        candidates.push(h)
      }
    }
  }
  if (!candidates.length) return null
  const h = candidates[0]
  return h.startsWith('http') ? h : `${serverBase}${h}`
}

// ── iCal parsing ──────────────────────────────────────────────────────────────

export interface CalDAVEvent {
  uid: string; summary: string; dtstart: string; dtend: string
  location?: string; description?: string; etag?: string
  calendarName?: string   // nom du calendrier Apple source
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
  const y  = raw.slice(0, 4), mo = raw.slice(4, 6), d  = raw.slice(6, 8)
  const h  = raw.slice(9, 11), mi = raw.slice(11, 13), s = raw.slice(13, 15) || '00'
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${raw.endsWith('Z') ? 'Z' : ''}`).toISOString()
}

export function parseVCalendar(ics: string, etag?: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = []
  const vevents = ics.split('BEGIN:VEVENT')
  for (let i = 1; i < vevents.length; i++) {
    const block    = vevents[i].split('END:VEVENT')[0]
    const unfolded = block.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
    const lines: Record<string, string> = {}
    for (const line of unfolded.split(/\r?\n/)) {
      const sep = line.indexOf(':')
      if (sep < 0) continue
      lines[line.slice(0, sep).split(';')[0].trim().toUpperCase()] = line.slice(sep + 1).trim()
    }
    if (!lines.UID || !lines.SUMMARY || !lines.DTSTART) continue
    events.push({
      uid:         lines.UID,
      summary:     lines.SUMMARY,
      dtstart:     parseICalDate(lines.DTSTART),
      dtend:       lines.DTEND ? parseICalDate(lines.DTEND) : parseICalDate(lines.DTSTART),
      location:    lines.LOCATION    || undefined,
      description: lines.DESCRIPTION || undefined,
      etag,
    })
  }
  return events
}

// ── Enumère tous les calendriers sous le homeSet ─────────────────────────────

export interface CalendarInfo {
  url:  string
  name: string
}

function parseCalendarBlocks(text: string, serverBase: string): CalendarInfo[] {
  const results: CalendarInfo[] = []
  const blocks = text.split(/<(?:[^>]*:)?response\b[^/][^>]*>/).slice(1)
  for (const block of blocks) {
    const isCalendar = /<(?:[^>]*:)?calendar[\s/>]/.test(block)
    if (!isCalendar) continue
    const hrefMatch = block.match(/<(?:[^>]*:)?href[^>]*>([\s\S]*?)<\/(?:[^>]*:)?href>/)
    if (!hrefMatch) continue
    const href = hrefMatch[1].trim()
    if (/inbox|outbox|notification|dropbox|freebusy/i.test(href)) continue
    const nameMatch = block.match(/<(?:[^>]*:)?displayname[^>]*>([\s\S]*?)<\/(?:[^>]*:)?displayname>/)
    const name = nameMatch ? nameMatch[1].trim() : href.split('/').filter(Boolean).pop() ?? 'Calendrier'
    const url  = href.startsWith('http') ? href : `${serverBase}${href}`
    results.push({ url, name })
  }
  return results
}

export async function listCalendarsWithNames(homeSetUrl: string, auth: string): Promise<CalendarInfo[]> {
  const absUrl     = toAbsolute(homeSetUrl)
  const serverBase = absUrl.match(/^(https?:\/\/[^/]+)/)?.[1] ?? CALDAV_BASE

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:resourcetype/><D:displayname/></D:prop>
</D:propfind>`

  const { status, text } = await caldavRequest('PROPFIND', absUrl, auth, body, { Depth: '1' })
  if (status !== 207) return []
  return parseCalendarBlocks(text, serverBase)
}

export async function listCalendarUrls(homeSetUrl: string, auth: string): Promise<string[]> {
  const calendars = await listCalendarsWithNames(homeSetUrl, auth)
  return calendars.map(c => c.url)
}

// ── Requête REPORT sur un calendrier individuel ───────────────────────────────

function parseCalendarReport(text: string): CalDAVEvent[] {
  const all: CalDAVEvent[] = []
  const rx = /<[^>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^>]*:?calendar-data>/g
  let m: RegExpExecArray | null
  while ((m = rx.exec(text)) !== null) {
    const ics = m[1]
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#xD;/g, '')
    all.push(...parseVCalendar(ics))
  }
  return all
}

async function queryCalendarEvents(calUrl: string, auth: string, start: string, end: string): Promise<CalDAVEvent[]> {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

  const { status, text } = await caldavRequest('REPORT', calUrl, auth, body, { Depth: '1' })
  if (status !== 207) return []
  return parseCalendarReport(text)
}

// ── Fetch all events (Jan 2026 → +2 ans, tous les calendriers) ───────────────

export async function fetchAllEvents(
  homeSetUrl: string,
  auth: string,
  excludedCalendarNames: string[] = [],
): Promise<CalDAVEvent[]> {
  const start = '20260101T000000Z'
  const end   = fmt(new Date(Date.now() + 730 * 24 * 3600_000))

  // 1. Énumère tous les calendriers individuels (avec noms)
  const calendars = await listCalendarsWithNames(homeSetUrl, auth)

  // Filtre les calendriers exclus (comparaison insensible à la casse)
  const excluded = excludedCalendarNames.map(n => n.toLowerCase())
  const filtered = calendars.filter(c => !excluded.includes(c.name.toLowerCase()))

  // Si on ne trouve aucun calendrier, essaie directement sur homeSet (fallback)
  if (filtered.length === 0 && calendars.length === 0) {
    return queryCalendarEvents(toAbsolute(homeSetUrl), auth, start, end)
  }

  // 2. Requête chaque calendrier retenu et combine (en taguant calendarName)
  const all: CalDAVEvent[] = []
  for (const cal of filtered) {
    const events = await queryCalendarEvents(cal.url, auth, start, end)
    all.push(...events.map(e => ({ ...e, calendarName: cal.name })))
  }

  // Déduplique par UID
  const seen = new Set<string>()
  return all.filter(e => { if (seen.has(e.uid)) return false; seen.add(e.uid); return true })
}

// ── Trouve l'URL d'un calendrier par son nom ──────────────────────────────────

export async function findCalendarUrlByName(
  homeSetUrl: string,
  calendarName: string,
  auth: string,
): Promise<string | null> {
  const calendars = await listCalendarsWithNames(homeSetUrl, auth)
  const match = calendars.find(
    c => c.name.toLowerCase() === calendarName.toLowerCase()
  )
  return match?.url ?? null
}

// ── iCal builder ─────────────────────────────────────────────────────────────

export function buildICS(uid: string, title: string, start: string, end: string, description?: string | null, location?: string | null): string {
  const now = toICalDate(new Date().toISOString())
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//NYSA//NYSA Calendar 1.0//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : null,
    location    ? `LOCATION:${location}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export function toICalDate(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z'
}

// ── Core sync function (réutilisable par sync route + cron) ───────────────────

export async function runAppleSync(
  userId: string,
  email: string,
  appPassword: string,
  supabase: any,
): Promise<{ added: number; removed: number; error?: string }> {
  const auth = makeAuth(email, appPassword)

  // Récupère ou découvre les credentials
  let { data: integration } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'apple_calendar')
    .single()

  let homeSet: string = integration?.metadata?.homeSet

  if (!homeSet) {
    const principal = await discoverPrincipal(email, appPassword)
    if (!principal) return { added: 0, removed: 0, error: 'Connexion iCloud échouée' }
    const hs = await getCalendarHomeSet(principal, auth)
    if (!hs) return { added: 0, removed: 0, error: 'Calendrier introuvable' }
    homeSet = hs
    await supabase.from('integrations').upsert({
      user_id: userId, provider: 'apple_calendar',
      access_token: appPassword,
      metadata: { email, principal, homeSet },
      expires_at: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    }, { onConflict: 'user_id,provider' })
  }

  // Fetch tous les événements iCloud (Jan 2026 → +2 ans)
  // Respecte la liste des calendriers exclus stockée dans metadata
  const excludedCalendars: string[] = integration?.metadata?.excludedCalendars ?? []
  const icloudEvents = await fetchAllEvents(homeSet, auth, excludedCalendars)
  const icloudUids   = new Set(icloudEvents.map(e => e.uid))

  // Récupère tous les événements Apple déjà en base
  const { data: existing } = await supabase
    .from('events')
    .select('id, external_id, title, start_at, end_at, category')
    .eq('user_id', userId)
    .eq('source', 'apple')

  const existingMap = new Map((existing ?? []).map((e: any) => [e.external_id, e]))
  const existingUids = new Set(existingMap.keys())

  // ── Ajouts ──────────────────────────────────────────────────────────────
  const toInsert = icloudEvents
    .filter(e => !existingUids.has(e.uid))
    .map(e => ({
      user_id: userId, title: e.summary,
      description: e.description ?? null,
      start_at: e.dtstart, end_at: e.dtend,
      location: e.location ?? null,
      all_day: false, source: 'apple', external_id: e.uid,
      category: e.calendarName ?? null,
    }))

  let added = 0
  if (toInsert.length > 0) {
    const { error } = await supabase.from('events').insert(toInsert)
    if (!error) added = toInsert.length
  }

  // ── Mise à jour des catégories manquantes sur les événements existants ───
  // (événements synchés avant l'ajout du calendarName)
  for (const e of icloudEvents) {
    if (!e.calendarName) continue
    const existing = existingMap.get(e.uid)
    if (existing && !existing.category) {
      await supabase.from('events')
        .update({ category: e.calendarName })
        .eq('id', existing.id)
    }
  }

  // ── Suppressions (dans Apple mais plus dans iCloud) ──────────────────────
  const toDelete = [...existingUids].filter((uid): uid is string => !icloudUids.has(uid as string))
  let removed = 0
  if (toDelete.length > 0) {
    await supabase.from('events')
      .delete()
      .eq('user_id', userId)
      .in('external_id', toDelete)
    removed = toDelete.length
  }

  return { added, removed }
}

// ── Utilitaires internes ──────────────────────────────────────────────────────

export function makeAuth(email: string, password: string): string {
  return 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64')
}

function toAbsolute(url: string): string {
  return url.startsWith('http') ? url : `${CALDAV_BASE}${url}`
}

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
}

function propfindBody(props: string, caldavNs = false, _depth = '0'): string {
  const ns = caldavNs ? ' xmlns:C="urn:ietf:params:xml:ns:caldav"' : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:"${ns}><D:prop>${props}</D:prop></D:propfind>`
}
