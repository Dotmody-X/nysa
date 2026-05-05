// ============================================================
// NYSA — GPX Parser
// Parse un fichier GPX Strava/Garmin et retourne les données
// nécessaires pour l'affichage carte + graphiques.
// ============================================================

export interface GpxPoint {
  lat: number
  lon: number
  ele: number       // mètres
  time: Date | null
}

export interface GpxKmSplit {
  km: number           // numéro du km
  paceSecPerKm: number // secondes par km
  eleGain: number      // dénivelé positif sur ce km
  eleLoss: number      // dénivelé négatif
}

export interface GpxData {
  name: string
  points: GpxPoint[]
  // Calculs
  distanceKm: number
  durationSeconds: number | null
  elevationGainM: number
  elevationLossM: number
  elevationMax: number
  elevationMin: number
  avgPaceSecPerKm: number | null   // secondes par km
  maxPaceSecPerKm: number | null
  kmSplits: GpxKmSplit[]
  // Pour la carte
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
}

/** Distance Haversine entre deux points (km) */
function haversine(a: GpxPoint, b: GpxPoint): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.asin(Math.sqrt(x))
}

export function parseGpx(xmlText: string): GpxData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  // Nom de l'activité
  const nameEl = doc.querySelector('name')
  const name = nameEl?.textContent?.trim() ?? 'Activité'

  // Points de trace
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  const points: GpxPoint[] = trkpts.map(pt => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0')
    const lon = parseFloat(pt.getAttribute('lon') ?? '0')
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0')
    const timeStr = pt.querySelector('time')?.textContent
    const time = timeStr ? new Date(timeStr) : null
    return { lat, lon, ele, time }
  })

  if (points.length < 2) {
    return {
      name, points, distanceKm: 0, durationSeconds: null,
      elevationGainM: 0, elevationLossM: 0, elevationMax: 0, elevationMin: 0,
      avgPaceSecPerKm: null, maxPaceSecPerKm: null, kmSplits: [],
      bounds: { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 },
    }
  }

  // Distance totale
  let distanceKm = 0
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversine(points[i - 1], points[i])
  }

  // Durée
  const firstTime = points.find(p => p.time)?.time
  const lastTime  = [...points].reverse().find(p => p.time)?.time
  const durationSeconds = firstTime && lastTime
    ? Math.round((lastTime.getTime() - firstTime.getTime()) / 1000)
    : null

  // Élévation
  let elevationGainM = 0
  let elevationLossM = 0
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].ele - points[i - 1].ele
    if (diff > 0) elevationGainM += diff
    else elevationLossM += Math.abs(diff)
  }
  const eles = points.map(p => p.ele)
  const elevationMax = Math.max(...eles)
  const elevationMin = Math.min(...eles)

  // Allure moyenne
  const avgPaceSecPerKm =
    distanceKm > 0 && durationSeconds
      ? durationSeconds / distanceKm
      : null

  // Splits par km
  const kmSplits: GpxKmSplit[] = []
  let cumDist = 0
  let kmStart = 0
  let kmStartTime = points.find(p => p.time)?.time ?? null
  let kmStartEle = points[0].ele
  let kmNum = 1
  let splitGain = 0
  let splitLoss = 0
  let maxPaceSecPerKm: number | null = null

  for (let i = 1; i < points.length; i++) {
    const seg = haversine(points[i - 1], points[i])
    cumDist += seg
    const diff = points[i].ele - points[i - 1].ele
    if (diff > 0) splitGain += diff
    else splitLoss += Math.abs(diff)

    if (cumDist - kmStart >= 1) {
      const kmEnd = cumDist
      const endTime = points[i].time
      let pace: number | null = null
      if (kmStartTime && endTime) {
        pace = (endTime.getTime() - kmStartTime.getTime()) / 1000
        if (maxPaceSecPerKm === null || pace < maxPaceSecPerKm) maxPaceSecPerKm = pace
      }
      kmSplits.push({
        km: kmNum,
        paceSecPerKm: pace ?? avgPaceSecPerKm ?? 0,
        eleGain: splitGain,
        eleLoss: splitLoss,
      })
      kmStart = cumDist
      kmStartTime = points[i].time
      kmStartEle = points[i].ele
      splitGain = 0; splitLoss = 0
      kmNum++
    }
  }

  // Bounds pour la carte
  const lats = points.map(p => p.lat)
  const lons = points.map(p => p.lon)

  return {
    name, points, distanceKm, durationSeconds,
    elevationGainM, elevationLossM, elevationMax, elevationMin,
    avgPaceSecPerKm, maxPaceSecPerKm, kmSplits,
    bounds: {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLon: Math.min(...lons), maxLon: Math.max(...lons),
    },
  }
}
