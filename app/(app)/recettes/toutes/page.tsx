'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, Trash2, Star } from 'lucide-react'
import { useRecipes } from '@/hooks/useRecipes'
import { createClient } from '@/lib/supabase/client'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = '#0E9594'
const ORANGE = '#F2542D'
const WHEAT = '#F0E4CC'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
})

export default function AllRecipesPage() {
  const router = useRouter()
  const { recipes, loading } = useRecipes()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const uniqueTags = Array.from(new Set(recipes.flatMap(r => r.tags || [])))
  const filters = ['Toutes', ...uniqueTags]

  const filtered = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Toutes' || (r.tags || []).includes(filter)
    return matchSearch && matchFilter
  })

  const deleteRecipe = async (id: string) => {
    if (!confirm('Supprimer cette recette?')) return
    await supabase.from('recipes').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div style={{ padding: 30 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ ...DF, fontSize: 28, fontWeight: 900, color: WHEAT, flex: 1 }}>Toutes les recettes</h1>
        <span style={{ fontSize: 12, color: WHEAT, opacity: 0.6 }}>{filtered.length} recettes</span>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40,
          borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chercher une recette…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: filter === f ? ORANGE : 'var(--bg-input)',
              color: filter === f ? '#0C0C0C' : WHEAT,
              fontWeight: 700, fontSize: 12
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: WHEAT }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: WHEAT, opacity: 0.5 }}>Aucune recette</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12
        }}>
          {filtered.map(r => (
            <button key={r.id} onClick={() => router.push(`/recettes/${r.id}`)}
              style={{
                ...card(), cursor: 'pointer', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', padding: 16, position: 'relative', border: 'none',
                background: 'var(--bg-card)'
              }}>
              {r.is_favorite && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <Star size={14} fill={ORANGE} color={ORANGE} />
                </div>
              )}
              <div>
                <span style={{ fontSize: 24 }}>🍽️</span>
                <p style={{ ...DF, fontWeight: 800, fontSize: 13, color: WHEAT, marginTop: 8, lineHeight: 1.3 }}>
                  {r.name}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, color: WHEAT }}>{r.servings}p</span>
                <button onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
