'use client'
import { useState } from 'react'
import { Plus, Search, Heart, Flame, Zap, TrendingUp, ShoppingCart, ChevronRight } from 'lucide-react'
import { useRecipes } from '@/hooks/useRecipes'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = '#F2542D'
const TEAL = '#0E9594'
const WHEAT = '#F0E4CC'

export default function RecettesPage() {
  const { recipes, loading, createRecipe, addToShoppingList, calculateNutrition, scaleIngredients } = useRecipes()
  const [search, setSearch] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [servings, setServings] = useState<number>(1)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', servings: 4, prepTime: 0, cookTime: 0 })

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const selected = recipes.find(r => r.id === selectedRecipe)
  const nutrition = selected ? calculateNutrition(selected, servings) : null
  const scaledIngredients = selected ? scaleIngredients(selected, servings) : []

  const handleCreateRecipe = async () => {
    if (!formData.name) return
    await createRecipe(formData)
    setFormData({ name: '', servings: 4, prepTime: 0, cookTime: 0 })
    setShowForm(false)
  }

  const handleAddToCart = async () => {
    if (selectedRecipe) {
      await addToShoppingList(selectedRecipe, servings)
      alert('✅ Ajouté à la liste de courses')
    }
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ ...DF, fontSize: 24, fontWeight: 900, color: WHEAT }}>🍳 Recettes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: ORANGE,
            color: '#0C0C0C',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
          <Plus size={16} /> Nouvelle
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: 'rgba(242,84,45,0.08)',
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${ORANGE}40`,
        }}>
          <input
            type="text"
            placeholder="Nom de la recette"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: WHEAT,
              marginBottom: 12,
              fontFamily: 'var(--font-display)',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input
              type="number"
              placeholder="Servings"
              value={formData.servings}
              onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: WHEAT,
              }}
            />
            <input
              type="number"
              placeholder="Prep (min)"
              value={formData.prepTime}
              onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) || 0 })}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: WHEAT,
              }}
            />
            <input
              type="number"
              placeholder="Cook (min)"
              value={formData.cookTime}
              onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) || 0 })}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: WHEAT,
              }}
            />
          </div>
          <button
            onClick={handleCreateRecipe}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              background: ORANGE,
              color: '#0C0C0C',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}>
            Créer recette
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: WHEAT, opacity: 0.5 }} />
        <input
          type="text"
          placeholder="Chercher une recette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: 40,
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: WHEAT,
          }}
        />
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: '60vh' }}>
        {/* List */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: 'uppercase' }}>
              {filtered.length} Recettes
            </p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ padding: 20, color: WHEAT, textAlign: 'center' }}>Chargement...</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: 20, color: WHEAT, textAlign: 'center' }}>Aucune recette</p>
            ) : (
              filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRecipe(r.id)
                    setServings(r.servings || 1)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: selectedRecipe === r.id ? `${ORANGE}20` : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <span style={{ color: WHEAT, fontWeight: 600 }}>{r.name}</span>
                  <ChevronRight size={14} style={{ color: WHEAT, opacity: 0.5 }} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div>
              <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT }}>{selected.name}</p>
              <p style={{ fontSize: 12, color: WHEAT, opacity: 0.6, marginTop: 4 }}>
                {selected.prep_time && `${selected.prep_time}min`}
                {selected.cook_time && ` + ${selected.cook_time}min`}
              </p>
            </div>

            {/* Servings */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px',
              background: 'rgba(242,84,45,0.08)',
              borderRadius: 8,
            }}>
              <label style={{ color: WHEAT, fontSize: 12 }}>Portions:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                style={{
                  width: 50,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: WHEAT,
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Nutrition */}
            {nutrition && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                <div style={{ background: 'rgba(242,84,45,0.08)', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, color: WHEAT, opacity: 0.6, marginBottom: 4 }}>CALORIES</p>
                  <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: ORANGE }}>{nutrition.calories}</p>
                </div>
                <div style={{ background: 'rgba(14,149,148,0.08)', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, color: WHEAT, opacity: 0.6, marginBottom: 4 }}>PROTÉINES</p>
                  <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: TEAL }}>{nutrition.protein}g</p>
                </div>
                <div style={{ background: 'rgba(240,228,204,0.08)', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, color: WHEAT, opacity: 0.6, marginBottom: 4 }}>GLUCIDES</p>
                  <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT }}>{nutrition.carbs}g</p>
                </div>
                <div style={{ background: 'rgba(255,107,53,0.08)', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, color: WHEAT, opacity: 0.6, marginBottom: 4 }}>LIPIDES</p>
                  <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: '#FF6B35' }}>{nutrition.fat}g</p>
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: ORANGE, marginBottom: 10, textTransform: 'uppercase' }}>
                Ingrédients
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {scaledIngredients.length === 0 ? (
                  <p style={{ fontSize: 12, color: WHEAT, opacity: 0.5 }}>Aucun ingrédient</p>
                ) : (
                  scaledIngredients.map((ing, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: WHEAT }}>
                      <span>{ing.name}</span>
                      <span style={{ fontWeight: 600 }}>{ing.quantity} {ing.unit}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleAddToCart}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: ORANGE,
                color: '#0C0C0C',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 'auto',
              }}>
              <ShoppingCart size={16} /> Ajouter aux courses
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: WHEAT,
            opacity: 0.5,
          }}>
            Sélectionne une recette
          </div>
        )}
      </div>
    </div>
  )
}
