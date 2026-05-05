'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Edit, Heart, Plus, Minus, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = '#0E9594'
const ORANGE = '#F2542D'
const WHEAT = '#F0E4CC'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
})

interface RecipeData {
  id: string
  name: string
  description: string
  servings: number
  prep_time: number
  cook_time: number
  tags: string[]
  is_favorite: boolean
  ingredients: any
  steps: string
}

export default function RecipeViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState(0)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ day: 'Lun', mealType: 'Déjeuner' })

  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const MEALS = ['Petit-déj', 'Déjeuner', 'Dîner', 'Snack']

  useEffect(() => {
    loadRecipe()
  }, [id])

  const loadRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (data) {
        setRecipe(data as RecipeData)
        setServings(data.servings)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async () => {
    if (!recipe) return
    try {
      await supabase
        .from('recipes')
        .update({ is_favorite: !recipe.is_favorite })
        .eq('id', id)
      setRecipe(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSchedule = async () => {
    if (!recipe) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create meal plan entry
      await supabase.from('meal_plans').insert({
        user_id: user.id,
        recipe_id: id,
        date: new Date().toISOString().split('T')[0],
        day: scheduleForm.day,
        meal_type: scheduleForm.mealType.toLowerCase(),
      })

      // Add ingredients to shopping list
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
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
          .insert({ user_id: user.id, name: `Shopping - ${today}`, date: today, status: 'active' })
          .select()
          .single()
        listId = newList?.id
      }

      if (listId && ingredients.length > 0) {
        const ratio = servings / (recipe.servings || 1)
        const items = ingredients.map(ing => ({
          user_id: user.id,
          shopping_list_id: listId,
          recipe_id: id,
          name: ing.name,
          quantity: ing.quantity * ratio,
          unit: ing.unit,
          category: 'Recette',
          done: false,
        }))
        await supabase.from('shopping_items').insert(items)
      }

      setShowSchedule(false)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div style={{ padding: 30, color: WHEAT }}>Chargement...</div>
  if (!recipe) return <div style={{ padding: 30, color: WHEAT }}>Recette non trouvée</div>

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const ratio = servings / (recipe.servings || 1)
  const scaledIngredients = ingredients.map(ing => ({
    ...ing,
    quantity: Math.round(ing.quantity * ratio * 10) / 10,
  }))

  return (
    <div style={{ padding: 30 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ ...DF, fontSize: 28, fontWeight: 900, color: WHEAT, flex: 1 }}>{recipe.name}</h1>
        <button onClick={toggleFavorite}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 12 }}>
          <Heart size={20} fill={recipe.is_favorite ? ORANGE : 'transparent'} color={ORANGE} />
        </button>
        <button onClick={() => router.push(`/recettes/${id}/edit`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8,
            background: ORANGE, color: '#0C0C0C', border: 'none', cursor: 'pointer', fontWeight: 700
          }}>
          <Edit size={16} /> Modifier
        </button>
      </div>

      {/* Main Layout: Left (ingredients) | Center (recipe) */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20 }}>
        {/* LEFT: Ingredients Panel */}
        <div>
          {/* Portions adjuster */}
          <div style={{ ...card(), padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 12 }}>
              Portions
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button onClick={() => setServings(Math.max(1, servings - 1))}
                style={{
                  width: 36, height: 36, borderRadius: 6, background: ORANGE, color: '#0C0C0C',
                  border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16
                }}>
                <Minus size={16} style={{ margin: 'auto' }} />
              </button>
              <span style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT, textAlign: 'center', flex: 1 }}>
                {servings}
              </span>
              <button onClick={() => setServings(servings + 1)}
                style={{
                  width: 36, height: 36, borderRadius: 6, background: ORANGE, color: '#0C0C0C',
                  border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16
                }}>
                <Plus size={16} style={{ margin: 'auto' }} />
              </button>
            </div>
          </div>

          {/* Ingredients list */}
          <div style={{ ...card(), padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 12 }}>
              Ingrédients
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {scaledIngredients.length === 0 ? (
                <p style={{ color: WHEAT, opacity: 0.5, fontSize: 12 }}>Aucun ingrédient</p>
              ) : (
                scaledIngredients.map((ing, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 11 }}>
                    <p style={{ color: WHEAT, fontWeight: 600 }}>{ing.name}</p>
                    <p style={{ color: ORANGE, fontSize: 10, fontWeight: 700 }}>
                      {ing.quantity} {ing.unit}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Recipe Content */}
        <div>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {recipe.prep_time > 0 && (
              <div style={{ ...card(), padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', marginBottom: 8 }}>Prép.</p>
                <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.prep_time}min</p>
              </div>
            )}
            {recipe.cook_time > 0 && (
              <div style={{ ...card(), padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', marginBottom: 8 }}>Cuisson</p>
                <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.cook_time}min</p>
              </div>
            )}
            {(recipe.prep_time > 0 || recipe.cook_time > 0) && (
              <div style={{ ...card(), padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Total</p>
                <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.prep_time + recipe.cook_time}min</p>
              </div>
            )}
          </div>

          {/* Description */}
          {recipe.description && (
            <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
              <p style={{ color: WHEAT, lineHeight: 1.6, fontSize: 13 }}>{recipe.description}</p>
            </div>
          )}

          {/* Catégories */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {recipe.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: '6px 12px', borderRadius: 20,
                  background: `${TEAL}20`, color: TEAL, ...DF, fontWeight: 700
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Étapes */}
          {recipe.steps && (
            <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
              <h2 style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT, marginBottom: 16 }}>Consignes</h2>
              <div style={{ whiteSpace: 'pre-wrap', color: WHEAT, lineHeight: 1.6, fontSize: 13 }}>
                {recipe.steps}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowSchedule(true)}
              style={{
                flex: 1, padding: '14px', borderRadius: 8, background: ORANGE, color: '#0C0C0C',
                border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, fontSize: 14
              }}>
              <Calendar size={18} /> Ajouter au menu
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: 400,
            border: `1px solid var(--border)`
          }}>
            <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT, marginBottom: 20 }}>Ajouter au menu</p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Jour</label>
              <select value={scheduleForm.day} onChange={e => setScheduleForm({ ...scheduleForm, day: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT, marginTop: 8
                }}>
                {DAYS.map(day => <option key={day}>{day}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Repas</label>
              <select value={scheduleForm.mealType} onChange={e => setScheduleForm({ ...scheduleForm, mealType: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT, marginTop: 8
                }}>
                {MEALS.map(meal => <option key={meal}>{meal}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSchedule}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, background: ORANGE,
                  color: '#0C0C0C', border: 'none', cursor: 'pointer', fontWeight: 700
                }}>
                Ajouter
              </button>
              <button onClick={() => setShowSchedule(false)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)',
                  color: WHEAT, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700
                }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
