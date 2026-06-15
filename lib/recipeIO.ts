// Export / import de recettes au format JSON NYSA (round-trip via DraftRecipe).

import type { DraftRecipe } from './recipeImport'

type AnyRecipe = {
  name: string
  description?: string
  servings?: number
  prep_time?: number
  cook_time?: number
  tags?: string[]
  image_url?: string
  ingredients?: unknown
  steps?: unknown
}

/** Normalise des recettes (DB ou fichier) en brouillons importables. */
export function recipesToDrafts(recipes: AnyRecipe[]): DraftRecipe[] {
  return recipes.map(r => ({
    name: r.name,
    description: r.description,
    servings: r.servings,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    tags: Array.isArray(r.tags) ? r.tags : [],
    image_url: r.image_url,
    ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((i: Record<string, unknown>) => ({
      name: String(i.name ?? ''),
      quantity: Number(i.quantity ?? 0),
      unit: i.unit ? String(i.unit) : undefined,
    })).filter(i => i.name),
    steps: Array.isArray(r.steps) ? r.steps.map(String)
      : typeof r.steps === 'string' ? r.steps.split('\n').map(s => s.trim()).filter(Boolean) : [],
  }))
}

/** Sérialise les recettes en JSON exportable. */
export function exportRecipesJson(recipes: AnyRecipe[]): string {
  return JSON.stringify({ app: 'NYSA', type: 'recipes', version: 1, recipes: recipesToDrafts(recipes) }, null, 2)
}

/** Parse un fichier JSON exporté (ou un simple tableau de recettes). */
export function parseRecipesJson(text: string): DraftRecipe[] {
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : null
  if (!arr) throw new Error('Format JSON non reconnu')
  return recipesToDrafts(arr as AnyRecipe[])
}
