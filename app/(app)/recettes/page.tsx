'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Flame, ChevronRight, Star } from 'lucide-react'
import { useRecipes } from '@/hooks/useRecipes'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = '#0E9594'
const ORANGE  = '#F2542D'
const WHEAT   = '#F0E4CC'
const TEAL_BG = '#11686A'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
})
const darkCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: '#16162A', borderRadius: 12, overflow: 'hidden', ...extra,
})
const lbl = (color = ORANGE): React.CSSProperties => ({
  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
})

export default function RecettesPage() {
  const router = useRouter()
  const { recipes, loading, createRecipe } = useRecipes()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const filtered = recipes.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleNewRecipe = () => {
    router.push('/recettes/new')
  }

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`
        .rec-card:hover  { opacity: .92; transform: translateY(-1px); transition: .15s; }
        .rec-btn:hover   { opacity: .85; }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'auto auto auto auto',
        gap: 10,
      }}>

        {/* ── R1 C1-2 : HERO ────────────────────────────── */}
        <div style={{ ...card(), gridColumn: 'span 2', padding: '26px 28px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ ...DF, fontSize: 46, fontWeight: 900, color: ORANGE, lineHeight: 0.92, marginBottom: 6 }}>RECETTES.</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
              Crée, gère & cuisine tes recettes
            </p>
            <button className="rec-btn" onClick={handleNewRecipe}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer', marginBottom: 18 }}>
              <Plus size={11} /> Nouvelle recette
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 38,
              borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Chercher une recette…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
            </div>
          </div>
        </div>

        {/* ── R1 C3-4 : Stats ────────────────────────────── */}
        <div style={{ ...card(), padding: 20 }}>
          <p style={{ ...lbl('rgba(255,255,255,0.5)') }}>Total recettes</p>
          <p style={{ ...DF, fontSize: 32, fontWeight: 900, color: WHEAT, marginTop: 12 }}>{recipes.length}</p>
        </div>
        <div style={{ ...card(), padding: 20 }}>
          <p style={{ ...lbl('rgba(255,255,255,0.5)') }}>Favorites</p>
          <p style={{ ...DF, fontSize: 32, fontWeight: 900, color: ORANGE, marginTop: 12 }}>{recipes.filter(r => r.is_favorite).length}</p>
        </div>

        {/* ── R2-4 C1-4 : Recettes Grid ────────────────────────────── */}
        {loading ? (
          <div style={{ ...card(), gridColumn: 'span 4', padding: 40, textAlign: 'center', color: WHEAT }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card(), gridColumn: 'span 4', padding: 40, textAlign: 'center', color: WHEAT, opacity: 0.5 }}>
            {recipes.length === 0 ? 'Aucune recette. Crée ta première!' : 'Aucun résultat'}
          </div>
        ) : (
          filtered.map((r, i) => (
            <button key={r.id} onClick={() => router.push(`/recettes/${r.id}`)}
              className="rec-card"
              style={{ ...card(), cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, position: 'relative', border: 'none', background: 'var(--bg-card)' }}>
              {r.is_favorite && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Star size={12} fill={ORANGE} color={ORANGE} />
                </div>
              )}
              <div>
                <span style={{ fontSize: 28 }}>🍽️</span>
                <p style={{ ...DF, fontWeight: 800, fontSize: 13, color: WHEAT, lineHeight: 1.3, marginTop: 8, marginBottom: 8 }}>{r.name}</p>
                {r.tags && r.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {(r.tags as string[]).map(tag => (
                      <span key={tag} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4,
                        background: 'rgba(14,149,148,0.12)', color: TEAL, ...DF, fontWeight: 700 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 10 }}>
                <span style={{ color: ORANGE, ...DF, fontWeight: 700 }}>{r.servings}p</span>
                {r.prep_time && <span style={{ color: WHEAT }}>⏱ {r.prep_time}min</span>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
