'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcRecipeNutrition, type Recipe } from './useRecipes'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealPlanEntry = {
  id: string
  user_id: string
  recipe_id: string
  date: string           // date ISO "2026-06-13" (colonne `date` de meal_plans)
  meal_type: MealType    // enum DB: breakfast | lunch | dinner | snack
  servings: number | null
  recipes?: Recipe | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

/**
 * Source de vérité partagée du planning de repas.
 * Alimente la nutrition de la section Recettes ET de la section Santé
 * (interconnexion). Aucune donnée codée en dur : tout vient de `meal_plans`
 * (+ jointure `recipes`). États vides/zéro si rien n'est planifié.
 */
export function useMealPlan() {
  const [plans, setPlans] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('meal_plans').select('*, recipes(*)')
    setPlans((data as MealPlanEntry[]) ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  // Planifie une recette (insert) — aligné au schéma meal_plans (date + enum)
  async function schedule(recipeId: string, date: string, mealType: MealType, servings = 1) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ user_id: user.id, recipe_id: recipeId, date, meal_type: mealType, servings })
      .select('*, recipes(*)')
      .single()
    if (!error && data) setPlans(p => [...p, data as MealPlanEntry])
    return { data: data as MealPlanEntry | null, error }
  }

  // Retire une entrée du planning (delete)
  async function removeEntry(id: string) {
    await supabase.from('meal_plans').delete().eq('id', id)
    setPlans(p => p.filter(e => e.id !== id))
  }

  // Nutrition agrégée sur un ensemble d'entrées
  function aggregate(entries: MealPlanEntry[]) {
    return entries.reduce(
      (sum, e) => {
        const n = calcRecipeNutrition(e.recipes ?? null, e.servings ?? 1)
        return {
          calories: sum.calories + n.calories,
          protein:  sum.protein  + n.protein,
          carbs:    sum.carbs    + n.carbs,
          fat:      sum.fat       + n.fat,
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  const day = todayISO()
  const todayEntries = plans.filter(p => p.date === day)
  const todayNutrition = aggregate(todayEntries)
  const planNutrition = aggregate(plans)

  // Calories par jour de la semaine courante (Lun→Dim) à partir des dates ISO
  const now = new Date()
  const monday = new Date(now)
  const dow = (now.getDay() + 6) % 7 // 0 = lundi
  monday.setDate(now.getDate() - dow)
  const weekCaloriesByDay = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    const iso = dt.toISOString().slice(0, 10)
    const cal = aggregate(plans.filter(p => p.date === iso)).calories
    return { d, iso, cal }
  })

  const todayRecipes = todayEntries
    .map(e => e.recipes)
    .filter((r): r is Recipe => !!r)

  return {
    plans,
    loading,
    refetch: fetch,
    schedule,
    removeEntry,
    todayEntries,
    todayRecipes,
    todayNutrition,
    planNutrition,
    weekCaloriesByDay,
    hasPlan: plans.length > 0,
  }
}

// Helpers partagés pour la grille hebdomadaire (mêmes valeurs partout)
export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Petit-déj' },
  { key: 'lunch',     label: 'Déjeuner' },
  { key: 'dinner',    label: 'Dîner' },
  { key: 'snack',     label: 'Snack' },
]

// Dates ISO de la semaine courante (lundi → dimanche), avec libellé court
export function currentWeekDays(): { label: string; iso: string }[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    return { label, iso: dt.toISOString().slice(0, 10) }
  })
}
