// Import de recettes externes (pack FR bundlé, TheMealDB…) vers le modèle NYSA.
// Chaque ingrédient est enrichi avec ses macros POUR 100 g via le catalogue
// (curé + CIQUAL), l'unité par défaut et le poids d'une pièce — pour que le
// calcul kcal/protéines/glucides/lipides fonctionne dès l'import.

import { catalogNutrition, catalogPieceGrams, defaultUnitFor } from './catalogue'

export type DraftIngredient = { name: string; quantity: number; unit?: string }

export type DraftRecipe = {
  name: string
  description?: string
  servings?: number
  prep_time?: number
  cook_time?: number
  tags?: string[]
  image_url?: string
  ingredients: DraftIngredient[]
  steps: string[]
}

export type EnrichedIngredient = {
  id: string
  name: string
  quantity: number
  unit: string
  grams_per_piece: number
  calories_per_qty: number
  protein_per_qty: number
  carbs_per_qty: number
  fat_per_qty: number
}

const rid = () => Math.random().toString(36).slice(2)

/** Résout les macros (pour 100 g) d'un ingrédient brut via le catalogue. */
export function enrichIngredient(d: DraftIngredient): EnrichedIngredient {
  const macros = catalogNutrition(d.name)
  return {
    id: rid(),
    name: d.name,
    quantity: d.quantity || 0,
    unit: d.unit || defaultUnitFor(d.name),
    grams_per_piece: catalogPieceGrams(d.name),
    calories_per_qty: macros?.kcal ?? 0,
    protein_per_qty: macros?.prot ?? 0,
    carbs_per_qty: macros?.carbs ?? 0,
    fat_per_qty: macros?.fat ?? 0,
  }
}

/** Convertit une recette « brouillon » en payload prêt pour `recipes`. */
export function draftToRecipePayload(draft: DraftRecipe) {
  return {
    name: draft.name,
    description: draft.description ?? '',
    servings: draft.servings ?? 2,
    prep_time: draft.prep_time ?? 0,
    cook_time: draft.cook_time ?? 0,
    tags: draft.tags ?? [],
    is_favorite: false,
    image_url: draft.image_url,
    ingredients: draft.ingredients.map(enrichIngredient),
    steps: draft.steps.map(s => s.trim()).filter(Boolean),
  }
}
