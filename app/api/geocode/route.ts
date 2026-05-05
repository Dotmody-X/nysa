import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy for Nominatim (OpenStreetMap geocoding).
 * Needed server-side to attach proper User-Agent header per Nominatim ToS.
 * GET /api/geocode?q=Brussels
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing q param' }, { status: 400 })

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NYSA-App/1.0 (contact@nysa.be)',
        'Accept-Language': 'fr',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return NextResponse.json({ error: 'Nominatim error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
