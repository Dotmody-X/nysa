// Qualité nutritionnelle d'une recette : on reconstitue le profil POUR 100 g
// du plat (à partir des ingrédients : nom → profil étendu, quantité+unité → g),
// puis on calcule le Nutri-Score.

import { unitToGrams } from './stock'
import { catalogExtended } from './catalogue'
import { nutriScore, type NutriGrade } from './nutriScore'

type Ing = {
  name: string
  quantity?: number
  unit?: string
  grams_per_piece?: number
}

export type RecipeQuality = { grade: NutriGrade; points: number; color: string } | null

/** Nutri-Score d'une recette (null si aucune donnée nutritionnelle exploitable). */
export function recipeNutriScore(recipe: { ingredients?: Ing[] } | null | undefined): RecipeQuality {
  const ings = recipe?.ingredients
  if (!ings || ings.length === 0) return null

  let grams = 0
  const tot = { kcal: 0, sugars: 0, fat: 0, salt: 0, fiber: 0, protein: 0 }
  for (const ing of ings) {
    const ext = catalogExtended(ing.name)
    if (!ext) continue
    const g = unitToGrams(ing.quantity ?? 0, ing.unit, ing.grams_per_piece ?? 100)
    if (g <= 0) continue
    const f = g / 100
    grams += g
    tot.kcal    += ext.kcal   * f
    tot.sugars  += ext.sugars * f
    tot.fat     += ext.fat    * f
    tot.salt    += ext.salt   * f
    tot.fiber   += ext.fiber  * f
    tot.protein += ext.prot   * f
  }
  if (grams <= 0) return null

  const k = 100 / grams // ramène le total du plat à 100 g
  return nutriScore({
    kcal: tot.kcal * k,
    sugars: tot.sugars * k,
    fat: tot.fat * k,
    salt: tot.salt * k,
    fiber: tot.fiber * k,
    protein: tot.protein * k,
  })
}
