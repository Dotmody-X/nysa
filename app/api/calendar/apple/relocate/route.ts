// ============================================================
// NYSA — Rapatriement des sessions rangées dans le mauvais calendrier iCloud
// GET  /api/calendar/apple/relocate  — combien sont à déplacer
// POST /api/calendar/apple/relocate  — en déplace un lot
//
// Jusqu'au 25/09/2026, une session du time tracker sans label partait avec
// une catégorie vide et la route push la posait dans le calendrier principal
// (Dou&Dou). On déplace vers DEFAULT_TIME_CALENDAR les événements créés par
// Nysa qui sont dans le calendrier principal alors que leur catégorie ne
// désigne aucun calendrier réel. Un événement rangé exprès dans le principal
// (catégorie = son nom) n'est pas touché.
// ============================================================

import { NextResponse }       from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { caldavRequest, listCalendarsWithNames, listCalendarFiles, makeAuth } from '@/lib/caldav'
import { DEFAULT_TIME_CALENDAR } from '@/lib/calendarDefaults'

export const maxDuration = 60

const BATCH       = 20
const CONCURRENCY = 5
const ICS_HEADERS = { 'Content-Type': 'text/calendar; charset=utf-8' }

async function getCtx() {
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
  return { supabase, user }
}

const withSlash = (u: string) => u.replace(/\/?$/, '/')
const samePath  = (a: string, b: string) => {
  try { return withSlash(new URL(a).pathname) === withSlash(new URL(b).pathname) } catch { return false }
}
const fileOf = (externalId: string) => `${externalId.replace(/@.*$/, '')}.ics`

type Plan =
  | { skipped: string }
  | {
      auth: string
      from: { name: string; url: string }
      to:   { name: string; url: string }
      candidates: { id: string; external_id: string }[]
    }

async function plan(supabase: any, userId: string): Promise<Plan> {
  const { data: integ } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', userId)
    .eq('provider', 'apple_calendar')
    .single()
  const homeSet = integ?.metadata?.homeSet as string | undefined
  const primary = integ?.metadata?.primaryCalendarUrl as string | undefined
  if (!integ || !homeSet || !primary) return { skipped: 'Apple Calendar non connecté' }

  const auth      = makeAuth(integ.metadata.email, integ.access_token)
  const calendars = await listCalendarsWithNames(homeSet, auth)
  const from = calendars.find(c => samePath(c.url, primary))
  const to   = calendars.find(c => c.name.toLowerCase() === DEFAULT_TIME_CALENDAR.toLowerCase())
  if (!from || !to)          return { skipped: 'Calendriers introuvables' }
  if (samePath(from.url, to.url)) return { skipped: 'Rien à déplacer' }

  const [files, { data: events }] = await Promise.all([
    listCalendarFiles(from.url, auth),
    supabase
      .from('events')
      .select('id, external_id, category')
      .eq('user_id', userId)
      .eq('source', 'synced')
      .like('external_id', 'nysa-%'),
  ])
  if (!files) return { skipped: 'iCloud injoignable' }

  const realNames  = new Set(calendars.map(c => c.name.toLowerCase()))
  const candidates = ((events ?? []) as { id: string; external_id: string; category: string | null }[])
    .filter(e => files.has(fileOf(e.external_id)))
    .filter(e => !(e.category && realNames.has(e.category.toLowerCase())))

  return { auth, from, to, candidates }
}

// Copie l'objet tel quel (retouches faites dans iCloud comprises), puis retire
// l'original. Si iCloud refuse un UID déjà présent ailleurs, on libère l'UID
// d'abord et on remet l'original en place si la copie échoue encore.
async function move(auth: string, fromUrl: string, toUrl: string, file: string): Promise<boolean> {
  const src = `${withSlash(fromUrl)}${file}`
  const dst = `${withSlash(toUrl)}${file}`
  const ok  = (s: number) => s === 200 || s === 201 || s === 204

  const got = await caldavRequest('GET', src, auth)
  if (got.status !== 200 || !got.text.includes('BEGIN:VCALENDAR')) return false

  const put = await caldavRequest('PUT', dst, auth, got.text, ICS_HEADERS)
  if (ok(put.status)) {
    await caldavRequest('DELETE', src, auth)
    return true
  }

  await caldavRequest('DELETE', src, auth)
  const retry = await caldavRequest('PUT', dst, auth, got.text, ICS_HEADERS)
  if (ok(retry.status)) return true
  await caldavRequest('PUT', src, auth, got.text, ICS_HEADERS)
  return false
}

export async function GET() {
  const { supabase, user } = await getCtx()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const p = await plan(supabase, user.id)
  if ('skipped' in p) return NextResponse.json({ count: 0, skipped: p.skipped })
  return NextResponse.json({ count: p.candidates.length, from: p.from.name, to: p.to.name })
}

export async function POST() {
  const { supabase, user } = await getCtx()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const p = await plan(supabase, user.id)
  if ('skipped' in p) return NextResponse.json({ moved: 0, failed: 0, remaining: 0, skipped: p.skipped })

  const batch = p.candidates.slice(0, BATCH)
  let moved = 0
  let failed = 0
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(batch.slice(i, i + CONCURRENCY).map(async e => {
      if (await move(p.auth, p.from.url, p.to.url, fileOf(e.external_id))) {
        await supabase.from('events').update({ category: p.to.name }).eq('id', e.id)
        moved++
      } else {
        failed++
      }
    }))
  }

  return NextResponse.json({
    moved, failed,
    remaining: p.candidates.length - moved,
    from: p.from.name, to: p.to.name,
  })
}
