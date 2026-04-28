// ============================================================
// NYSA — Apple Calendar Push (NYSA → iCloud)
// POST  /api/calendar/apple/push  — crée/met à jour un événement
// DELETE /api/calendar/apple/push — supprime un événement
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'

const CALDAV_BASE = 'https://caldav.icloud.com'

// ── iCal helpers ──────────────────────────────────────────────────────────────

function toICalDate(iso: string): string {
  // "2026-04-28T09:00:00.000Z" → "20260428T090000Z"
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15) + 'Z'
}

function foldLine(line: string): string {
  // RFC 5545 folding: max 75 octets per line
  if (line.length <= 75) return line
  const parts: string[] = []
  let i = 0
  parts.push(line.slice(0, 75)); i = 75
  while (i < line.length) { parts.push(' ' + line.slice(i, i + 74)); i += 74 }
  return parts.join('\r\n')
}

function buildICS(uid: string, title: string, start: string, end: string, description?: string | null, location?: string | null): string {
  const now = toICalDate(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NYSA//NYSA Calendar 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : null,
    location    ? `LOCATION:${location}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[]
  return lines.map(foldLine).join('\r\n')
}

// ── CalDAV helpers ────────────────────────────────────────────────────────────

async function caldavRequest(
  method: string,
  url: string,
  auth: string,
  body?: string,
  contentType = 'text/calendar; charset=utf-8',
): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = {
    Authorization: auth,
    'User-Agent':  'NYSA/1.0',
  }
  if (body) headers['Content-Type'] = contentType

  const res = await fetch(url, { method, headers, body, redirect: 'follow' })
  const text = await res.text().catch(() => '')
  return { status: res.status, text }
}

// Trouve l'URL du premier calendrier iCloud accessible en écriture
async function findPrimaryCalendarUrl(homeSet: string, auth: string): Promise<string | null> {
  const base = homeSet.startsWith('http') ? homeSet : `${CALDAV_BASE}${homeSet}`
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <D:current-user-privilege-set/>
  </D:prop>
</D:propfind>`

  const { status, text } = await caldavRequest('PROPFIND', base, auth, body, 'application/xml; charset=utf-8')
  if (status !== 207) return null

  // Extrait les hrefs qui ont <C:calendar/> dans leur resourcetype
  const responseBlocks = text.split(/<[^>]*:response[^>]*>/).slice(1)
  const calendarUrls: string[] = []

  for (const block of responseBlocks) {
    const hasCalendar  = /<[^>]*:calendar[^/][^>]*\/?>/.test(block)
    const hrefMatch    = block.match(/<[^>]*:href[^>]*>([\s\S]*?)<\/[^>]*:href>/)
    const writePriv    = /write|all/i.test(block)
    if (hasCalendar && hrefMatch) {
      const href = hrefMatch[1].trim()
      if (!href.includes('inbox') && !href.includes('outbox') && !href.includes('notification')) {
        calendarUrls.push(href)
        if (writePriv) break // priorité au premier calendrier avec droits d'écriture
      }
    }
  }

  if (calendarUrls.length === 0) return null
  const url = calendarUrls[0]
  return url.startsWith('http') ? url : `${CALDAV_BASE}${url}`
}

// ── Supabase client ───────────────────────────────────────────────────────────

async function getSupabaseAndUser() {
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

async function getAppleIntegration(supabase: any, userId: string) {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', userId)
    .eq('provider', 'apple_calendar')
    .single()
  return data
}

// ── POST — créer ou mettre à jour un événement dans iCloud ────────────────────

export async function POST(req: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { event } = body as { event?: { id: string; title: string; start_at: string; end_at: string; description?: string | null; location?: string | null; external_id?: string | null } }
  if (!event) return NextResponse.json({ error: 'Événement manquant' }, { status: 400 })

  // Récupère l'intégration Apple
  const integration = await getAppleIntegration(supabase, user.id)
  if (!integration) return NextResponse.json({ skipped: true, reason: 'Apple Calendar non connecté' })

  const auth    = 'Basic ' + Buffer.from(`${integration.metadata.email}:${integration.access_token}`).toString('base64')
  const homeSet = integration.metadata.homeSet as string

  // Trouve le calendrier principal
  let calUrl = integration.metadata.primaryCalendarUrl as string | undefined
  if (!calUrl) {
    calUrl = await findPrimaryCalendarUrl(homeSet, auth) ?? undefined
    if (calUrl) {
      // Mémorise pour les prochains appels
      await supabase.from('integrations').update({
        metadata: { ...integration.metadata, primaryCalendarUrl: calUrl },
      }).eq('user_id', user.id).eq('provider', 'apple_calendar')
    }
  }
  if (!calUrl) return NextResponse.json({ error: 'Impossible de trouver le calendrier iCloud' }, { status: 500 })

  // UID stable basé sur l'ID de l'événement NYSA
  const uid        = event.external_id ?? `nysa-${event.id}@nysa.be`
  const icsContent = buildICS(uid, event.title, event.start_at, event.end_at, event.description, event.location)
  const eventUrl   = `${calUrl.replace(/\/?$/, '/')}${uid.replace(/@.*$/, '')}.ics`

  // PUT vers CalDAV
  const { status } = await caldavRequest('PUT', eventUrl, auth, icsContent)

  if (status === 201 || status === 204 || status === 200) {
    // Mise à jour du external_id et source dans Supabase
    await supabase.from('events').update({
      external_id: uid,
      source:      'synced', // indique sync bidirectionnel
    }).eq('id', event.id)

    return NextResponse.json({ success: true, caldavUrl: eventUrl })
  }

  return NextResponse.json({ error: `CalDAV PUT failed: ${status}` }, { status: 500 })
}

// ── DELETE — supprimer un événement de iCloud ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { externalId } = body as { externalId?: string }
  if (!externalId) return NextResponse.json({ skipped: true })

  // N'efface que les événements créés par NYSA (pas ceux syncés depuis Apple)
  if (!externalId.startsWith('nysa-')) return NextResponse.json({ skipped: true, reason: 'Événement Apple — ne pas supprimer depuis NYSA' })

  const integration = await getAppleIntegration(supabase, user.id)
  if (!integration) return NextResponse.json({ skipped: true })

  const auth    = 'Basic ' + Buffer.from(`${integration.metadata.email}:${integration.access_token}`).toString('base64')
  const calUrl  = integration.metadata.primaryCalendarUrl as string | undefined
  if (!calUrl) return NextResponse.json({ skipped: true })

  const fileName = externalId.replace(/@.*$/, '')
  const eventUrl = `${calUrl.replace(/\/?$/, '/')}${fileName}.ics`
  const { status } = await caldavRequest('DELETE', eventUrl, auth)

  return NextResponse.json({ success: status === 204 || status === 200 || status === 404 })
}
