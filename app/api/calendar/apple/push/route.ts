// ============================================================
// NYSA — Apple Calendar Push (NYSA → iCloud)
// POST   /api/calendar/apple/push  — crée/met à jour
// DELETE /api/calendar/apple/push  — supprime
// ============================================================

import { NextRequest, NextResponse }                   from 'next/server'
import { createServerClient }                          from '@supabase/ssr'
import { cookies }                                     from 'next/headers'
import { buildICS, caldavRequest, findPrimaryCalendarUrl, makeAuth, CALDAV_BASE } from '@/lib/caldav'

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

async function getIntegration(supabase: any, userId: string) {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('user_id', userId)
    .eq('provider', 'apple_calendar')
    .single()
  return data
}

async function resolveCalendarUrl(integration: any, supabase: any, userId: string, auth: string): Promise<string | null> {
  let calUrl: string | undefined = integration.metadata?.primaryCalendarUrl
  if (!calUrl) {
    calUrl = await findPrimaryCalendarUrl(integration.metadata.homeSet, auth) ?? undefined
    if (calUrl) {
      await supabase.from('integrations').update({
        metadata: { ...integration.metadata, primaryCalendarUrl: calUrl },
      }).eq('user_id', userId).eq('provider', 'apple_calendar')
    }
  }
  return calUrl ?? null
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { supabase, user } = await getCtx()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body  = await req.json().catch(() => ({}))
  const event = body.event as { id: string; title: string; start_at: string; end_at: string; description?: string | null; location?: string | null; external_id?: string | null } | undefined
  if (!event) return NextResponse.json({ error: 'Événement manquant' }, { status: 400 })

  const integ = await getIntegration(supabase, user.id)
  if (!integ)  return NextResponse.json({ skipped: true, reason: 'Apple Calendar non connecté' })

  const auth   = makeAuth(integ.metadata.email, integ.access_token)
  const calUrl = await resolveCalendarUrl(integ, supabase, user.id, auth)
  if (!calUrl) return NextResponse.json({ error: 'Calendrier iCloud introuvable' }, { status: 500 })

  const uid      = event.external_id ?? `nysa-${event.id}@nysa.be`
  const ics      = buildICS(uid, event.title, event.start_at, event.end_at, event.description, event.location)
  const eventUrl = `${calUrl.replace(/\/?$/, '/')}${uid.replace(/@.*$/, '')}.ics`

  const { status } = await caldavRequest('PUT', eventUrl, auth, ics, { 'Content-Type': 'text/calendar; charset=utf-8' })

  if ([200, 201, 204].includes(status)) {
    await supabase.from('events').update({ external_id: uid, source: 'synced' }).eq('id', event.id)
    return NextResponse.json({ success: true, caldavUrl: eventUrl })
  }

  return NextResponse.json({ error: `CalDAV PUT: ${status}` }, { status: 500 })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getCtx()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { externalId } = await req.json().catch(() => ({} as { externalId?: string }))
  if (!externalId || !externalId.startsWith('nysa-')) {
    return NextResponse.json({ skipped: true })
  }

  const integ = await getIntegration(supabase, user.id)
  if (!integ) return NextResponse.json({ skipped: true })

  const auth   = makeAuth(integ.metadata.email, integ.access_token)
  const calUrl = integ.metadata?.primaryCalendarUrl as string | undefined
  if (!calUrl) return NextResponse.json({ skipped: true })

  const eventUrl = `${calUrl.replace(/\/?$/, '/')}${externalId.replace(/@.*$/, '')}.ics`
  const { status } = await caldavRequest('DELETE', eventUrl, auth)

  return NextResponse.json({ success: [200, 204, 404].includes(status) })
}
