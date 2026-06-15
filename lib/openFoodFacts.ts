// Accès aux bases ouvertes de la galaxie Open Food Facts (même API « Product
// Opener », seul le domaine change). Permet de couvrir, au-delà de
// l'alimentaire, l'hygiène/cosmétique, l'alimentation animale et les produits
// ménagers/divers — pour enrichir l'autocomplétion par code-barres/recherche.

export type OFFSource = 'food' | 'beauty' | 'petfood' | 'products'

const SOURCES: Record<OFFSource, { base: string; label: string }> = {
  food:     { base: 'https://world.openfoodfacts.org',     label: 'Open Food Facts' },
  beauty:   { base: 'https://world.openbeautyfacts.org',   label: 'Open Beauty Facts' },
  petfood:  { base: 'https://world.openpetfoodfacts.org',  label: 'Open Pet Food Facts' },
  products: { base: 'https://world.openproductsfacts.org', label: 'Open Products Facts' },
}

export const offSourceLabel = (source: OFFSource = 'food') => SOURCES[source].label

// Rayon NYSA → base OFF la plus pertinente
export function sourceForCategory(category?: string): OFFSource {
  switch (category) {
    case 'Hygiène':   return 'beauty'
    case 'Animaux':   return 'petfood'
    case 'Entretien': return 'products'
    default:          return 'food'
  }
}

// Source OFF → rayon NYSA fixe (pour les bases non-alimentaires)
const SOURCE_CATEGORY: Partial<Record<OFFSource, string>> = {
  beauty: 'Hygiène',
  petfood: 'Animaux',
  products: 'Entretien',
}

const HEADERS = { 'User-Agent': 'NYSA/1.0 (nathangillet03@gmail.com)' }

const FIELDS = 'code,product_name,brands,image_front_small_url,nutriscore_grade,categories_tags,quantity,nutriments'

export type OFFNutrition = {
  kcal100: number | null
  prot100: number | null
  carbs100: number | null
  fat100: number | null
}

export type OFFProduct = {
  code: string
  product_name: string
  brands: string
  image_front_small_url: string | null
  nutriscore_grade: string | null
  categories_tags: string[]
  quantity: string | null
  nutrition: OFFNutrition
  source: OFFSource
}

type OFFRaw = {
  code: string
  product_name?: string
  brands?: string
  image_front_small_url?: string
  nutriscore_grade?: string
  categories_tags?: string[]
  quantity?: string
  nutriments?: Record<string, number | string | undefined>
}

type OFFSearchResult = { count: number; products: OFFRaw[] }

const num = (v: number | string | undefined): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return typeof n === 'number' && !Number.isNaN(n) ? n : null
}

function mapProduct(p: OFFRaw, source: OFFSource): OFFProduct {
  const n = p.nutriments ?? {}
  return {
    code: p.code,
    product_name: p.product_name ?? 'Produit inconnu',
    brands: p.brands ?? '',
    image_front_small_url: p.image_front_small_url ?? null,
    nutriscore_grade: p.nutriscore_grade ?? null,
    categories_tags: p.categories_tags ?? [],
    quantity: p.quantity ?? null,
    nutrition: {
      kcal100:  num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? Math.round((num(n['energy_100g']) as number) / 4.184) : null),
      prot100:  num(n['proteins_100g']),
      carbs100: num(n['carbohydrates_100g']),
      fat100:   num(n['fat_100g']),
    },
    source,
  }
}

export async function searchProducts(query: string, pageSize = 12, source: OFFSource = 'food'): Promise<OFFProduct[]> {
  if (!query.trim()) return []
  const { base } = SOURCES[source]
  const url = `${base}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=${FIELDS}&lc=fr&country=be`
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return []
    const data: OFFSearchResult = await res.json()
    return (data.products ?? []).filter(p => p.product_name).map(p => mapProduct(p, source))
  } catch {
    return []
  }
}

export async function getProductByBarcode(barcode: string, source: OFFSource = 'food'): Promise<OFFProduct | null> {
  const { base } = SOURCES[source]
  const url = `${base}/api/v2/product/${barcode}.json?fields=${FIELDS}`
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return mapProduct({ code: barcode, ...data.product }, source)
  } catch {
    return null
  }
}

/**
 * Scan multi-bases par code-barres : on interroge la base la plus probable
 * (selon `prefer`) puis les autres en repli, jusqu'à trouver le produit.
 */
export async function findProductAnywhere(barcode: string, prefer: OFFSource = 'food'): Promise<OFFProduct | null> {
  const order: OFFSource[] = [prefer, ...(Object.keys(SOURCES) as OFFSource[]).filter(s => s !== prefer)]
  for (const s of order) {
    const p = await getProductByBarcode(barcode, s)
    if (p) return p
  }
  return null
}

// Catégories alignées sur le catalogue local (rayons cohérents)
export function guessCategory(product: OFFProduct): string {
  // Bases non-alimentaires → rayon fixe
  const fixed = SOURCE_CATEGORY[product.source]
  if (fixed) return fixed

  const tags = product.categories_tags.join(' ').toLowerCase()
  if (tags.includes('beverage') || tags.includes('drinks') || tags.includes('boisson')) return 'Boissons'
  if (tags.includes('dairy') || tags.includes('lait') || tags.includes('fromage') || tags.includes('yogurt') || tags.includes('cheese')) return 'Produits frais'
  if (tags.includes('bread') || tags.includes('boulangerie') || tags.includes('cereal') || tags.includes('pasta') || tags.includes('rice')) return 'Féculents'
  if (tags.includes('meat') || tags.includes('viande') || tags.includes('charcuterie') || tags.includes('fish') || tags.includes('poisson') || tags.includes('seafood')) return 'Viandes & Poissons'
  if (tags.includes('vegetable') || tags.includes('legume') || tags.includes('fruit')) return 'Fruits & Légumes'
  if (tags.includes('spice') || tags.includes('épice') || tags.includes('herb') || tags.includes('condiment')) return 'Épices & Herbes'
  if (tags.includes('hygiene') || tags.includes('cosmetic') || tags.includes('beauty') || tags.includes('soap')) return 'Hygiène'
  if (tags.includes('cleaning') || tags.includes('detergent') || tags.includes('entretien') || tags.includes('household')) return 'Entretien'
  return 'Épicerie'
}
