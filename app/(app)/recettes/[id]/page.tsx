'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Edit, ShoppingCart, Heart } from 'lucide-react'
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
      if (data) setRecipe(data as RecipeData)
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

  if (loading) return <div style={{ padding: 30, color: WHEAT }}>Chargement...</div>
  if (!recipe) return <div style={{ padding: 30, color: WHEAT }}>Recette non trouvée</div>

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
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

      {/* Info rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 30 }}>
        <div style={{ ...card(), padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Portions</p>
          <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.servings}</p>
        </div>
        <div style={{ ...card(), padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', marginBottom: 8 }}>Prép.</p>
          <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.prep_time}min</p>
        </div>
        <div style={{ ...card(), padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', marginBottom: 8 }}>Cuisson</p>
          <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.cook_time}min</p>
        </div>
        <div style={{ ...card(), padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Total</p>
          <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT }}>{recipe.prep_time + recipe.cook_time}min</p>
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
          <p style={{ color: WHEAT, lineHeight: 1.5 }}>{recipe.description}</p>
        </div>
      )}

      {/* Catégories */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recipe.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              background: `${TEAL}20`, color: TEAL, ...DF, fontWeight: 700
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingrédients */}
      <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
        <h2 style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT, marginBottom: 16 }}>Ingrédients</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ingredients.length === 0 ? (
            <p style={{ color: WHEAT, opacity: 0.5 }}>Aucun ingrédient</p>
          ) : (
            ingredients.map((ing, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 10, borderBottom: i < ingredients.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <span style={{ color: WHEAT, fontSize: 13 }}>{ing.name}</span>
                <span style={{ color: ORANGE, fontWeight: 700, fontSize: 12 }}>{ing.quantity} {ing.unit}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Étapes */}
      {recipe.steps && (
        <div style={{ ...card(), padding: 20, marginBottom: 20 }}>
          <h2 style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT, marginBottom: 16 }}>Consignes de préparation</h2>
          <div style={{ whiteSpace: 'pre-wrap', color: WHEAT, lineHeight: 1.6, fontSize: 13 }}>
            {recipe.steps}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        style={{
          width: '100%', padding: '14px', borderRadius: 8, background: ORANGE, color: '#0C0C0C',
          border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, fontSize: 14
        }}>
        <ShoppingCart size={18} /> Ajouter aux courses
      </button>
    </div>
  )
}
