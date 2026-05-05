import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy for Overpass API (OpenStreetMap store finder).
 * GET /api/stores?lat=50.85&lon=4.35&radius=5000&brand=Colruyt
 *
 * Returns array of OSM nodes (supermarkets near the given coordinates).
 */
export async function GET(req: NextRequest) {
  const lat    = req.nextUrl.searchParams.get('lat')
  const lon    = req.nextUrl.searchParams.get('lon')
  const radius = req.nextUrl.searchParams.get('radius') ?? '5000'
  const brand  = req.nextUrl.searchParams.get('brand')  // optional filter

  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })

  const brandFilter = brand ? `["brand"="${brand}"]` : ''
  // Query nodes AND ways for supermarkets (some large stores are mapped as areas)
  const query = `
[out:json][timeout:15];
(
  node["shop"="supermarket"]${brandFilter}(around:${radius},${lat},${lon});
  way["shop"="supermarket"]${brandFilter}(around:${radius},${lat},${lon});
);
out center body;
`.trim()

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return NextResponse.json({ error: 'Overpass error' }, { status: 502 })
    const data = await res.json()

    // Normalize: ways have a 'center' field, nodes have lat/lon directly
    const elements = (data.elements ?? []).map((el: any) => ({
      id:      el.id,
      lat:     el.lat ?? el.center?.lat,
      lon:     el.lon ?? el.center?.lon,
      name:    el.tags?.name ?? el.tags?.brand ?? 'Supermarché',
      brand:   el.tags?.brand ?? el.tags?.name ?? '',
      address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']].filter(Boolean).join(' '),
      city:    el.tags?.['addr:city'] ?? '',
    }))

    return NextResponse.json(elements)
  } catch (err) {
    return NextResponse.json({ error: 'Overpass failed' }, { status: 500 })
  }
}
