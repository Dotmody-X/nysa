// ============================================================
// NYSA — Abonnements calendrier iCal (flux .ics / webcal)
// Ingestion directe d'un flux publié : GET du .ics → parseVCalendar → table `events`.
// Complémentaire de lib/caldav.ts (iCloud CalDAV), qui ne voit PAS les calendriers
// abonnés. Un flux abonné dans Apple Calendrier a une URL publique : on la lit ici.
// ============================================================

import { parseVCalendar } from '@/lib/caldav'

// Un flux mémorisé (stocké dans integrations.metadata.feeds, provider 'ics_feed').
export interface IcsFeed {
  id:    string   // identifiant stable (préfixe des external_id des events de ce flux)
  url:   string   // URL https d'origine (webcal:// déjà converti)
  name:  string   // nom affiché (catégorie des events)
  color: string   // couleur des events de ce flux
}

// ── Normalisation d'URL ───────────────────────────────────────────────────────
// webcal:// → https:// ; webcals:// → https:// . Refuse tout le reste.
export function normalizeFeedUrl(raw: string): string | null {
  const u = (raw ?? '').trim()
  if (!u) return null
  const lowered = u.toLowerCase()
  if (lowered.startsWith('webcal://'))  return 'https://' + u.slice('webcal://'.length)
  if (lowered.startsWith('webcals://')) return 'https://' + u.slice('webcals://'.length)
  if (lowered.startsWith('https://') || lowered.startsWith('http://')) return u
  return null
}

// ── Récupération du flux ──────────────────────────────────────────────────────
// UA navigateur : Google (et d'autres fournisseurs) répondent parfois 403/429 à
// un User-Agent non-navigateur depuis une IP serveur/datacenter. On se présente
// donc comme un navigateur. Timeout via AbortController (portable partout).
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

export async function fetchIcsText(url: string): Promise<{ ok: boolean; text: string; error?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/calendar, text/plain, */*' },
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, text: '', error: `Le serveur du calendrier a répondu ${res.status}` }
    const text = await res.text()
    if (!text.includes('BEGIN:VCALENDAR')) return { ok: false, text: '', error: 'Ce lien ne renvoie pas un calendrier iCal (.ics)' }
    return { ok: true, text }
  } catch (e: unknown) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    return { ok: false, text: '', error: aborted ? 'Délai dépassé (le calendrier a mis trop de temps à répondre)' : 'Lien injoignable' }
  } finally {
    clearTimeout(timer)
  }
}

// Nom lisible du calendrier : X-WR-CALNAME si présent.
export function extractCalName(ics: string): string | null {
  const m = ics.match(/^X-WR-CALNAME[^:]*:(.*)$/mi)
  return m ? m[1].replace(/\\,/g, ',').trim() : null
}

// ── Sync d'UN flux vers la table events ───────────────────────────────────────
// Réconciliation scoping par préfixe external_id = `${feed.id}:` → n'affecte que
// les events de CE flux. source='ics'.
async function syncOneFeed(
  userId: string,
  feed: IcsFeed,
  supabase: any,
): Promise<{ added: number; updated: number; removed: number; error?: string }> {
  const fetched = await fetchIcsText(feed.url)
  if (!fetched.ok) return { added: 0, updated: 0, removed: 0, error: fetched.error }

  const parsed = parseVCalendar(fetched.text)
  // Clé externe préfixée par le flux pour éviter les collisions d'UID entre flux.
  const incoming = new Map<string, {
    external_id: string; title: string; start_at: string; end_at: string
    location: string | null; description: string | null; all_day: boolean
  }>()
  for (const e of parsed) {
    const external_id = `${feed.id}:${e.uid}`
    incoming.set(external_id, {
      external_id,
      title:       e.summary,
      start_at:    e.dtstart,
      end_at:      e.dtend,
      location:    e.location ?? null,
      description: e.description ?? null,
      all_day:     e.allDay ?? false,
    })
  }

  // Events déjà en base pour ce flux
  const { data: existing } = await supabase
    .from('events')
    .select('id, external_id, title, start_at, end_at, all_day')
    .eq('user_id', userId)
    .eq('source', 'ics')
    .like('external_id', `${feed.id}:%`)

  const existingMap = new Map<string, { id: string; title: string; start_at: string; end_at: string; all_day: boolean }>(
    (existing ?? []).map((e: any) => [e.external_id, e])
  )

  // ── Ajouts ──
  const toInsert = [...incoming.values()]
    .filter(e => !existingMap.has(e.external_id))
    .map(e => ({
      user_id: userId, title: e.title,
      description: e.description, start_at: e.start_at, end_at: e.end_at,
      location: e.location, all_day: e.all_day,
      source: 'ics', external_id: e.external_id,
      category: feed.name, color: feed.color,
    }))
  let added = 0
  if (toInsert.length > 0) {
    const { error } = await supabase.from('events').insert(toInsert)
    if (error) return { added: 0, updated: 0, removed: 0, error: error.message }
    added = toInsert.length
  }

  // ── Mises à jour (titre / horaires modifiés côté flux) ──
  let updated = 0
  for (const e of incoming.values()) {
    const prev = existingMap.get(e.external_id)
    if (!prev) continue
    const patch: Record<string, unknown> = {}
    if (prev.title !== e.title) patch.title = e.title
    if (prev.start_at !== e.start_at) patch.start_at = e.start_at
    if (prev.end_at !== e.end_at) patch.end_at = e.end_at
    if (prev.all_day !== e.all_day) patch.all_day = e.all_day
    if (Object.keys(patch).length > 0) {
      await supabase.from('events').update(patch).eq('id', prev.id)
      updated++
    }
  }

  // ── Suppressions (disparus du flux) ──
  const toDelete = [...existingMap.keys()].filter(k => !incoming.has(k))
  let removed = 0
  if (toDelete.length > 0) {
    await supabase.from('events').delete().eq('user_id', userId).in('external_id', toDelete)
    removed = toDelete.length
  }

  return { added, updated, removed }
}

// ── Sync de TOUS les flux mémorisés de l'utilisateur ──────────────────────────
export async function runIcsFeedsSync(
  userId: string,
  supabase: any,
): Promise<{ added: number; updated: number; removed: number; feeds: number; errors: string[] }> {
  const { data: integ } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'ics_feed')
    .single()

  const feeds: IcsFeed[] = integ?.metadata?.feeds ?? []
  let added = 0, updated = 0, removed = 0
  const errors: string[] = []
  for (const feed of feeds) {
    const r = await syncOneFeed(userId, feed, supabase)
    added += r.added; updated += r.updated; removed += r.removed
    if (r.error) errors.push(`${feed.name} : ${r.error}`)
  }
  return { added, updated, removed, feeds: feeds.length, errors }
}
