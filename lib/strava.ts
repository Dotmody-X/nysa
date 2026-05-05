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
