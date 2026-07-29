// ============================================================
// NYSA — Abonnements calendrier iCal (flux .ics / webcal)
//   GET    /api/calendar/ics          → liste des flux
//   POST   /api/calendar/ics { url }  → ajoute un flux (valide + importe)
//   POST   /api/calendar/ics {}       → re-sync silencieux de tous les flux
//   DELETE /api/calendar/ics { id }   → retire un flux (+ ses événements)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { randomUUID }                from 'crypto'
import {
  runIcsFeedsSync, normalizeFeedUrl, fetchIcsText, extractCalName, type IcsFeed,
} from '@/lib/icsFeed'

// Palette pour attribuer une couleur au nouveau flux (identique à l'esprit NYSA).
const FEED_PALETTE = ['#9333EA', '#2563EB', '#16A34A', '#DB2777', '#D97706', '#0891B2', '#7C3AED', '#DC2626']

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

async function readFeeds(supabase: any, userId: string): Promise<IcsFeed[]> {
  const { data } = await supabase
    .from('integrations').select('metadata')
    .eq('user_id', userId).eq('provider', 'ics_feed').single()
  return data?.metadata?.feeds ?? []
}

async function writeFeeds(supabase: any, userId: string, feeds: IcsFeed[]) {
  return supabase.from('integrations').upsert({
    user_id: userId, provider: 'ics_feed',
    metadata: { feeds },
    expires_at: new Date(Date.now() + 3650 * 24 * 3600_000).toISOString(),
  }, { onConflict: 'user_id,provider' })
}

// ── GET : liste des flux (sans les événements) ────────────────────────────────
export async function GET() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const feeds = await readFeeds(supabase, user.id)
  return NextResponse.json({ feeds })
}

// ── POST : ajoute un flux (url présent) OU re-sync tous les flux (corps vide) ──
export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { url?: string; name?: string; color?: string }

  // Mode « ajout » — une URL est fournie
  if (body.url) {
    const url = normalizeFeedUrl(body.url)
    if (!url) return NextResponse.json({ error: 'URL invalide (attendu https:// ou webcal://)' }, { status: 400 })

    // Valide le flux en le récupérant une fois
    const fetched = await fetchIcsText(url)
    if (!fetched.ok) return NextResponse.json({ error: fetched.error ?? 'Flux illisible' }, { status: 400 })

    const feeds = await readFeeds(supabase, user.id)
    if (feeds.some(f => f.url === url)) return NextResponse.json({ error: 'Ce calendrier est déjà ajouté' }, { status: 409 })

    const name  = (body.name?.trim()) || extractCalName(fetched.text) || 'Calendrier abonné'
    const color = body.color || FEED_PALETTE[feeds.length % FEED_PALETTE.length]
    const feed: IcsFeed = { id: randomUUID(), url, name, color }

    const { error: upErr } = await writeFeeds(supabase, user.id, [...feeds, feed])
    if (upErr) return NextResponse.json({ error: `Sauvegarde impossible : ${upErr.message}` }, { status: 500 })

    const result = await runIcsFeedsSync(user.id, supabase)
    return NextResponse.json({
      added: result.added, removed: result.removed, updated: result.updated,
      feed, errors: result.errors,
      message: `${name} — ${result.added} événement(s) importé(s)`,
    })
  }

  // Mode « re-sync silencieux » — corps vide
  const feeds = await readFeeds(supabase, user.id)
  if (feeds.length === 0) return NextResponse.json({ skipped: true, reason: 'Aucun flux' })
  const result = await runIcsFeedsSync(user.id, supabase)
  return NextResponse.json({
    synced: result.added, updated: result.updated, removed: result.removed,
    feeds: result.feeds, errors: result.errors,
  })
}

// ── DELETE : retire un flux et supprime ses événements ────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const feeds = await readFeeds(supabase, user.id)
  const feed = feeds.find(f => f.id === id)
  if (!feed) return NextResponse.json({ error: 'Flux introuvable' }, { status: 404 })

  // Supprime les événements de ce flux
  await supabase.from('events').delete()
    .eq('user_id', user.id).eq('source', 'ics').like('external_id', `${id}:%`)

  await writeFeeds(supabase, user.id, feeds.filter(f => f.id !== id))
  return NextResponse.json({ ok: true })
}
