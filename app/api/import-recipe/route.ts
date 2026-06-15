// Import d'une recette depuis l'URL de n'importe quel site (lecture du
// balisage schema.org JSON-LD « Recipe »). Côté serveur pour éviter le CORS.
//   GET /api/import-recipe?url=https://...
// Renvoie un DraftRecipe (cf. lib/recipeImport) ou { error }.

import { NextResponse } from 'next/server'

type Draft = {
  name: string
  description?: string
  servings?: number
  prep_time?: number
  cook_time?: number
  tags?: string[]
  image_url?: string
  ingredients: { name: string; quantity: number; unit?: string }[]
  steps: string[]
}

// Durée ISO 8601 "PT1H30M" → minutes
function isoToMinutes(v?: string): number {
  if (!v || typeof v !== 'string') return 0
  const m = v.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0')
}

// Ligne d'ingrédient FR "200 g de farine" / "2 œufs" / "1 c. à soupe d'huile"
function parseIngredientLine(raw: string): { name: string; quantity: number; unit?: string } {
  const s = raw.replace(/\s+/g, ' ').trim()
  const m = s.match(/^([\d]+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)?\s*([a-zA-Zàâéèêîïôûç.’'\s]*?)?\s*(?:de\s|d['’]\s?)?(.*)$/)
  let qty = 1
  let unit: string | undefined
  let name = s
  if (m) {
    if (m[1]) {
      const f = m[1].match(/(\d+)\s*\/\s*(\d+)/)
      qty = f ? parseInt(f[1]) / parseInt(f[2]) : parseFloat(m[1].replace(',', '.'))
    }
    const u = (m[2] || '').toLowerCase().trim()
    name = (m[3] || s).trim()
    if (/^(kg|kilo)/.test(u)) { unit = 'g'; qty *= 1000 }
    else if (/^gr?(ammes?)?$/.test(u) || u === 'g') unit = 'g'
    else if (/^(ml|millilit)/.test(u)) unit = 'ml'
    else if (/^cl/.test(u)) { unit = 'ml'; qty *= 10 }
    else if (/^(l|litres?)$/.test(u)) { unit = 'ml'; qty *= 1000 }
    else if (/soupe|c\.?\s?à\.?\s?s|càs|cas/.test(u)) unit = 'cuillère'
    else if (/café|c\.?\s?à\.?\s?c|càc|cac/.test(u)) unit = 'cup'
    else if (/pinc[ée]e/.test(u)) unit = 'cup'
    else if (/gousse|tranche|sachet|pi[èe]ce|unit[ée]|boite|boîte/.test(u)) unit = 'pc'
    else if (u) { name = `${m[2]!.trim()} ${name}`.trim() } // mot non-unité → fait partie du nom
  }
  if (!name) name = s
  qty = Math.round((qty || 1) * 100) / 100
  return { name, quantity: qty, unit }
}

function stepsFrom(instructions: unknown): string[] {
  if (!instructions) return []
  if (typeof instructions === 'string') {
    return instructions.split(/\r?\n+|(?<=\.)\s+(?=[A-ZÀ-Ÿ])/).map(s => s.trim()).filter(s => s.length > 3)
  }
  if (Array.isArray(instructions)) {
    const out: string[] = []
    for (const it of instructions) {
      if (typeof it === 'string') out.push(it.trim())
      else if (it && typeof it === 'object') {
        const o = it as Record<string, unknown>
        if (o['@type'] === 'HowToSection' && Array.isArray(o.itemListElement)) out.push(...stepsFrom(o.itemListElement))
        else if (typeof o.text === 'string') out.push(o.text.trim())
        else if (typeof o.name === 'string') out.push(o.name.trim())
      }
    }
    return out.filter(s => s.length > 3)
  }
  return []
}

const asArray = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
const firstString = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? firstString(v[0]) : (v && typeof v === 'object' && 'url' in v ? String((v as { url: unknown }).url) : undefined)

// Cherche récursivement un nœud @type Recipe dans le JSON-LD
function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const n of node) { const r = findRecipeNode(n); if (r) return r }
    return null
  }
  const o = node as Record<string, unknown>
  const t = o['@type']
  const types = Array.isArray(t) ? t : [t]
  if (types.some(x => typeof x === 'string' && x.toLowerCase() === 'recipe')) return o
  if (o['@graph']) return findRecipeNode(o['@graph'])
  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }
  let html: string
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NYSA/1.0)' } })
    if (!res.ok) return NextResponse.json({ error: `Page inaccessible (${res.status})` }, { status: 502 })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'Impossible de récupérer la page' }, { status: 502 })
  }

  // Extrait tous les blocs JSON-LD
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  let recipe: Record<string, unknown> | null = null
  for (const b of blocks) {
    try {
      const parsed = JSON.parse(b[1].trim())
      recipe = findRecipeNode(parsed)
      if (recipe) break
    } catch { /* bloc invalide, on continue */ }
  }
  if (!recipe) return NextResponse.json({ error: 'Aucune recette trouvée sur cette page' }, { status: 404 })

  const yieldRaw = recipe.recipeYield
  const servings = parseInt(firstString(yieldRaw)?.match(/\d+/)?.[0] ?? '') || 2
  const draft: Draft = {
    name: firstString(recipe.name) || 'Recette importée',
    description: typeof recipe.description === 'string' ? recipe.description.slice(0, 300) : undefined,
    servings,
    prep_time: isoToMinutes(firstString(recipe.prepTime)),
    cook_time: isoToMinutes(firstString(recipe.cookTime)),
    tags: asArray(recipe.recipeCategory as string | string[] | undefined).concat(asArray(recipe.recipeCuisine as string | string[] | undefined)).filter(Boolean),
    image_url: firstString(recipe.image),
    ingredients: asArray(recipe.recipeIngredient as string | string[] | undefined).map(parseIngredientLine),
    steps: stepsFrom(recipe.recipeInstructions),
  }
  if (draft.ingredients.length === 0 && draft.steps.length === 0) {
    return NextResponse.json({ error: 'Recette trouvée mais vide' }, { status: 422 })
  }
  return NextResponse.json({ draft })
}
