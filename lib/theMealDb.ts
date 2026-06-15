// Client TheMealDB — base de recettes ouverte, gratuite et sans clé.
//   https://www.themealdb.com/api.php  (clé de test « 1 », libre d'usage)
// Contenu en anglais : on traduit les ingrédients courants vers le FR (pour
// que les macros se résolvent via le catalogue) et on convertit les unités
// anglo-saxonnes au plus juste.

import type { DraftRecipe, DraftIngredient } from './recipeImport'

const BASE = 'https://www.themealdb.com/api/json/v1/1'

type Meal = Record<string, string | null> & { idMeal: string; strMeal: string }

export type MealSummary = {
  id: string
  name: string
  thumb: string | null
  category: string | null
  area: string | null
  meal: Meal // données complètes (search.php renvoie tout)
}

function toSummary(m: Meal): MealSummary {
  return {
    id: m.idMeal,
    name: m.strMeal,
    thumb: m.strMealThumb ?? null,
    category: m.strCategory ?? null,
    area: m.strArea ?? null,
    meal: m,
  }
}

/** Recherche par nom (renvoie la recette complète pour chaque résultat). */
export async function searchMeals(query: string): Promise<MealSummary[]> {
  if (!query.trim()) return []
  try {
    const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.meals as Meal[] | null ?? []).map(toSummary)
  } catch { return [] }
}

/** Quelques recettes au hasard (pour la découverte initiale). */
export async function randomMeals(count = 6): Promise<MealSummary[]> {
  const out: MealSummary[] = []
  const seen = new Set<string>()
  for (let i = 0; i < count * 2 && out.length < count; i++) {
    try {
      const res = await fetch(`${BASE}/random.php`)
      if (!res.ok) continue
      const data = await res.json()
      const m = (data.meals as Meal[] | null)?.[0]
      if (m && !seen.has(m.idMeal)) { seen.add(m.idMeal); out.push(toSummary(m)) }
    } catch { /* noop */ }
  }
  return out
}

// ── Passerelle EN → FR pour les ingrédients courants (résolution macros) ──
const ING_FR: Record<string, string> = {
  egg: 'Œufs', eggs: 'Œufs', 'egg yolk': 'Œufs', 'egg yolks': 'Œufs',
  chicken: 'Blanc de poulet', 'chicken breast': 'Blanc de poulet', 'chicken breasts': 'Blanc de poulet',
  'chicken thighs': 'Cuisse de poulet', beef: 'Bœuf haché', 'minced beef': 'Bœuf haché',
  'ground beef': 'Bœuf haché', 'beef mince': 'Bœuf haché', steak: 'Steak', pork: 'Porc',
  bacon: 'Bacon', ham: 'Jambon blanc', sausage: 'Saucisse', 'sausages': 'Saucisse',
  salmon: 'Saumon', tuna: 'Thon', cod: 'Cabillaud', shrimp: 'Crevette', prawns: 'Crevette',
  rice: 'Riz', 'basmati rice': 'Riz basmati', pasta: 'Pâtes', spaghetti: 'Spaghetti',
  penne: 'Penne', noodles: 'Nouilles', flour: 'Farine', 'plain flour': 'Farine',
  sugar: 'Sucre', 'brown sugar': 'Sucre roux', salt: 'Sel fin', pepper: 'Poivre noir',
  'black pepper': 'Poivre noir', 'olive oil': 'Huile d\'olive', oil: 'Huile de tournesol',
  'vegetable oil': 'Huile de tournesol', butter: 'Beurre', milk: 'Lait', cream: 'Crème fraîche',
  'double cream': 'Crème fraîche', 'heavy cream': 'Crème liquide', yogurt: 'Yaourt nature',
  cheese: 'Cheddar', cheddar: 'Cheddar', parmesan: 'Parmesan', mozzarella: 'Mozzarella',
  feta: 'Feta', onion: 'Oignon', 'red onion': 'Oignon rouge', onions: 'Oignon',
  garlic: 'Ail', 'garlic clove': 'Ail', 'garlic cloves': 'Ail', tomato: 'Tomate',
  tomatoes: 'Tomate', 'chopped tomatoes': 'Tomates concassées', 'tomato puree': 'Concentré de tomate',
  carrot: 'Carotte', carrots: 'Carotte', potato: 'Pomme de terre', potatoes: 'Pomme de terre',
  'sweet potato': 'Patate douce', courgette: 'Courgette', zucchini: 'Courgette',
  aubergine: 'Aubergine', eggplant: 'Aubergine', 'bell pepper': 'Poivron', pepper_veg: 'Poivron',
  mushroom: 'Champignon de Paris', mushrooms: 'Champignon de Paris', spinach: 'Épinard',
  broccoli: 'Brocoli', 'green beans': 'Haricot vert', peas: 'Petit pois', corn: 'Maïs',
  lettuce: 'Laitue', cucumber: 'Concombre', leek: 'Poireau', courgettes: 'Courgette',
  lemon: 'Citron', lime: 'Citron vert', apple: 'Pomme', banana: 'Banane', orange: 'Orange',
  strawberries: 'Fraise', 'lemon juice': 'Citron', oats: 'Flocons d\'avoine',
  'rolled oats': 'Flocons d\'avoine', honey: 'Miel', 'maple syrup': 'Sirop d\'érable',
  chickpeas: 'Pois chiches', lentils: 'Lentilles', 'red lentils': 'Lentilles corail',
  'kidney beans': 'Haricots rouges', 'coconut milk': 'Lait de coco', bread: 'Pain',
  breadcrumbs: 'Pain', 'soy sauce': 'Sauce soja', mustard: 'Moutarde', mayonnaise: 'Mayonnaise',
  ketchup: 'Ketchup', vinegar: 'Vinaigre', 'dark chocolate': 'Chocolat noir',
  chocolate: 'Chocolat au lait', cocoa: 'Cacao en poudre', almonds: 'Amandes', walnuts: 'Noix',
  cumin: 'Cumin', paprika: 'Paprika', curry: 'Curry', 'curry powder': 'Curry',
  cinnamon: 'Cannelle', turmeric: 'Curcuma', basil: 'Basilic frais', parsley: 'Persil',
  coriander: 'Coriandre fraîche', thyme: 'Thym', rosemary: 'Romarin', ginger: 'Gingembre frais',
}

