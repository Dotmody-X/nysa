'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RecipeIngredient {
  id: string
  name: string
  quantity: number
  unit: string
  calories_per_qty: number
  protein_per_qty: number
  carbs_per_qty: number
  fat_per_qty: number
  inventory_item_name?: string
}

export interface Recipe {
  id: string
  name: string
  description?: string
  prep_time?: number
  cook_time?: number
  servings: number
  image_url?: string
  tags?: string[]
  is_favorite: boolean
  ingredients?: RecipeIngredient[]
  created_at: string
  updated_at: string
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecipes(data as Recipe[])
      }
    } catch (e) {
      console.error('Failed to fetch recipes:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Create recipe
  async function createRecipe(recipe: Partial<Recipe>) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          ...recipe,
          user_id: user.id,
          ingredients: recipe.ingredients || [],
        })
        .select()
        .single()

      if (!error && data) {
        setRecipes(r => [data as Recipe, ...r])
        return { data: data as Recipe }
      }
      return { error: error?.message }
    } catch (e) {
      return { error: String(e) }
    }
  }

  // Add ingredient to recipe
  async function addIngredient(recipeId: string, ingredient: Partial<RecipeIngredient>) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          ...ingredient,
          recipe_id: recipeId,
          user_id: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        return { data: data as RecipeIngredient }
      }
      return { error: error?.message }
    } catch (e) {
      return { error: String(e) }
    }
  }

  // Calculate nutrition for recipe
  function calculateNutrition(recipe: Recipe, servings: number = 1) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }

    const total = recipe.ingredients.reduce(
      (sum, ing) => {
        const quantityInGrams = ing.quantity // quantity is already in the unit specified
        const servingRatio = servings / (recipe.servings || 1)
        return {
          calories: sum.calories + (ing.calories_per_qty * quantityInGrams * servingRatio),
          protein: sum.protein + (ing.protein_per_qty * quantityInGrams * servingRatio),
          carbs: sum.carbs + (ing.carbs_per_qty * quantityInGrams * servingRatio),
          fat: sum.fat + (ing.fat_per_qty * quantityInGrams * servingRatio),
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    return {
      calories: Math.round(total.calories),
      protein: Math.round(total.protein * 10) / 10,
      carbs: Math.round(total.carbs * 10) / 10,
      fat: Math.round(total.fat * 10) / 10,
    }
  }

  // Scale ingredient quantities
  function scaleIngredients(recipe: Recipe, newServings: number) {
    if (!recipe.ingredients) return []

    const ratio = newServings / (recipe.servings || 1)
    return recipe.ingredients.map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * ratio * 10) / 10,
    }))
  }

  // Add recipe to shopping list
  async function addToShoppingList(recipeId: string, servings: number = 1) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }

      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe?.ingredients) return { error: 'Recipe not found' }

      const scaledIngredients = scaleIngredients(recipe, servings)

      // Create or get shopping list for today
      const today = new Date().toISOString().split('T')[0]
      const { data: listData } = await supabase
        .from('shopping_lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      let listId = listData?.id
      if (!listId) {
        const { data: newList } = await supabase
          .from('shopping_lists')
          .insert({
            user_id: user.id,
            name: `Shopping - ${today}`,
            date: today,
            status: 'active',
          })
          .select()
          .single()
        listId = newList?.id
      }

      // Add items
      if (listId) {
        const items = scaledIngredients.map(ing => ({
          user_id: user.id,
          shopping_list_id: listId,
          recipe_id: recipeId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: 'Recette',
        }))

        await supabase.from('shopping_items').insert(items)
      }

      return { success: true }
    } catch (e) {
      return { error: String(e) }
    }
  }

  return {
    recipes,
    loading,
    refetch: fetch,
    createRecipe,
    addIngredient,
    calculateNutrition,
    scaleIngredients,
    addToShoppingList,
  }
}
