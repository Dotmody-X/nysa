'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Flame, Zap, ChevronRight, Check, X, Star, Trash2, MoreVertical } from 'lucide-react'
import { useRecipes } from '@/hooks/useRecipes'
import { createClient } from '@/lib/supabase/client'

/* ─── Constants ──────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = '#0E9594'
const ORANGE  = '#F2542D'
const WHEAT   = '#F0E4CC'
const TEAL_BG = '#11686A'

/* ─── Card helpers ───────────────────────────────────────────── */
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
})
const tealCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: TEAL_BG, borderRadius: 12, overflow: 'hidden', ...extra,
})
const orangeCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: ORANGE, borderRadius: 12, overflow: 'hidden', ...extra,
})
const darkCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: '#16162A', borderRadius: 12, overflow: 'hidden', ...extra,
})
const lbl = (color = ORANGE): React.CSSProperties => ({
  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
})

/* ─── Data ───────────────────────────────────────────────────── */
const DAYS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MEALS = ['Petit-déj', 'Déjeuner', 'Dîner', 'Snack']

// Dynamic filters from recipes
let ALL_FILTERS = ['Toutes']

const SAMPLE_RECIPES: any[] = []

const CATEGORIES: any[] = []

const INGREDIENTS = [
  { name: 'Saumon', qty: '200g',  color: ORANGE },
  { name: 'Quinoa', qty: '150g',  color: TEAL   },
  { name: 'Épinards', qty: '100g',color: '#5B6F3A' },
  { name: 'Avocat', qty: '1 pc',  color: '#5B6F3A' },
  { name: 'Yaourt grec', qty: '200g', color: WHEAT },
  { name: 'Riz jasmin', qty: '180g', color: WHEAT },
]

const SEED_COURSES: Array<{ id: string; item: string; qty: string; done: boolean }> = []

const MEAL_PLAN: Record<string, string> = {}

