'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, Trash2, Star, UtensilsCrossed } from '@/components/ui/icons'
import { useRecipes } from '@/hooks/useRecipes'
import { createClient } from '@/lib/supabase/client'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)'
const ORANGE = 'var(--accent-brand)'
const WHEAT   = 'var(--text)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
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
      <button onClick={() => router.back()} className="nb-press"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text)', fontSize: 11, fontWeight: 700, padding: '8px 14px', marginBottom: 20 }}>
        <ChevronLeft size={13} /> Retour
      </button>

      <PageTitle
        title="Toutes les recettes"
        sub={`${filtered.length} recette${filtered.length > 1 ? 's' : ''}`}
        accent="var(--accent-recettes)"
        icon={UtensilsCrossed}
      />

      {/* Search + Filter */}
      <div className="toolbar-scroll" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44,
          borderRadius: 'var(--radius-lg)', background: 'var(--bg-input)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chercher une recette…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="toolbar-scroll" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="nb-press"
            style={{
              padding: '8px 16px', minHeight: 36, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: '2px solid var(--ink)',
              boxShadow: filter === f ? '3px 3px 0 var(--ink)' : 'none',
              background: filter === f ? 'var(--accent-recettes)' : 'var(--bg-input)',
              color: filter === f ? 'var(--ink-dark)' : 'var(--text-muted)',
              ...DF, fontWeight: 800, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
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
            <button key={r.id} onClick={() => router.push(`/recettes/${r.id}`)} className="nb-press"
              style={{
                ...card(), cursor: 'pointer', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', padding: 16, position: 'relative',
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
