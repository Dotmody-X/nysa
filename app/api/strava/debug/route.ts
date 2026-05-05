// GET /api/strava/debug?activityId=123
// Debug endpoint to see raw Strava streams data

import { createClient } from '@/lib/supabase/server'
import { fetchActivityStreams, refreshToken } from '@/lib/strava'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get activity ID from query
    const activityId = req.nextUrl.searchParams.get('activityId')
    if (!activityId) {
      return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })
    }

    // Get Strava token
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .single()

    if (!integrations) {
      return NextResponse.json({ error: 'Strava not connected' }, { status: 400 })
    }

    let { access_token } = integrations
    const now = Date.now() / 1000

    // Refresh if needed
    if (integrations.expires_at < now) {
      const refreshed = await refreshToken(integrations.refresh_token)
      access_token = refreshed.access_token
    }

    // Fetch streams
    console.log(`📥 Fetching streams for activity ${activityId}...`)
    const streams = await fetchActivityStreams(access_token, parseInt(activityId))

    // Analyze what we got
    const analysis = {
      activity_id: activityId,
      streams_found: Object.keys(streams).length,
      stream_names: Object.keys(streams),
      data_points: {} as Record<string, { count: number; first3: number[]; hasMissing: boolean }>,
    }

    for (const [key, stream] of Object.entries(streams)) {
      const data = stream.data as number[]
      analysis.data_points[key] = {
        count: data.length,
        first3: data.slice(0, 3),
        hasMissing: data.some(v => v === null || v === undefined || v === 0),
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      raw_streams: streams,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