/* ─── Donut SVG ──────────────────────────────────────────────── */
function DonutChart({ slices, size = 110 }: { slices: { pct: number; color: string }[]; size?: number }) {
  const r = 40; const cx = size / 2; const cy = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(240,228,204,0.06)" strokeWidth={14} />
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circumference
        const gap  = circumference - dash
        const rot  = -90 + (offset / 100) * 360
        offset += s.pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={14}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }} />
        )
      })}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function RecettesPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { recipes, loading } = useRecipes()
  const [filter, setFilter]     = useState('Toutes')
  const [search, setSearch]     = useState('')
  const [courses, setCourses]   = useState(SEED_COURSES)
  const [hydrated, setHydrated] = useState(false)
  const [newItem, setNewItem]   = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [tab, setTab] = useState('recent') // 'recent' or 'mes'
  const [catMenu, setCatMenu] = useState<string | null>(null) // For category 3-dot menus
  const [mealPlan, setMealPlan] = useState(MEAL_PLAN)
  const [selectedMealSlot, setSelectedMealSlot] = useState<{day: string; meal: string} | null>(null)
  
  // Combine sample recipes with DB recipes
  const dbRecipes = recipes.map(r => ({
    id: r.id,
    name: r.name,
    cal: r.ingredients ? 400 : 0,
    prot: r.ingredients ? 35 : 0,
    carbs: r.ingredients ? 45 : 0,
    fat: r.ingredients ? 12 : 0,
    time: r.prep_time || 0,
    tags: r.tags || [],
    emoji: '🍽️',
    fav: r.is_favorite || false,
  }))
  
  const allRecipes = [...SAMPLE_RECIPES, ...dbRecipes]
  
  // Update ALL_FILTERS dynamically
  ALL_FILTERS = ['Toutes', ...Array.from(new Set(allRecipes.flatMap(r => r.tags || [])))]

  /* ── Load meal plans from Supabase ── */
  useEffect(() => {
    const loadMealPlan = async () => {
      try {
        const { data, error } = await supabase.from('meal_plans').select('*')
        if (data && !error) {
          const plan: Record<string, string> = {}
          data.forEach((mp: any) => {
            const recipe = allRecipes.find(r => r.id === mp.recipe_id)
            if (recipe) {
              plan[`${mp.day}-${mp.meal_type}`] = `${recipe.emoji} ${recipe.name}`
            }
          })
          setMealPlan(plan)
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadMealPlan()
  }, [recipes])

  /* ── localStorage persistence for shopping list ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nysa_courses')
      if (saved) setCourses(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('nysa_courses', JSON.stringify(courses))
  }, [courses, hydrated])

  const toggleCourse = (id: string) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }

  const addCourse = () => {
    if (!newItem.trim()) return
    const item = { id: Date.now().toString(), item: newItem.trim(), qty: '', done: false }
    setCourses(prev => [...prev, item])
    setNewItem('')
    setShowAddItem(false)
  }

  const removeCourse = (id: string) => setCourses(prev => prev.filter(c => c.id !== id))

  const filtered = allRecipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Toutes' || (r.tags || []).some((t: string) => t.toLowerCase().includes(filter.toLowerCase()))
    return matchSearch && matchFilter
  })

  /* Nutrition data */
  const nutrition = { cal: 1842, calTarget: 2200, prot: 138, protTarget: 160, carbs: 196, carbsTarget: 220, fat: 52, fatTarget: 70 }
  const totalMacrosG = nutrition.prot + nutrition.carbs + nutrition.fat
  const donutSlices = [
    { pct: Math.round((nutrition.prot  / totalMacrosG) * 100), color: TEAL   },
    { pct: Math.round((nutrition.carbs / totalMacrosG) * 100), color: ORANGE },
    { pct: Math.round((nutrition.fat   / totalMacrosG) * 100), color: WHEAT  },
  ]

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`
        .rec-card:hover  { opacity: .92; transform: translateY(-1px); transition: .15s; }
        .rec-filter:hover{ opacity: .8; }
        .rec-row:hover   { background: rgba(240,228,204,0.06) !important; }
        .rec-btn:hover   { opacity: .85; }
      `}</style>

      {/* ══════════════════════════════════════════
          GRID — 4 cols × 5 rows
      ══════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '300px 300px 500px 400px 260px',
        gap: 10,
      }}>

        {/* ── R1 C1-2 : HERO ────────────────────────────── */}
        <div style={{ gridColumn: 'span 2', padding: '26px 28px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          {/* Title */}
          <div>
            <p style={{ ...DF, fontSize: 46, fontWeight: 900, color: ORANGE, lineHeight: 0.92, marginBottom: 6 }}>RECETTES.</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
              Suivi · Planification · Mes recettes · Découverte
            </p>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <button className="rec-btn" onClick={() => router.push('/recettes/new')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                  background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                <Plus size={11} /> Nouvelle recette
              </button>
              <button className="rec-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                  background: TEAL_BG, color: WHEAT, ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                <Zap size={11} /> Générer un repas
              </button>
            </div>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 38,
              borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 12 }}>
              <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Chercher une recette…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
            </div>
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_FILTERS.map(f => (
              <button key={f} className="rec-filter" onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', ...DF, fontSize: 10, fontWeight: 700,
                  background: filter === f ? ORANGE : 'var(--bg-card)',
                  color:      filter === f ? '#fff'  : 'var(--text-muted)',
                  outline:    filter === f ? 'none'  : '1px solid var(--border)',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── R1 C3-4 : APPORTS NUTRITIONNELS ─────────────── */}
        <div style={{ ...orangeCard(), gridColumn: 'span 2', padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ ...lbl('#1A0A0A') }}>Apports nutritionnels aujourd&apos;hui</p>

          {/* Big calorie number */}
          <div>
            <p style={{ ...DF, fontSize: 52, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>{nutrition.cal}</p>
            <p style={{ fontSize: 12, color: 'rgba(26,10,10,0.55)', marginBottom: 14 }}>/ {nutrition.calTarget} kcal objectif</p>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.15)', overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'rgba(26,10,10,0.55)', width: `${Math.min(100, nutrition.cal / nutrition.calTarget * 100)}%` }} />
            </div>
          </div>

          {/* 3 macros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { l: 'Protéines', v: nutrition.prot,  t: nutrition.protTarget,  unit: 'g', color: 'rgba(26,10,10,0.75)' },
              { l: 'Glucides',  v: nutrition.carbs,  t: nutrition.carbsTarget, unit: 'g', color: 'rgba(26,10,10,0.75)' },
              { l: 'Lipides',   v: nutrition.fat,    t: nutrition.fatTarget,   unit: 'g', color: 'rgba(26,10,10,0.75)' },
            ].map(m => (
              <div key={m.l} style={{ background: 'rgba(26,10,10,0.12)', borderRadius: 10, padding: '12px 10px' }}>
                <p style={{ fontSize: 8, color: 'rgba(26,10,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{m.l}</p>
                <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>{m.v}<span style={{ fontSize: 10 }}>{m.unit}</span></p>
                <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.45)', marginTop: 2 }}>/ {m.t}{m.unit}</p>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.15)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'rgba(26,10,10,0.45)', width: `${Math.min(100, m.v / m.t * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── R2 C1-4 : RECETTES RÉCENTES ──────────────────── */}
        {filtered.slice(0, 4).map((r, i) => {
          const isDbRecipe = recipes.some(rec => rec.id === r.id)
          const handleDelete = async (e: React.MouseEvent) => {
            e.stopPropagation()
            if (!confirm('Supprimer cette recette?')) return
            await supabase.from('recipes').delete().eq('id', r.id)
            router.refresh()
          }
          return (
          <div key={r.id} className="rec-card" onClick={() => router.push(`/recettes/${r.id}`)}
            style={{ ...card(), cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, position: 'relative' }}>
            {/* Fav + Delete */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
              {r.fav && <Star size={12} fill={ORANGE} color={ORANGE} />}
              {isDbRecipe && (
                <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 0 }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {/* Emoji + time */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 38 }}>{r.emoji}</span>
              <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
                background: 'rgba(242,84,45,0.12)', color: ORANGE }}>{r.time} min</span>
            </div>
            {/* Name */}
            <p style={{ ...DF, fontWeight: 800, fontSize: 13, color: WHEAT, lineHeight: 1.3, marginBottom: 8, flex: 1 }}>{r.name}</p>
            {/* Tags */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {r.tags.map((tag: string) => (
                <span key={tag} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(14,149,148,0.12)', color: TEAL, ...DF, fontWeight: 700 }}>{tag}</span>
              ))}
            </div>
            {/* Macros */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, color: ORANGE, ...DF, fontWeight: 700 }}>
                <Flame size={9} style={{ display: 'inline', marginRight: 2 }} />{r.cal} kcal
              </span>
              <span style={{ fontSize: 10, color: TEAL, ...DF, fontWeight: 700 }}>P {r.prot}g</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>G {r.carbs}g</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>L {r.fat}g</span>
            </div>
          </div>
        )
        })}

        {/* ── R3 C1-2 : PLANIFICATION DES REPAS ───────────── */}
        <div style={{ ...darkCard(), gridColumn: 'span 2', padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <p style={{ ...lbl('rgba(255,255,255,0.5)') }}>Planification des repas</p>
            <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', ...DF, fontWeight: 700 }}>
              Semaine en cours
            </span>
          </div>

          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', fontSize: 8, color: 'rgba(255,255,255,0.25)', ...DF, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', width: 70 }}>
                    Repas
                  </th>
                  {DAYS.map(d => (
                    <th key={d} style={{ padding: '6px 4px', fontSize: 8, color: 'rgba(255,255,255,0.3)', ...DF, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEALS.map(meal => (
                  <tr key={meal}>
                    <td style={{ padding: '8px 8px', fontSize: 9, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.04)', ...DF, fontWeight: 700 }}>
                      {meal}
                    </td>
                    {DAYS.map(day => {
                      const key = `${day}-${meal}`
                      const entry = mealPlan[key]
                      return (
                        <td key={day} style={{ padding: '4px 3px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                          {entry ? (
                            <button onClick={() => setSelectedMealSlot({day, meal})} style={{ background: 'rgba(14,149,148,0.15)', borderRadius: 5,
                              padding: '4px 3px', fontSize: 8, color: '#0E9594', ...DF, fontWeight: 700,
                              lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', border: 'none', cursor: 'pointer' }}>
                              {entry}
                            </button>
                          ) : (
                            <button onClick={() => setSelectedMealSlot({day, meal})} style={{ fontSize: 14, color: 'rgba(255,255,255,0.12)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>+</button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0 0', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>GÉNÉRER UN PLAN AUTO</span>
            <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </button>
        </div>

        {/* ── R3 C3-4 : CATÉGORIES + ACTIONS RAPIDES ──────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Catégories */}
          <div>
            <p style={{ ...lbl('rgba(240,228,204,0.55)'), marginBottom: 12 }}>Catégories</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.name} style={{ position: 'relative' }}>
                  <button className="rec-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 8, background: 'rgba(240,228,204,0.05)',
                      border: 'none', cursor: 'pointer', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'rgba(240,228,204,0.8)' }}>{cat.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT }}>{cat.count} recettes</span>
                      <button onClick={(e) => { e.stopPropagation(); setCatMenu(catMenu === cat.name ? null : cat.name) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(240,228,204,0.5)' }}>
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  </button>
                  {catMenu === cat.name && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#16162A', border: '1px solid rgba(240,228,204,0.1)', borderRadius: 8, zIndex: 10 }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(240,228,204,0.7)', fontSize: 11, borderBottom: '1px solid rgba(240,228,204,0.06)' }}>
                        ✏️ Éditer
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#F2542D', fontSize: 11 }}>
                        🗑️ Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{ marginTop: 'auto' }}>
            <p style={{ ...lbl('rgba(240,228,204,0.55)'), marginBottom: 10 }}>Actions rapides</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { l: '+ Recette', bg: ORANGE, color: '#fff' },
                { l: 'Importer', bg: 'rgba(240,228,204,0.1)', color: WHEAT },
                { l: 'Favoris', bg: 'rgba(240,228,204,0.1)', color: WHEAT },
                { l: 'Exporter', bg: 'rgba(240,228,204,0.1)', color: WHEAT },
              ].map(a => (
                <button key={a.l} className="rec-btn"
                  style={{ padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: a.bg, color: a.color, ...DF, fontWeight: 800, fontSize: 11 }}>
                  {a.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── R4 C1 : INGRÉDIENTS À UTILISER ─────────────── */}
        <div style={{ ...tealCard(), padding: 22, display: 'flex', flexDirection: 'column' }}>
          <p style={{ ...lbl('rgba(240,228,204,0.55)'), marginBottom: 14 }}>Ingrédients à utiliser</p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {INGREDIENTS.map(ing => (
              <div key={ing.name} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, background: 'rgba(240,228,204,0.06)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ing.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(240,228,204,0.85)' }}>{ing.name}</span>
                <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: 'rgba(240,228,204,0.5)' }}>{ing.qty}</span>
              </div>
            ))}
          </div>
          <button className="rec-btn" style={{ marginTop: 14, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'rgba(240,228,204,0.1)', color: WHEAT, ...DF, fontWeight: 700, fontSize: 10 }}>
            + Ajouter un ingrédient
          </button>
        </div>

        {/* ── R4 C2 : LISTE DE COURSES ─────────────────────── */}
        <div style={{ ...orangeCard(), padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ ...lbl('#1A0A0A') }}>Liste de courses</p>
            <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(26,10,10,0.15)', color: '#1A0A0A' }}>
              {courses.filter(c => c.done).length}/{courses.length}
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
            {courses.length > 0 ? courses.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: c.done ? 'rgba(26,10,10,0.08)' : 'rgba(26,10,10,0.12)' }}>
                <button onClick={() => toggleCourse(c.id)}
                  style={{ width: 18, height: 18, borderRadius: 4, border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.done ? 'rgba(26,10,10,0.4)' : 'rgba(26,10,10,0.15)' }}>
                  {c.done && <Check size={11} color="#1A0A0A" />}
                </button>
                <span style={{ flex: 1, fontSize: 11, color: c.done ? 'rgba(26,10,10,0.45)' : '#1A0A0A',
                  textDecoration: c.done ? 'line-through' : 'none' }}>{c.item}</span>
                {c.qty && <span style={{ ...DF, fontSize: 9, fontWeight: 700, color: 'rgba(26,10,10,0.5)' }}>{c.qty}</span>}
                <button onClick={() => removeCourse(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                  <X size={10} color="rgba(26,10,10,0.35)" />
                </button>
              </div>
            )) : (
              <p style={{ fontSize: 11, color: 'rgba(26,10,10,0.45)', textAlign: 'center', paddingTop: 20 }}>Aucun article pour le moment</p>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(26,10,10,0.1)' }}>
            {showAddItem ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCourse()}
                  placeholder="Nouvel article…" autoFocus
                  style={{ flex: 1, background: 'rgba(26,10,10,0.15)', border: '1px solid rgba(26,10,10,0.25)',
                    borderRadius: 7, padding: '7px 10px', color: '#1A0A0A', fontSize: 11, outline: 'none' }} />
                <button onClick={addCourse}
                  style={{ background: 'rgba(26,10,10,0.3)', border: 'none', borderRadius: 7, padding: '0 10px', cursor: 'pointer' }}>
                  <Check size={12} color="#1A0A0A" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddItem(true)} className="rec-btn"
                style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: 'rgba(26,10,10,0.15)', color: '#1A0A0A', ...DF, fontWeight: 700, fontSize: 10 }}>
                + Ajouter un article
              </button>
            )}
          </div>
        </div>

        {/* ── R4 C3-4 : MES RECETTES ───────────────────────── */}
        <div style={{ ...darkCard(), gridColumn: 'span 2', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...lbl('rgba(255,255,255,0.4)') }}>Mes recettes</p>
            <button onClick={() => router.push('/recettes/toutes')} style={{ ...DF, fontSize: 9, fontWeight: 800, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer' }}>
              VOIR TOUT
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {SAMPLE_RECIPES.map(r => (
              <div key={r.id} className="rec-row"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{r.name}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: ORANGE }}>{r.cal} kcal</span>
                    <span style={{ fontSize: 9, color: TEAL }}>P {r.prot}g</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{r.time}min</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {r.tags.slice(0, 1).map((tag: string) => (
                    <span key={tag} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(14,149,148,0.15)', color: TEAL, ...DF, fontWeight: 700 }}>{tag}</span>
                  ))}
                  {r.fav && <Star size={10} fill={ORANGE} color={ORANGE} />}
                </div>
              </div>
            ))}
          </div>

          {/* Résumé nutritionnel */}
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: `rgba(14,149,148,0.1)`, border: `1px solid rgba(14,149,148,0.2)` }}>
            <p style={{ fontSize: 9, color: TEAL, ...DF, fontWeight: 700, marginBottom: 5 }}>RÉSUMÉ SEMAINE</p>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { l: 'Moy. cal.', v: '1 842 kcal' },
                { l: 'Recettes',  v: '4 utilisées' },
                { l: 'Objectif',  v: '94% atteint' },
              ].map(s => (
                <div key={s.l}>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</p>
                  <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: '#fff' }}>{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── R5 FULL WIDTH : RÉPARTITION NUTRITIONNELLE ───── */}
        <div style={{ ...tealCard(), gridColumn: 'span 4', padding: '24px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <p style={{ ...lbl('rgba(240,228,204,0.55)') }}>Répartition nutritionnelle</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Aujourd\'hui', 'Semaine', 'Mois'].map((p, i) => (
                <button key={p} className="rec-filter"
                  style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', ...DF, fontSize: 9, fontWeight: 700,
                    background: i === 0 ? 'rgba(240,228,204,0.2)' : 'rgba(240,228,204,0.06)',
                    color: i === 0 ? WHEAT : 'rgba(240,228,204,0.4)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 30, alignItems: 'center', flex: 1 }}>
            {/* Donut */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutChart slices={donutSlices} size={120} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{totalMacrosG}</p>
                <p style={{ fontSize: 7, color: 'rgba(240,228,204,0.4)', letterSpacing: '0.1em' }}>GRAMMES</p>
              </div>
            </div>

            {/* Macro bars */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { l: 'Protéines', v: nutrition.prot,  t: nutrition.protTarget,  unit: 'g', color: TEAL,   pct: donutSlices[0].pct },
                { l: 'Glucides',  v: nutrition.carbs,  t: nutrition.carbsTarget, unit: 'g', color: ORANGE, pct: donutSlices[1].pct },
                { l: 'Lipides',   v: nutrition.fat,    t: nutrition.fatTarget,   unit: 'g', color: WHEAT,  pct: donutSlices[2].pct },
              ].map(m => (
                <div key={m.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                      <span style={{ fontSize: 11, color: 'rgba(240,228,204,0.7)' }}>{m.l}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT }}>{m.v}{m.unit}</span>
                      <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.35)' }}>/ {m.t}{m.unit}</span>
                      <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: m.color, minWidth: 32, textAlign: 'right' }}>{m.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'rgba(240,228,204,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, m.v / m.t * 100)}%`, borderRadius: 99, background: m.color, transition: 'width .5s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Weekly breakdown bars */}
            <div style={{ flexShrink: 0, width: 280 }}>
              <p style={{ fontSize: 8, color: 'rgba(240,228,204,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Calories / jour (semaine)</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                {[
                  { d: 'L', cal: 1920 }, { d: 'M', cal: 2100 }, { d: 'M', cal: 1750 },
                  { d: 'J', cal: 2200 }, { d: 'V', cal: 1842 }, { d: 'S', cal: 0 }, { d: 'D', cal: 0 },
                ].map((day, i) => {
                  const maxCal = 2200
                  const h = day.cal > 0 ? Math.max(6, (day.cal / maxCal) * 70) : 4
                  const isToday = i === 4
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      {day.cal > 0 && (
                        <span style={{ fontSize: 7, color: isToday ? ORANGE : 'rgba(240,228,204,0.5)', ...DF, fontWeight: 700 }}>
                          {Math.round(day.cal / 100) * 100}
                        </span>
                      )}
                      <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0',
                        background: day.cal > 0 ? (isToday ? ORANGE : 'rgba(240,228,204,0.3)') : 'rgba(240,228,204,0.06)' }} />
                      <span style={{ fontSize: 8, color: isToday ? ORANGE : 'rgba(240,228,204,0.4)', ...DF, fontWeight: isToday ? 800 : 600 }}>{day.d}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* KPIs rapides */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { l: 'Indice qualité',  v: '84/100', color: TEAL   },
                { l: 'Balance',         v: '+150 kcal', color: ORANGE },
                { l: 'Hydratation',     v: '1.75 L',  color: '#3B82F6' },
              ].map(kpi => (
                <div key={kpi.l} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(240,228,204,0.06)', minWidth: 110 }}>
                  <p style={{ fontSize: 8, color: 'rgba(240,228,204,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{kpi.l}</p>
                  <p style={{ ...DF, fontSize: 15, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Sélection de repas */}
      {selectedMealSlot && (
        <div onClick={() => setSelectedMealSlot(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#16162A', borderRadius: 16, padding: 24, maxWidth: 400, maxHeight: 600, overflowY: 'auto', border: '1px solid rgba(240,228,204,0.1)' }}>
            <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: ORANGE, marginBottom: 16 }}>{selectedMealSlot.day} - {selectedMealSlot.meal}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(r => (
                <button key={r.id} onClick={() => {
                  setMealPlan(prev => ({ ...prev, [`${selectedMealSlot.day}-${selectedMealSlot.meal}`]: `${r.emoji} ${r.name.split(' ').slice(0,2).join(' ')}` }))
                  setSelectedMealSlot(null)
                }} style={{ padding: '12px', textAlign: 'left', background: 'rgba(14,149,148,0.1)', border: '1px solid rgba(14,149,148,0.2)', borderRadius: 10, cursor: 'pointer', color: '#fff' }}>
                  <p style={{ fontSize: 12, fontWeight: 700 }}>{r.emoji} {r.name}</p>
                  <p style={{ fontSize: 9, color: 'rgba(240,228,204,0.6)', marginTop: 4 }}>{r.cal} kcal • {r.time} min</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
