/**
 * Open Prices API — prices.openfoodfacts.org
 * Community-driven real price database, updated by user scans.
 */

const BASE = 'https://prices.openfoodfacts.org/api/v1'

export interface OpenPrice {
  id: number
  product_code: string
  product_name: string | null
  price: number
  price_is_discounted: boolean
  price_without_discount: number | null
  currency: string
  location_osm_id: number | null
  location_osm_type: string | null
  location_name: string | null
  date: string
  proof_id: number | null
}

export interface OpenPricesResponse {
  items: OpenPrice[]
  total: number
  page: number
  size: number
  pages: number
}

export interface OpenProduct {
  code: string
  product_name: string | null
  image_url: string | null
  nutriscore_grade: string | null
  price_count: number
  last_price: OpenPrice | null
}

/** Fetch latest prices for a given product barcode */
export async function getPricesByBarcode(barcode: string, size = 5): Promise<OpenPrice[]> {
  try {
    const res = await fetch(`${BASE}/prices?product_code=${barcode}&order_by=-date&size=${size}`)
    if (!res.ok) return []
    const data: OpenPricesResponse = await res.json()
    return data.items ?? []
  } catch { return [] }
}

/** Fetch most recent discounted prices across all products */
export async function getRecentDiscountedPrices(size = 12): Promise<OpenPrice[]> {
  try {
    const res = await fetch(
      `${BASE}/prices?price_is_discounted=true&order_by=-date&size=${size}&currency=EUR`
    )
    if (!res.ok) return []
    const data: OpenPricesResponse = await res.json()
    return data.items ?? []
  } catch { return [] }
}

/** Fetch the lowest price recorded for a product */
export async function getLowestPrice(barcode: string): Promise<OpenPrice | null> {
  try {
    const res = await fetch(`${BASE}/prices?product_code=${barcode}&order_by=price&size=1`)
    if (!res.ok) return null
    const data: OpenPricesResponse = await res.json()
    return data.items?.[0] ?? null
  } catch { return null }
}

/**
 * Compute discount percentage between discounted price and original.
 * Returns null if data is missing.
 */
export function discountPct(price: OpenPrice): number | null {
  if (!price.price_is_discounted || !price.price_without_discount) return null
  const pct = ((price.price_without_discount - price.price) / price.price_without_discount) * 100
  return Math.round(pct)
}

/** Format a date string as "dd/MM" */
export function fmtPriceDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch { return dateStr }
}
