import { createClient } from '@/lib/supabase/client'
import { checkStock, findInv } from '@/lib/stock'
import { userKey } from '@/lib/userStore'

type RecipeLike = {
  id?: string
  servings?: number | null
  ingredients?: Array<{ name: string; quantity?: number; unit?: string }> | null
}

type InvItem = { name: string; qty: string; status?: string }

/**
 * Ajoute à la liste de courses du jour UNIQUEMENT les ingrédients dont le
 * stock maison (localStorage `nysa_inventaire`) est insuffisant — en quantité
 * manquante. Crée la liste du jour si besoin. À appeler quand on planifie un
 * repas. Renvoie le nombre d'articles ajoutés.
 */
export async function addRecipeShortfallToShoppingList(
  recipe: RecipeLike | null | undefined,
  servings: number,
): Promise<number> {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe!.ingredients! : []
  if (ingredients.length === 0) return 0

  let inventory: InvItem[] = []
  try { inventory = JSON.parse(localStorage.getItem(userKey('nysa_inventaire')) || '[]') } catch { inventory = [] }

  const ratio = servings / (recipe?.servings || servings || 1)
  const needed = ingredients
    .map(ing => {
      const qty = (ing.quantity || 0) * ratio
      const chk = checkStock(qty, ing.unit || '', findInv(inventory, ing.name))
      if (chk.sufficient) return null
      return { name: ing.name, quantity: Math.max(chk.deficit || qty, 0) || qty, unit: ing.unit || null, category: 'Recette' }
    })
    .filter((x): x is { name: string; quantity: number; unit: string | null; category: string } => !!x)

  if (needed.length === 0) return 0

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const today = new Date().toISOString().slice(0, 10)
  let listId: string | undefined
  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('status', 'active')
    .maybeSingle()
  listId = existing?.id
  if (!listId) {
    const { data: created } = await supabase
      .from('shopping_lists')
      .insert({ user_id: user.id, name: `Courses - ${today}`, date: today, status: 'active' })
      .select('id')
      .single()
    listId = created?.id
  }
  if (!listId) return 0

  await supabase.from('shopping_items').insert(
    needed.map(n => ({
      user_id: user.id,
      shopping_list_id: listId,
      recipe_id: recipe?.id ?? null,
      name: n.name,
      quantity: n.quantity,
      unit: n.unit,
      category: n.category,
      is_checked: false,
    })),
  )
  return needed.length
}