const cleanName = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, ' ')
   .replace(/\b(fresh|dried|large|small|medium|chopped|sliced|minced|grated|ground|boneless|skinless|free range)\b/g, '')
   .replace(/\s+/g, ' ').trim()

/** Traduit un ingrédient EN → FR si connu, sinon renvoie le nom d'origine. */
function frIngredient(en: string): string {
  const c = cleanName(en)
  return ING_FR[c] ?? en.trim()
}

// Convertit une mesure TheMealDB ("1 cup", "200g", "2 tbsp", "1/2") en qté+unité NYSA
function parseMeasure(raw: string): { quantity: number; unit?: string } {
  const s = (raw || '').trim().toLowerCase()
  if (!s) return { quantity: 1, unit: 'pc' }
  // quantité : entier, décimal, ou fraction simple ("1/2", "1 1/2")
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/)
  const mixed = s.match(/(\d+)\s+(\d+)\s*\/\s*(\d+)/)
  let qty = 1
  if (mixed) qty = parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  else if (frac) qty = parseInt(frac[1]) / parseInt(frac[2])
  else {
    const n = s.match(/(\d+(?:[.,]\d+)?)/)
    if (n) qty = parseFloat(n[1].replace(',', '.'))
  }
  qty = Math.round(qty * 100) / 100
  // unité (au plus juste vers le système NYSA)
  if (/\b(kg|kilo)/.test(s)) return { quantity: qty * 1000, unit: 'g' }
  if (/\bg\b|gram|\bgr\b/.test(s)) return { quantity: qty, unit: 'g' }
  if (/\b(ml|millilit)/.test(s)) return { quantity: qty, unit: 'ml' }
  if (/\b(l|litre|liter)\b/.test(s)) return { quantity: qty * 1000, unit: 'ml' }
  if (/\boz\b|ounce/.test(s)) return { quantity: Math.round(qty * 28), unit: 'g' }
  if (/\blb\b|pound/.test(s)) return { quantity: Math.round(qty * 454), unit: 'g' }
  if (/\bcup/.test(s)) return { quantity: Math.round(qty * 240), unit: 'ml' } // US cup ≈ 240 ml
  if (/\b(tbsp|tablespoon|tbs)\b/.test(s)) return { quantity: qty, unit: 'cuillère' } // c. à soupe
  if (/\b(tsp|teaspoon)\b/.test(s)) return { quantity: qty, unit: 'cup' }            // c. à café (NYSA)
  if (/\b(pinch|dash|to taste|handful)\b/.test(s)) return { quantity: 1, unit: 'cup' }
  // sinon : nombre nu → pièces
  return { quantity: qty || 1, unit: 'pc' }
}

/** Découpe les instructions en étapes lisibles. */
function parseSteps(instructions: string | null): string[] {
  if (!instructions) return []
  const byLine = instructions.split(/\r?\n+/).map(s => s.replace(/^\s*(step\s*)?\d+[.)]\s*/i, '').trim()).filter(Boolean)
  if (byLine.length > 1) return byLine
  // un seul bloc → on coupe par phrases
  return instructions.split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 3)
}

/** Convertit une recette TheMealDB en brouillon NYSA (ingrédients FR + macros). */
export function mealToDraft(m: Meal): DraftRecipe {
  const ingredients: DraftIngredient[] = []
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? '').trim()
    if (!name) continue
    const measure = (m[`strMeasure${i}`] ?? '').trim()
    const { quantity, unit } = parseMeasure(measure)
    ingredients.push({ name: frIngredient(name), quantity, unit })
  }
  const tags = [m.strCategory, m.strArea, ...(m.strTags ? m.strTags.split(',') : [])]
    .map(t => (t ?? '').trim()).filter(Boolean)
  return {
    name: m.strMeal,
    description: [m.strArea, m.strCategory].filter(Boolean).join(' · '),
    servings: 2,
    prep_time: 0,
    cook_time: 0,
    tags: Array.from(new Set(tags)),
    image_url: m.strMealThumb ?? undefined,
    ingredients,
    steps: parseSteps(m.strInstructions),
  }
}
