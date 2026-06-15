'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Plus, X, Trash2 } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import { CatalogPicker, type PickedItem } from '@/components/ui/CatalogPicker'
import { unitToGrams } from '@/lib/stock'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)'
const ORANGE = 'var(--accent-budget)'
const WHEAT   = 'var(--text)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
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
  ingredients: Array<{ id: string; name: string; quantity: number; unit: string; calories_per_qty?: number; protein_per_qty?: number; carbs_per_qty?: number; fat_per_qty?: number; grams_per_piece?: number }>
  steps: string[]
}

// kcal d'un ingrédient : macros pour 100 g × (grammes représentés / 100)
function ingredientKcal(ing: { quantity?: number; unit?: string; calories_per_qty?: number; grams_per_piece?: number }): number {
  const grams = unitToGrams(ing.quantity ?? 0, ing.unit, ing.grams_per_piece ?? 100)
  return Math.round((ing.calories_per_qty ?? 0) * grams / 100)
}

function normalizeSteps(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(s => String(s))
  if (typeof raw === 'string') return raw.split('\n').map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  return []
}

export default function RecipeEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === 'new'
  const supabase = createClient()

  const [recipe, setRecipe] = useState<RecipeData>({
    id: '',
    name: '',
    description: '',
    servings: 4,
    prep_time: 0,
    cook_time: 0,
    tags: [],
    is_favorite: false,
    ingredients: [],
    steps: [],
  })

  const [newIngredient, setNewIngredient] = useState({
    name: '', quantity: 0, unit: 'g', grams_per_piece: 100,
    calories_per_qty: 0, protein_per_qty: 0, carbs_per_qty: 0, fat_per_qty: 0,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string }>>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    loadCategories()
    if (!isNew) {
      loadRecipe()
    }
  }, [id])

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('recipe_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      if (data) setCategories(data as any)
    } catch (e) {
      console.error(e)
    }
  }

  const loadRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (data) setRecipe({ ...(data as RecipeData), steps: normalizeSteps((data as { steps?: unknown }).steps) })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('recipe_categories')
        .insert({ user_id: user.id, name: newCategoryName.trim() })
        .select()
        .single()
      if (data) {
        setCategories(prev => [...prev, data as any])
        setRecipe(prev => ({ ...prev, tags: [...new Set([...prev.tags, newCategoryName.trim()])] }))
        setNewCategoryName('')
        setShowNewCategory(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Ensure all tags exist as categories
      for (const tag of recipe.tags) {
        const exists = categories.some(c => c.name === tag)
        if (!exists) {
          await supabase.from('recipe_categories').insert({ user_id: user.id, name: tag })
        }
      }

      if (isNew) {
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            name: recipe.name,
            description: recipe.description,
            servings: recipe.servings,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            tags: recipe.tags,
            is_favorite: recipe.is_favorite,
            ingredients: recipe.ingredients,
            steps: recipe.steps.map(s => s.trim()).filter(Boolean),
          })
          .select()
          .single()
        if (data) router.push(`/recettes/${data.id}`)
      } else {
        await supabase
          .from('recipes')
          .update({
            name: recipe.name,
            description: recipe.description,
            servings: recipe.servings,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            tags: recipe.tags,
            is_favorite: recipe.is_favorite,
            ingredients: recipe.ingredients,
            steps: recipe.steps.map(s => s.trim()).filter(Boolean),
          })
          .eq('id', id)
        router.push(`/recettes/${id}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cette recette?')) return
    try {
      await supabase.from('recipes').delete().eq('id', id)
      router.push('/recettes')
    } catch (e) {
      console.error(e)
    }
  }

  // Sélection d'un aliment → remplit nom + macros (POUR 100 g), l'unité
  // suggérée et le poids d'une pièce (pour l'unité « pc »).
  const pickIngredient = (item: PickedItem) => {
    setNewIngredient(prev => ({
      ...prev,
      name: item.name,
      unit: item.unit ?? prev.unit,
      grams_per_piece: item.gramsPerPiece ?? prev.grams_per_piece,
      calories_per_qty: item.macros100 ? item.macros100.kcal  : prev.calories_per_qty,
      protein_per_qty:  item.macros100 ? item.macros100.prot  : prev.protein_per_qty,
      carbs_per_qty:    item.macros100 ? item.macros100.carbs : prev.carbs_per_qty,
      fat_per_qty:      item.macros100 ? item.macros100.fat   : prev.fat_per_qty,
    }))
  }

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return
    const ingredId = Math.random().toString(36).slice(2)
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...newIngredient, id: ingredId }]
    }))
    setNewIngredient({ name: '', quantity: 0, unit: 'g', grams_per_piece: 100, calories_per_qty: 0, protein_per_qty: 0, carbs_per_qty: 0, fat_per_qty: 0 })
  }

  const removeIngredient = (ingId: string) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== ingId)
    }))
  }

  const addStep = () => setRecipe(prev => ({ ...prev, steps: [...prev.steps, ''] }))
  const updateStep = (i: number, val: string) =>
    setRecipe(prev => ({ ...prev, steps: prev.steps.map((s, idx) => idx === i ? val : s) }))
  const removeStep = (i: number) =>
    setRecipe(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }))

  const addTag = () => {
    if (!tagInput.trim()) return
    setRecipe(prev => ({
      ...prev,
      tags: [...new Set([...prev.tags, tagInput.trim()])]
    }))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setRecipe(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  if (loading) return <div style={{ padding: 30, color: WHEAT }}>Chargement...</div>

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ ...DF, fontSize: 24, fontWeight: 900, color: WHEAT, flex: 1 }}>
          {isNew ? 'Nouvelle recette' : 'Éditer recette'}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, marginBottom: 30 }}>
        {/* Infos basiques */}
        <div style={{ ...card(), padding: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>
            Nom de la recette
          </label>
          <input type="text" value={recipe.name} onChange={e => setRecipe(prev => ({ ...prev, name: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)',
              border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', marginBottom: 16
            }} />

          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>
            Description
          </label>
          <textarea value={recipe.description} onChange={e => setRecipe(prev => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)',
              border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', minHeight: 80, marginBottom: 16
            }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: TEAL, textTransform: 'uppercase' }}>Portions</label>
              <input type="number" min="1" value={recipe.servings} onChange={e => setRecipe(prev => ({ ...prev, servings: parseInt(e.target.value) || 1 }))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', marginTop: 4
                }} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: TEAL, textTransform: 'uppercase' }}>Préparation (min)</label>
              <input type="number" min="0" value={recipe.prep_time} onChange={e => setRecipe(prev => ({ ...prev, prep_time: parseInt(e.target.value) || 0 }))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', marginTop: 4
                }} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: TEAL, textTransform: 'uppercase' }}>Cuisson (min)</label>
              <input type="number" min="0" value={recipe.cook_time} onChange={e => setRecipe(prev => ({ ...prev, cook_time: parseInt(e.target.value) || 0 }))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', marginTop: 4
                }} />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div style={{ ...card(), padding: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 12 }}>
            Catégories
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {recipe.tags.map(tag => (
              <button key={tag}
                onClick={() => removeTag(tag)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                  background: `${TEAL}20`, color: TEAL, border: `1px solid ${TEAL}40`, cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>
                {tag} <X size={14} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select onChange={e => {
              if (e.target.value) {
                setRecipe(prev => ({ ...prev, tags: [...new Set([...prev.tags, e.target.value])] }))
                e.target.value = ''
              }
            }}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                border: '1px solid var(--border)', color: WHEAT
              }}>
              <option value="">Sélectionner une catégorie...</option>
              {categories.filter(c => !recipe.tags.includes(c.name)).map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <button onClick={() => setShowNewCategory(!showNewCategory)}
              style={{
                padding: '8px 14px', borderRadius: 8, background: ORANGE, color: 'var(--chocolate)',
                border: '2px solid var(--ink)', cursor: 'pointer', fontWeight: 600, fontSize: 12
              }}>
              <Plus size={14} />
            </button>
          </div>
          {showNewCategory && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Nouvelle catégorie" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                  border: '1px solid var(--border)', color: WHEAT
                }} />
              <button onClick={addCategory}
                style={{
                  padding: '8px 14px', borderRadius: 8, background: ORANGE, color: 'var(--chocolate)',
                  border: '2px solid var(--ink)', cursor: 'pointer', fontWeight: 600, fontSize: 12
                }}>
                Créer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ingrédients */}
      <div style={{ ...card(), padding: 20, marginBottom: 20, overflow: 'visible' }}>
        <h2 style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT, marginBottom: 16 }}>Ingrédients</h2>
        
        {recipe.ingredients.length > 0 && (
          <div style={{ marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
            {recipe.ingredients.map(ing => (
              <div key={ing.id} style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto', gap: 10, alignItems: 'center',
                padding: '12px', background: 'rgba(var(--text-rgb),0.02)', borderRadius: 8, marginBottom: 8
              }}>
                <span style={{ color: WHEAT, fontSize: 12 }}>{ing.name}</span>
                <span style={{ color: WHEAT, fontSize: 12 }}>{ing.quantity} {ing.unit}</span>
                <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>{ing.calories_per_qty ? ingredientKcal(ing) : '—'} kcal</span>
                <button onClick={() => removeIngredient(ing.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 0 }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'rgba(242,84,45,0.05)', borderRadius: 8, padding: 16, border: `1px solid ${ORANGE}20` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginBottom: 12 }}>
            <CatalogPicker
              query={newIngredient.name}
              onQueryChange={q => setNewIngredient(prev => ({ ...prev, name: q }))}
              onSelect={pickIngredient}
              placeholder="Ingrédient (macros auto)"
            />
            <input type="number" placeholder="Qty" step="0.1" value={newIngredient.quantity}
              onChange={e => setNewIngredient(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              style={{
                padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                border: '1px solid var(--border)', color: WHEAT
              }} />
            <select value={newIngredient.unit} onChange={e => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                border: '1px solid var(--border)', color: WHEAT
              }}>
              <option value="g">g (grammes)</option>
              <option value="ml">ml (millilitres)</option>
              <option value="pc">pc (pièce/unité)</option>
              <option value="cuillère">cuillère (c. à soupe)</option>
              <option value="cup">cup (c. à café)</option>
            </select>
            <button onClick={addIngredient}
              style={{
                padding: '8px 14px', borderRadius: 8, background: ORANGE, color: 'var(--chocolate)',
                border: '2px solid var(--ink)', cursor: 'pointer', fontWeight: 600, fontSize: 12
              }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Étapes — une instruction par ligne, séparées */}
      <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 12 }}>
          Consignes de préparation
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                ...DF, flexShrink: 0, width: 28, height: 38, borderRadius: 8, background: ORANGE,
                color: 'var(--chocolate)', border: '2px solid var(--ink)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
              }}>{i + 1}</span>
              <textarea value={step} onChange={e => updateStep(i, e.target.value)} rows={2}
                placeholder={`Étape ${i + 1}…`}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)',
                  border: '2px solid var(--ink)', color: WHEAT, boxSizing: 'border-box', resize: 'vertical', minHeight: 38,
                }} />
              <button onClick={() => removeStep(i)} aria-label="Supprimer l'étape"
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 6 }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addStep} className="nb-press"
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', color: WHEAT,
            border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', cursor: 'pointer', fontWeight: 700, fontSize: 12,
          }}>
          <Plus size={14} /> Ajouter une étape
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSave} disabled={saving || !recipe.name.trim()} className="nb-press"
          style={{
            flex: 1, padding: '12px', borderRadius: 'var(--radius-lg)', background: ORANGE, color: 'var(--chocolate)',
            border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: saving ? 'default' : 'pointer', fontWeight: 700, opacity: saving || !recipe.name.trim() ? 0.5 : 1
          }}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        {!isNew && (
          <button onClick={handleDelete} className="nb-press"
            style={{
              padding: '12px 20px', borderRadius: 'var(--radius-lg)', background: 'transparent', color: ORANGE,
              border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', fontWeight: 700
            }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
