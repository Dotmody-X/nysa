'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Plus, X, Trash2 } from 'lucide-react'
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
  ingredients: Array<{ id: string; name: string; quantity: number; unit: string; calories_per_qty?: number; protein_per_qty?: number; carbs_per_qty?: number; fat_per_qty?: number }>
  steps: string
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
    steps: '',
  })

  const [newIngredient, setNewIngredient] = useState({
    name: '', quantity: 0, unit: 'g',
    calories_per_qty: 0, protein_per_qty: 0, carbs_per_qty: 0, fat_per_qty: 0,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (!isNew) {
      loadRecipe()
    }
  }, [id])

  const loadRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      if (data) setRecipe(data as RecipeData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
            steps: recipe.steps,
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
            steps: recipe.steps,
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

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return
    const ingredId = Math.random().toString(36).slice(2)
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...newIngredient, id: ingredId }]
    }))
    setNewIngredient({ name: '', quantity: 0, unit: 'g', calories_per_qty: 0, protein_per_qty: 0, carbs_per_qty: 0, fat_per_qty: 0 })
  }

  const removeIngredient = (ingId: string) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== ingId)
    }))
  }

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Ajouter une catégorie" value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                border: '1px solid var(--border)', color: WHEAT
              }} />
            <button onClick={addTag}
              style={{
                padding: '8px 14px', borderRadius: 6, background: ORANGE, color: '#0C0C0C',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12
              }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Ingrédients */}
      <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
        <h2 style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT, marginBottom: 16 }}>Ingrédients</h2>
        
        {recipe.ingredients.length > 0 && (
          <div style={{ marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
            {recipe.ingredients.map(ing => (
              <div key={ing.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'center',
                padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 8
              }}>
                <span style={{ color: WHEAT, fontSize: 12 }}>{ing.name}</span>
                <span style={{ color: WHEAT, fontSize: 12 }}>{ing.quantity} {ing.unit}</span>
                <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>{ing.calories_per_qty ? Math.round(ing.calories_per_qty) : '—'} cal</span>
                <button onClick={() => removeIngredient(ing.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 0 }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'rgba(242,84,45,0.05)', borderRadius: 8, padding: 16, border: `1px solid ${ORANGE}20` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <input type="text" placeholder="Ingrédient" value={newIngredient.name} 
              onChange={e => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
              style={{
                padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)',
                border: '1px solid var(--border)', color: WHEAT
              }} />
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
              <option>g</option>
              <option>ml</option>
              <option>pc</option>
              <option>cuillère</option>
              <option>cup</option>
            </select>
            <button onClick={addIngredient}
              style={{
                padding: '8px 14px', borderRadius: 6, background: ORANGE, color: '#0C0C0C',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12
              }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Étapes */}
      <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>
          Consignes de préparation
        </label>
        <textarea value={recipe.steps} onChange={e => setRecipe(prev => ({ ...prev, steps: e.target.value }))}
          placeholder="1. Étape 1\n2. Étape 2\n3. Étape 3"
          style={{
            width: '100%', padding: '12px', borderRadius: 8, background: 'var(--bg-input)',
            border: '1px solid var(--border)', color: WHEAT, boxSizing: 'border-box', minHeight: 150
          }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSave} disabled={saving || !recipe.name.trim()}
          style={{
            flex: 1, padding: '12px', borderRadius: 8, background: ORANGE, color: '#0C0C0C',
            border: 'none', cursor: saving ? 'default' : 'pointer', fontWeight: 700, opacity: saving || !recipe.name.trim() ? 0.5 : 1
          }}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        {!isNew && (
          <button onClick={handleDelete}
            style={{
              padding: '12px 20px', borderRadius: 8, background: 'transparent', color: ORANGE,
              border: `1px solid ${ORANGE}`, cursor: 'pointer', fontWeight: 700
            }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
