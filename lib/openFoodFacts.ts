const BASE = 'https://world.openfoodfacts.org'
const HEADERS = { 'User-Agent': 'NYSA/1.0 (nathangillet03@gmail.com)' }

export type OFFProduct = {
  code: string
  product_name: string
  brands: string
  image_front_small_url: string | null
  nutriscore_grade: string | null
  categories_tags: string[]
  quantity: string | null
}

type OFFSearchResult = {
  count: number
  products: Array<{
    code: string
    product_name?: string
    brands?: string
    image_front_small_url?: string
    nutriscore_grade?: string
    categories_tags?: string[]
    quantity?: string
  }>
}

function mapProduct(p: OFFSearchResult['products'][0]): OFFProduct {
  return {
    code: p.code,
    product_name: p.product_name ?? 'Produit inconnu',
    brands: p.brands ?? '',
    image_front_small_url: p.image_front_small_url ?? null,
    nutriscore_grade: p.nutriscore_grade ?? null,
    categories_tags: p.categories_tags ?? [],
    quantity: p.quantity ?? null,
  }
}

export async function searchProducts(query: string, pageSize = 12): Promise<OFFProduct[]> {
  if (!query.trim()) return []
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=code,product_name,brands,image_front_small_url,nutriscore_grade,categories_tags,quantity&lc=fr&country=be`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return []
  const data: OFFSearchResult = await res.json()
  return (data.products ?? []).filter(p => p.product_name).map(mapProduct)
}

export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  const url = `${BASE}/api/v2/product/${barcode}.json?fields=code,product_name,brands,image_front_small_url,nutriscore_grade,categories_tags,quantity`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  return mapProduct({ code: barcode, ...data.product })
}

export function guessCategory(product: OFFProduct): string {
  const tags = product.categories_tags.join(' ').toLowerCase()
  if (tags.includes('beverages') || tags.includes('drinks') || tags.includes('boissons')) return 'Boissons'
  if (tags.includes('dairy') || tags.includes('laits') || tags.includes('fromages')) return 'Produits laitiers'
  if (tags.includes('breads') || tags.includes('boulangerie') || tags.includes('cereals')) return 'Boulangerie / Céréales'
  if (tags.includes('meats') || tags.includes('viandes') || tags.includes('charcuterie')) return 'Viandes'
  if (tags.includes('vegetables') || tags.includes('legumes') || tags.includes('fruits')) return 'Fruits & Légumes'
  if (tags.includes('frozen') || tags.includes('surgeles')) return 'Surgelés'
  if (tags.includes('snacks') || tags.includes('biscuits') || tags.includes('confiseries')) return 'Snacks / Confiseries'
  if (tags.includes('hygiene') || tags.includes('cosmetiques') || tags.includes('beauty')) return 'Hygiène / Beauté'
  return 'Épicerie'
}
