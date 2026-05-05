// ============================================================
// NYSA — Strava API Client
// ============================================================

const STRAVA_BASE = 'https://www.strava.com/api/v3'

// ── Types Strava ────────────────────────────────────────────

export interface StravaTokens {
  access_token:  string
  refresh_token: string
  expires_at:    number   // timestamp Unix
  athlete_id:    number
}

export interface StravaActivity {
  id:                    number
  name:                  string
  type:                  string
  sport_type:            string
  distance:              number   // mètres
  moving_time:           number   // secondes
  elapsed_time:          number   // secondes
  total_elevation_gain:  number   // mètres
  start_date:            string   // ISO
  average_speed:         number   // m/s
  max_speed:             number
  average_heartrate?:    number
  max_heartrate?:        number
  calories?:             number
  map: {
    summary_polyline: string
  }
}

// ── OAuth — échange code → tokens ───────────────────────────

export async function exchangeCode(code: string): Promise<StravaTokens> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  const json = await res.json()
  return {
    access_token:  json.access_token,
    refresh_token: json.refresh_token,
    expires_at:    json.expires_at,
    athlete_id:    json.athlete?.id ?? json.athlete_id,
  }
}

// ── OAuth — refresh token expiré ────────────────────────────

export async function refreshToken(currentRefreshToken: string): Promise<StravaTokens> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: currentRefreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  const json = await res.json()
  return {
    access_token:  json.access_token,
    refresh_token: json.refresh_token,
    expires_at:    json.expires_at,
    athlete_id:    json.athlete_id ?? 0,
  }
}

// ── Fetch activités ─────────────────────────────────────────

export async function fetchActivities(
  accessToken: string,
  opts: { page?: number; perPage?: number; after?: number } = {}
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page:     String(opts.page     ?? 1),
    per_page: String(opts.perPage  ?? 50),
  })
  if (opts.after) params.set('after', String(opts.after))

  const res = await fetch(`${STRAVA_BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
  return res.json()
}

// ── Fetch ALL activités (paginate) ─────────────────────────

export async function fetchAllActivities(
  accessToken: string,
  after?: number
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = []
  let page = 1
  const perPage = 200 // Max allowed

  while (true) {
    const activities = await fetchActivities(accessToken, { page, perPage, after })
    if (activities.length === 0) break
    allActivities.push(...activities)
    page++
  }

  return allActivities
}

// ── Strava Streams (détails par km) ────────────────────────

export interface StravaStream {
  type: string
  data: number[]
  series_type: string
  original_size: number
  resolution: string
}

export async function fetchActivityStreams(
  accessToken: string,
  activityId: number
): Promise<Record<string, StravaStream>> {
  // Fetch ALL available streams without filtering
  const params = new URLSearchParams({
    key_by_type: 'true',
  })
  // Get all possible streams
  const allKeys = ['time', 'distance', 'latlng', 'altitude', 'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth']
  allKeys.forEach(k => params.append('keys', k))

  try {
    const res = await fetch(`${STRAVA_BASE}/activities/${activityId}/streams?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    if (!res.ok) {
      console.warn(`⚠️ Streams unavailable for activity ${activityId}: ${res.status}`)
      return {}
    }
    
    const data = await res.json()
    console.log(`✅ Streams loaded for activity ${activityId}:`, Object.keys(data))
    return data
  } catch (e) {
    console.error(`❌ Failed to fetch streams for ${activityId}:`, e)
    return {}
  }
}

// ── Parse streams → segments (par km) ──────────────────────

export interface ActivitySegment {
  km_index: number         // 0, 1, 2, etc.
  km_start: number        // distance in km at start of segment
  km_end: number          // distance in km at end of segment
  time_seconds: number    // elapsed time for this km
  altitude_start: number
  altitude_end: number
  elevation_gain: number
  pace_sec_per_km: number // time spent on this km
  heart_rate_avg: number
  heart_rate_min: number
  heart_rate_max: number
  cadence_avg: number
  power_avg: number
  temperature_avg: number
  grade_avg: number
  lat_start: number
  lon_start: number
  lat_end: number
  lon_end: number
}

