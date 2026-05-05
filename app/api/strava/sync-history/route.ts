// POST /api/strava/sync-history
// Importe TOUT l'historique Strava (depuis le début)

import { createClient } from '@/lib/supabase/server'
import { fetchAllActivities, refreshToken, stravaToRunPayload, fetchActivityStreams, parseStreamsToSegments } from '@/lib/strava'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Strava integration
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .single()

    if (!integrations) {
      return NextResponse.json({ error: 'Strava not connected' }, { status: 400 })
    }

    let { access_token, refresh_token: rt, expires_at } = integrations
    const now = Date.now() / 1000

    // Refresh token if expired
    if (expires_at < now) {
      const refreshed = await refreshToken(rt)
      access_token = refreshed.access_token
      rt = refreshed.refresh_token
      
      await supabase
        .from('integrations')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
        })
        .eq('id', integrations.id)
    }

    // ✅ FETCH ALL ACTIVITIES (no date limit)
    console.log('📥 Fetching ALL Strava activities...')
    const allActivities = await fetchAllActivities(access_token)
    console.log(`✅ Found ${allActivities.length} activities total`)

    // Insert running_activities
    const activitiesPayload = allActivities.map(a => ({
      ...stravaToRunPayload(a),
      user_id: user.id
    }))

    const { data: insertedActivities, error: insertError } = await supabase
      .from('running_activities')
      .upsert(activitiesPayload, { onConflict: 'user_id,source,external_id' })
      .select('id, external_id')

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`✅ Inserted/updated ${insertedActivities?.length || 0} activities`)

    // ✅ FETCH STREAMS for each activity (detailed km-by-km)
    console.log('📊 Fetching activity streams (detailed data)...')
    let segmentsInserted = 0
    const errors: string[] = []

    for (const activity of allActivities) {
      try {
        // Get the strava_id from our DB
        const dbActivity = insertedActivities?.find(a => a.external_id === String(activity.id))
        if (!dbActivity) continue

        // Fetch streams
        const streams = await fetchActivityStreams(access_token, activity.id)
        if (!streams.distance?.data) {
          console.warn(`⚠️ No streams for activity ${activity.id}`)
          continue
        }

        // Parse into segments
        const segments = parseStreamsToSegments(streams)
        if (segments.length === 0) continue

        // Prepare payload
        const segmentsPayload = segments.map(seg => ({
          user_id: user.id,
          activity_id: dbActivity.id,
          km_index: seg.km_index,
          km_start: seg.km_start,
          km_end: seg.km_end,
          time_seconds: seg.time_seconds,
          altitude_start: seg.altitude_start,
          altitude_end: seg.altitude_end,
          elevation_gain: seg.elevation_gain,
          pace_sec_per_km: seg.pace_sec_per_km,
          heart_rate_avg: seg.heart_rate_avg || null,
          heart_rate_min: seg.heart_rate_min || null,
          heart_rate_max: seg.heart_rate_max || null,
          cadence_avg: seg.cadence_avg || null,
          power_avg: seg.power_avg || null,
          temperature_avg: seg.temperature_avg || null,
          grade_avg: seg.grade_avg || null,
          lat_start: seg.lat_start || null,
          lon_start: seg.lon_start || null,
          lat_end: seg.lat_end || null,
          lon_end: seg.lon_end || null,
        }))

        // Insert segments
        const { error: segError, data: inserted } = await supabase
          .from('activity_segments')
          .upsert(segmentsPayload, { onConflict: 'activity_id,km_index' })
          .select('id')

        if (segError) {
          errors.push(`Activity ${activity.id}: ${segError.message}`)
        } else {
          segmentsInserted += inserted?.length || 0
        }

        // Rate limiting: Strava ~100 requests/15min
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        errors.push(`Activity ${activity.id}: ${String(e)}`)
      }
    }

    console.log(`✅ Inserted ${segmentsInserted} activity segments`)

    return NextResponse.json({
      success: true,
      activities_imported: allActivities.length,
      activities_upserted: insertedActivities?.length || 0,
      segments_imported: segmentsInserted,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error('Sync history error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
