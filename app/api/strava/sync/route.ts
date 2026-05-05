// ============================================================
// NYSA — Strava Sync
// POST /api/strava/sync
// Récupère les dernières activités Strava et les insère en base
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { fetchActivities, refreshToken, stravaToRunPayload } from '@/lib/strava'

export async function POST(req: NextRequest) {
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

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Récupère les tokens stockés
  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Strava non connecté' }, { status: 400 })
  }

  // Refresh si token expiré
  let accessToken = integration.access_token
  const expiresAt = new Date(integration.expires_at).getTime()
  if (Date.now() >= expiresAt - 60_000) {
    try {
      const newTokens = await refreshToken(integration.refresh_token)
      accessToken = newTokens.access_token
      await supabase
        .from('integrations')
        .update({
          access_token:  newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at:    new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'strava')
    } catch (err) {
      return NextResponse.json({ error: 'Impossible de rafraîchir le token Strava' }, { status: 500 })
    }
  }

  // Récupère les activités (courses seulement, depuis la dernière sync)
  const { data: lastActivity } = await supabase
    .from('running_activities')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('source', 'strava')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const after = lastActivity
    ? Math.floor(new Date(lastActivity.created_at).getTime() / 1000)
    : undefined

  let activities
  try {
    activities = await fetchActivities(accessToken, { perPage: 50, after })
  } catch (err) {
    return NextResponse.json({ error: 'Erreur Strava API' }, { status: 500 })
  }

  // Filtre : Running seulement
  const runs = activities.filter(a =>
    ['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type ?? a.type)
  )

  if (runs.length === 0) {
    return NextResponse.json({ synced: 0, message: 'Aucune nouvelle course' })
  }

  // Récupère les external_ids déjà en base pour éviter doublons
  const externalIds = runs.map(r => String(r.id))
  const { data: existing } = await supabase
    .from('running_activities')
    .select('external_id')
    .eq('user_id', user.id)
    .in('external_id', externalIds)

  const existingSet = new Set((existing ?? []).map(e => e.external_id))
  const toInsert = runs
    .filter(r => !existingSet.has(String(r.id)))
    .map(r => ({ ...stravaToRunPayload(r), user_id: user.id }))

  if (toInsert.length === 0) {
    return NextResponse.json({ synced: 0, message: 'Tout est déjà synchronisé' })
  }

  const { error: insertError } = await supabase
    .from('running_activities')
    .insert(toInsert)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    synced:  toInsert.length,
    message: `${toInsert.length} course${toInsert.length > 1 ? 's' : ''} importée${toInsert.length > 1 ? 's' : ''}`,
  })
}