export function parseStreamsToSegments(streams: Record<string, StravaStream>): ActivitySegment[] {
  if (!streams.distance?.data || !streams.time?.data) return []

  const distances = streams.distance.data as number[]
  const times = streams.time.data as number[]
  const altitudes = (streams.altitude?.data || []) as number[]
  const heartrates = (streams.heartrate?.data || []) as number[]
  const cadences = (streams.cadence?.data || []) as number[]
  const watts = (streams.watts?.data || []) as number[]
  const temps = (streams.temp?.data || []) as number[]
  const grades = (streams.grade_smooth?.data || []) as number[]
  const latlngsRaw = streams.latlng?.data || []
  const latlngs = (Array.isArray(latlngsRaw) ? latlngsRaw : []) as unknown as [number, number][]

  const segments: ActivitySegment[] = []
  let currentKm = 1  // START AT KM 1, not 0!
  let lastIndex = 0

  for (let i = 1; i < distances.length; i++) {
    const distKm = distances[i] / 1000
    const prevDistKm = distances[lastIndex] / 1000

    // Chaque km complété (starting from km 1)
    if (Math.floor(distKm) >= currentKm) {
      const nextKmIndex = distances.findIndex((d, idx) => idx > lastIndex && d / 1000 >= currentKm + 1)
      const endIndex = nextKmIndex >= 0 ? nextKmIndex : i

      // Extraire les données pour ce km
      const kmHeartrates = heartrates.slice(lastIndex, endIndex).filter(h => h > 0)
      const kmCadences = cadences.slice(lastIndex, endIndex).filter(c => c > 0)
      const kmWatts = watts.slice(lastIndex, endIndex).filter(w => w > 0)
      const kmTemps = temps.slice(lastIndex, endIndex)
      const kmGrades = grades.slice(lastIndex, endIndex)
      const kmAltitudes = altitudes.slice(lastIndex, endIndex)

      const timeForKm = times[endIndex] - times[lastIndex]
      const altStart = altitudes[lastIndex] || 0
      const altEnd = altitudes[endIndex - 1] || altStart

      const latStartVal = latlngs && latlngs.length > lastIndex ? (latlngs[lastIndex] as any)?.[0] || 0 : 0
      const lonStartVal = latlngs && latlngs.length > lastIndex ? (latlngs[lastIndex] as any)?.[1] || 0 : 0
      const latEndVal = latlngs && latlngs.length > endIndex - 1 ? (latlngs[endIndex - 1] as any)?.[0] || 0 : 0
      const lonEndVal = latlngs && latlngs.length > endIndex - 1 ? (latlngs[endIndex - 1] as any)?.[1] || 0 : 0

      segments.push({
        km_index: currentKm,
        km_start: prevDistKm,
        km_end: distances[endIndex] / 1000,
        time_seconds: timeForKm,
        altitude_start: Math.round(altStart),
        altitude_end: Math.round(altEnd),
        elevation_gain: Math.max(0, altEnd - altStart),
        pace_sec_per_km: timeForKm > 0 ? timeForKm : 0,
        heart_rate_avg: kmHeartrates.length > 0 ? Math.round(kmHeartrates.reduce((a, b) => a + b) / kmHeartrates.length) : 0,
        heart_rate_min: kmHeartrates.length > 0 ? Math.min(...kmHeartrates) : 0,
        heart_rate_max: kmHeartrates.length > 0 ? Math.max(...kmHeartrates) : 0,
        cadence_avg: kmCadences.length > 0 ? Math.round(kmCadences.reduce((a, b) => a + b) / kmCadences.length) : 0,
        power_avg: kmWatts.length > 0 ? Math.round(kmWatts.reduce((a, b) => a + b) / kmWatts.length) : 0,
        temperature_avg: kmTemps.length > 0 ? Math.round(kmTemps.reduce((a, b) => a + b) / kmTemps.length) : 0,
        grade_avg: kmGrades.length > 0 ? kmGrades.reduce((a, b) => a + b) / kmGrades.length : 0,
        lat_start: latStartVal,
        lon_start: lonStartVal,
        lat_end: latEndVal,
        lon_end: lonEndVal,
      })

      currentKm++
      lastIndex = endIndex
    }
  }

  return segments
}

// ── Decode Google Encoded Polyline → [{lat, lon}] ──────────
// Strava renvoie summary_polyline encodé (algo Google Polyline)

export interface LatLon { lat: number; lon: number }

export function decodePolyline(encoded: string): LatLon[] {
  const coords: LatLon[] = []
  let index = 0; let lat = 0; let lon = 0

  while (index < encoded.length) {
    let b: number; let shift = 0; let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : result >> 1

    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lon += (result & 1) ? ~(result >> 1) : result >> 1

    coords.push({ lat: lat / 1e5, lon: lon / 1e5 })
  }
  return coords
}

// ── Helpers conversion ──────────────────────────────────────

/** m/s → secondes par km */
export function speedToPace(mps: number): number {
  if (!mps || mps === 0) return 0
  return 1000 / mps
}

/** Convertit une StravaActivity en payload Supabase running_activities */
export function stravaToRunPayload(a: StravaActivity) {
  const coords = a.map?.summary_polyline
    ? decodePolyline(a.map.summary_polyline)
    : []

  return {
    source:           'strava' as const,
    external_id:      String(a.id),
    title:            a.name,
    date:             a.start_date.slice(0, 10),
    distance_km:      parseFloat((a.distance / 1000).toFixed(2)),
    duration_seconds: a.moving_time,
    pace_sec_per_km:  a.average_speed > 0 ? Math.round(speedToPace(a.average_speed)) : undefined,
    elevation_m:      Math.round(a.total_elevation_gain),
    heart_rate_avg:   a.average_heartrate   ? Math.round(a.average_heartrate) : undefined,
    heart_rate_max:   a.max_heartrate       ? Math.round(a.max_heartrate)     : undefined,
    calories:         a.calories,
    raw_data: coords.length > 0
      ? {
          strava_id:  a.id,
          sport_type: a.sport_type,
          polyline: coords.map(c => ({ lat: c.lat, lon: c.lon, ele: 0 })),
        }
      : { strava_id: a.id, sport_type: a.sport_type },
  }
}
