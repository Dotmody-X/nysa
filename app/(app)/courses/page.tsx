'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Trash2, Search, ShoppingCart, Check, Loader2, Barcode,
  ChevronRight, Zap, Tag, Bell, Truck, Users, Star, TrendingDown,
  Package, AlertTriangle, MapPin, Calendar,
} from 'lucide-react'
import { useShoppingLists, useShoppingItems } from '@/hooks/useShoppingLists'
import { searchProducts, getProductByBarcode, guessCategory, OFFProduct } from '@/lib/openFoodFacts'

/* ─── Constants ──────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = '#0E9594'
const ORANGE  = '#F2542D'
const WHEAT   = '#F0E4CC'
const TEAL_BG = '#11686A'
const DARK    = '#16162A'

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtEur(n: number) { return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

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
  background: DARK, borderRadius: 12, overflow: 'hidden', ...extra,
})
const lbl = (color = ORANGE): React.CSSProperties => ({
  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
})

/* ─── Category colors ────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  'Fruits & Légumes': '#5B9F3A', 'fruits': '#5B9F3A',
  'Produits frais': ORANGE, 'frais': ORANGE,
  'Épicerie': WHEAT, 'épicerie': WHEAT,
  'Boissons': '#3B82F6', 'boissons': '#3B82F6',
  'Surgelés': '#60A5FA', 'surgelés': '#60A5FA',
  'Hygiène': '#A78BFA', 'hygiène': '#A78BFA',
  'Boulangerie': '#F59E0B', 'Snacks': '#EC4899',
}
function catColor(name: string): string {
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v
  }
  return TEAL
}

/* ─── NutriScore ─────────────────────────────────────────────── */
const NUTRI_COLORS: Record<string, string> = { a: '#1a9641', b: '#a6d96a', c: '#ffffbf', d: '#fdae61', e: '#d7191c' }
function NutriScore({ grade }: { grade: string | null }) {
  if (!grade) return null
  return (
    <span style={{ fontSize: 8, fontWeight: 900, padding: '1px 5px', borderRadius: 4,
      background: NUTRI_COLORS[grade.toLowerCase()] ?? '#888', color: '#fff', textTransform: 'uppercase' }}>
      {grade.toUpperCase()}
    </span>
  )
}

/* ─── Data: Recettes liées ───────────────────────────────────── */
const LINKED_RECIPES = [
  { id: '1', name: 'Poulet rôti aux légumes', when: "Aujourd'hui", missing: 3, emoji: '🍗', color: ORANGE },
  { id: '2', name: 'Salade quinoa avocat',    when: 'Demain',       missing: 2, emoji: '🥗', color: TEAL   },
  { id: '3', name: 'Pâtes au saumon épinards',when: 'Vendredi',     missing: 4, emoji: '🐟', color: WHEAT  },
]

/* ─── Data: Inventaire maison ────────────────────────────────── */
const INVENTAIRE = [
  { name: 'Riz basmati',  qty: '1 kg',   status: 'ok'     },
  { name: 'Œufs',         qty: 'x6',     status: 'ok'     },
  { name: 'Huile d\'olive',qty: '500 ml', status: 'low'    },
  { name: 'Lait',         qty: '1 L',    status: 'buy'    },
  { name: 'Beurre',       qty: '250 g',  status: 'ok'     },
]
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ok:  { label: 'Stock suffisant', color: '#5B9F3A' },
  low: { label: 'Stock faible',    color: ORANGE    },
  buy: { label: 'À racheter',      color: '#EF4444' },
}

/* ─── Data: Promotions ───────────────────────────────────────── */
const PROMOS = [
  { name: 'Tomates cerises', qty: '500 g', old: 2.39, price: 1.69, discount: -29, emoji: '🍅' },
  { name: 'Saumon frais',    qty: '200 g', old: 4.99, price: 3.49, discount: -30, emoji: '🐟' },
  { name: 'Café moulu',      qty: '250 g', old: 3.29, price: 2.59, discount: -21, emoji: '☕' },
]

/* ─── Data: Parcours magasin ─────────────────────────────────── */
const PARCOURS = [
  { num: 1, rayon: 'Fruits & Légumes', count: 8, color: '#5B9F3A' },
  { num: 2, rayon: 'Produits frais',   count: 5, color: ORANGE    },
  { num: 3, rayon: 'Épicerie salée',   count: 6, color: WHEAT     },
  { num: 4, rayon: 'Épicerie sucrée',  count: 2, color: '#F59E0B' },
  { num: 5, rayon: 'Boissons',         count: 2, color: '#3B82F6' },
]

/* ─── Data: Dépenses semaine ─────────────────────────────────── */
const WEEK_SPEND = [
  { d: 'Lun', v: 28 }, { d: 'Mar', v: 45 }, { d: 'Mer', v: 32 },
  { d: 'Jeu', v: 86.45, today: true }, { d: 'Ven', v: 0 }, { d: 'Sam', v: 0 }, { d: 'Dim', v: 0 },
]

/* ─── Bar chart SVG ──────────────────────────────────────────── */
function WeekBars({ data }: { data: typeof WEEK_SPEND }) {
  const max = Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 90, width: '100%' }}>
      {data.map((d, i) => {
        const h = d.v > 0 ? Math.max(6, (d.v / max) * 80) : 4
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {d.v > 0 && <span style={{ fontSize: 8, color: d.today ? ORANGE : 'rgba(240,228,204,0.5)', ...DF, fontWeight: 700 }}>{d.today ? fmtEur(d.v) : `${d.v}€`}</span>}
            <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0',
              background: d.v > 0 ? (d.today ? ORANGE : 'rgba(240,228,204,0.25)') : 'rgba(240,228,204,0.06)' }} />
            <span style={{ fontSize: 8, ...DF, fontWeight: d.today ? 800 : 600, color: d.today ? ORANGE : 'rgba(240,228,204,0.4)' }}>{d.d}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function CoursesPage() {
  const router = useRouter()
  const { lists, loading: listsLoading, createList, deleteList, completeList } = useShoppingLists()
  const [activeListId, setActiveListId]   = useState<string | null>(null)
  const { items, loading: itemsLoading, addItem, toggleItem, removeItem, checkedCount, totalEstimated, byCategory } = useShoppingItems(activeListId)

  /* ── UI state ────────────────────────────────── */
  const [tab, setTab]               = useState<'liste' | 'rayon' | 'promos' | 'historique'>('liste')
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [showManual, setShowManual]   = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const [addingId, setAddingId]       = useState<string | null>(null)

  /* ── Manual add form ─────────────────────────── */
  const [manualName,  setManualName]  = useState('')
  const [manualQty,   setManualQty]   = useState('1')
  const [manualUnit,  setManualUnit]  = useState('')
  const [manualCat,   setManualCat]   = useState('')
  const [manualPrice, setManualPrice] = useState('')

  /* ── OFF search ──────────────────────────────── */
  const [query,      setQuery]      = useState('')
  const [barcode,    setBarcode]    = useState('')
  const [results,    setResults]    = useState<OFFProduct[]>([])
  const [searching,  setSearching]  = useState(false)
  const [searchTab,  setSearchTab]  = useState<'search' | 'barcode'>('search')
  const [showSearch, setShowSearch] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Budget ──────────────────────────────────── */
  const BUDGET_TARGET = 100
  const budgetPct = Math.min(100, (totalEstimated / BUDGET_TARGET) * 100)
  const savings = 18.30
  const lastWeekSpend = 98.85

  /* ── Auto-select first list ──────────────────── */
  useEffect(() => {
    if (!activeListId && lists.length > 0) setActiveListId(lists[0].id)
  }, [lists, activeListId])

  /* ── Debounced OFF search ────────────────────── */
  useEffect(() => {
    if (searchTab !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await searchProducts(query)
      setResults(res)
      setSearching(false)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, searchTab])

  async function handleBarcodeSearch() {
    if (!barcode.trim()) return
    setSearching(true)
    const p = await getProductByBarcode(barcode.trim())
    setResults(p ? [p] : [])
    setSearching(false)
  }

  async function handleAddProduct(product: OFFProduct) {
    if (!activeListId) return
    setAddingId(product.code)
    await addItem({
      name: product.product_name + (product.brands ? ` — ${product.brands}` : ''),
      quantity: 1,
      unit: product.quantity ?? '',
      category: guessCategory(product),
      barcode: product.code,
      product_id: product.code,
    })
    setAddingId(null)
    setResults([])
    setQuery('')
  }

  async function handleManualAdd() {
    if (!manualName.trim() || !activeListId) return
    await addItem({
      name: manualName.trim(),
      quantity: parseFloat(manualQty) || 1,
      unit: manualUnit || undefined,
      category: manualCat || undefined,
      price_estimated: manualPrice ? parseFloat(manualPrice) : undefined,
    })
    setManualName(''); setManualQty('1'); setManualUnit(''); setManualCat(''); setManualPrice('')
    setShowManual(false)
  }

  async function handleCreateList() {
    if (!newListName.trim()) return
    setCreatingList(true)
    const list = await createList(newListName.trim())
    if (list) { setActiveListId(list.id); setNewListName('') }
    setCreatingList(false)
    setShowNewList(false)
  }

  const activeList = lists.find(l => l.id === activeListId)
  const progress   = items.length > 0 ? (checkedCount / items.length) * 100 : 0
  const totalItems = items.length
  const totalRayons = Object.keys(byCategory).length

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '7px 11px', color: 'var(--text)', fontSize: 12, outline: 'none',
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <style>{`
        .crs-btn:hover   { opacity: .85; }
        .crs-row:hover   { background: rgba(255,255,255,0.04) !important; }
        .crs-item:hover  { background: var(--bg-card-hover) !important; }
        .crs-promo:hover { opacity: .9; transform: scale(1.01); transition: .12s; }
      `}</style>

      {/* ══════════════════════════════════════════
          HEADER — Hero + Budget + Économies
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px 220px', gap: 10, minHeight: 180 }}>

        {/* Hero */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ ...DF, fontSize: 46, fontWeight: 900, color: WHEAT, lineHeight: 0.92, marginBottom: 4 }}>COURSES.</p>
            <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: TEAL, letterSpacing: '0.08em', marginBottom: 6 }}>
              PLANIFIEZ. ACHETEZ. ÉCONOMISEZ.
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 340 }}>
              Gérez vos courses intelligemment, évitez le gaspillage et restez dans votre budget.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="crs-btn" onClick={() => setShowNewList(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
              <Plus size={11} /> Nouvelle liste
            </button>
            <button className="crs-btn" onClick={() => setShowSearch(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                background: TEAL_BG, color: WHEAT, ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
              <Search size={11} /> Rechercher
            </button>
            <button className="crs-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                background: 'var(--bg-card)', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 11, border: '1px solid var(--border)', cursor: 'pointer' }}>
              <Barcode size={11} /> Code-barres
            </button>
          </div>
        </div>

        {/* Budget panier */}
        <div style={{ ...orangeCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ ...lbl('#1A0A0A') }}>Budget panier</p>
            <ShoppingCart size={20} style={{ color: 'rgba(26,10,10,0.4)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.55)', marginBottom: 2 }}>Total estimé</p>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>
              {totalEstimated > 0 ? fmtEur(totalEstimated) : '86,45 €'}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.55)', marginTop: 2, marginBottom: 10 }}>
              Budget : {BUDGET_TARGET},00 €
            </p>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'rgba(26,10,10,0.65)', width: `${totalEstimated > 0 ? budgetPct : 86}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)' }}>{totalEstimated > 0 ? `${budgetPct.toFixed(0)}%` : '86%'}</span>
              <span style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)' }}>
                Reste : {totalEstimated > 0 ? fmtEur(Math.max(0, BUDGET_TARGET - totalEstimated)) : '13,55 €'}
              </span>
            </div>
          </div>
        </div>

        {/* Économies prévues */}
        <div style={{ ...tealCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ ...lbl('rgba(240,228,204,0.55)') }}>Économies prévues</p>
            <Tag size={18} style={{ color: 'rgba(240,228,204,0.3)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(240,228,204,0.45)', marginBottom: 2 }}>Cette semaine</p>
            <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{fmtEur(savings)}</p>
            <p style={{ fontSize: 10, color: 'rgba(240,228,204,0.45)', marginTop: 4 }}>vs. dépenses moyennes</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <TrendingDown size={12} style={{ color: WHEAT }} />
              <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT }}>+14%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          NEW LIST + SEARCH (inline forms, toggled)
      ══════════════════════════════════════════ */}
      {showNewList && (
        <div style={{ display: 'flex', gap: 8, padding: 14, ...card() }}>
          <input value={newListName} onChange={e => setNewListName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateList()}
            placeholder="Nom de la liste (ex: Semaine du 5 mai)…" autoFocus
            style={{ ...inp, flex: 1 }} />
          <button onClick={handleCreateList} disabled={creatingList}
            style={{ padding: '7px 16px', borderRadius: 8, background: ORANGE, color: '#fff', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {creatingList ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Créer
          </button>
          <button onClick={() => setShowNewList(false)}
            style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {showSearch && (
        <div style={{ ...card(), padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: results.length > 0 ? 10 : 0 }}>
            <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {(['search', 'barcode'] as const).map(t => (
                <button key={t} onClick={() => { setSearchTab(t); setResults([]) }}
                  style={{ padding: '7px 14px', background: searchTab === t ? ORANGE : 'var(--bg-input)', color: searchTab === t ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', ...DF, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t === 'search' ? <><Search size={10} /> Nom</> : <><Barcode size={10} /> Code-barres</>}
                </button>
              ))}
            </div>
            {searchTab === 'search' ? (
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Nutella, lait entier, saumon…" autoFocus
                  style={{ ...inp, flex: 1, paddingLeft: 30 }} />
              </div>
            ) : (
              <>
                <input value={barcode} onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                  placeholder="5449000000996" style={{ ...inp, flex: 1 }} />
                <button onClick={handleBarcodeSearch} style={{ padding: '7px 12px', borderRadius: 8, background: TEAL_BG, color: WHEAT, border: 'none', cursor: 'pointer' }}>
                  <Search size={12} />
                </button>
              </>
            )}
            {!activeListId && <span style={{ fontSize: 10, color: ORANGE, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><AlertTriangle size={10} /> Sélectionne une liste</span>}
            <button onClick={() => { setShowSearch(false); setResults([]); setQuery('') }} style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
          </div>
          {searching && <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>}
          {results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {results.map(product => (
                <div key={product.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  {product.image_front_small_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={product.image_front_small_url} alt={product.product_name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShoppingCart size={14} style={{ color: 'var(--text-muted)' }} /></div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: WHEAT, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.product_name}</p>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center' }}>
                      <NutriScore grade={product.nutriscore_grade} />
                      {product.quantity && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{product.quantity}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleAddProduct(product)} disabled={!activeListId || addingId === product.code}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: ORANGE, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !activeListId ? 0.4 : 1 }}>
                    {addingId === product.code ? <Loader2 size={9} className="animate-spin" style={{ color: '#fff' }} /> : <Plus size={9} style={{ color: '#fff' }} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TABS
      ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
        {([
          { k: 'liste',      l: 'Liste de courses' },
          { k: 'rayon',      l: 'Par rayon' },
          { k: 'promos',     l: 'Promotions' },
          { k: 'historique', l: 'Historique' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              ...DF, fontSize: 11, fontWeight: 800,
              color: tab === t.k ? ORANGE : 'var(--text-muted)',
              borderBottom: tab === t.k ? `2px solid ${ORANGE}` : '2px solid transparent',
              marginBottom: -2 }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT — 3 colonnes
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 260px', gap: 10 }}>

        {/* ── Col 1 : Liste de courses ─────────── */}
        <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ ...lbl() }}>Liste de courses</p>
              <span style={{ ...DF, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(242,84,45,0.12)', color: ORANGE }}>{totalItems} articles</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* List selector */}
              {lists.length > 0 && (
                <select value={activeListId ?? ''} onChange={e => setActiveListId(e.target.value)}
                  style={{ ...inp, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              <button onClick={() => setShowManual(v => !v)} className="crs-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', ...DF, fontWeight: 700 }}>
                <Plus size={10} /> Manuel
              </button>
              {activeListId && items.length > 0 && checkedCount === items.length && (
                <button onClick={() => { completeList(activeListId); setActiveListId(null) }} className="crs-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: TEAL_BG, border: 'none', color: WHEAT, fontSize: 10, cursor: 'pointer', ...DF, fontWeight: 700 }}>
                  <Check size={10} /> Terminer
                </button>
              )}
              {activeListId && (
                <button onClick={() => { deleteList(activeListId); setActiveListId(null) }}
                  style={{ padding: '5px 8px', borderRadius: 7, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', opacity: 0.4 }}>
                  <Trash2 size={10} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 0 && (
            <div style={{ height: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? TEAL : ORANGE, transition: 'width .5s' }} />
            </div>
          )}

          {/* Manual add form */}
          {showManual && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(242,84,45,0.04)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              <input value={manualName} onChange={e => setManualName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                placeholder="Nom de l'article *" autoFocus style={{ ...inp, flex: 1, minWidth: 140 }} />
              <input type="number" value={manualQty} onChange={e => setManualQty(e.target.value)} placeholder="Qté" style={{ ...inp, width: 60 }} />
              <input value={manualUnit} onChange={e => setManualUnit(e.target.value)} placeholder="Unité" style={{ ...inp, width: 70 }} />
              <input value={manualCat} onChange={e => setManualCat(e.target.value)} placeholder="Catégorie" style={{ ...inp, width: 110 }} />
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="Prix €" style={{ ...inp, width: 75 }} />
              <button onClick={handleManualAdd} style={{ padding: '7px 14px', borderRadius: 8, background: ORANGE, color: '#fff', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 11 }}>
                Ajouter
              </button>
            </div>
          )}

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!activeListId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 10 }}>
                <ShoppingCart size={28} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sélectionne ou crée une liste</p>
                <button onClick={() => setShowNewList(true)} style={{ ...DF, fontSize: 11, fontWeight: 700, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Créer une liste
                </button>
              </div>
            ) : itemsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : items.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: 8 }}>
                <ShoppingCart size={24} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Liste vide — ajoute des articles</p>
              </div>
            ) : (
              Object.entries(byCategory).map(([cat, catItems]) => (
                <div key={cat}>
                  <div style={{ padding: '8px 18px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: catColor(cat), flexShrink: 0 }} />
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: catColor(cat) }}>{cat}</p>
                  </div>
                  {catItems.map(item => (
                    <div key={item.id} className="crs-item"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                        borderBottom: '1px solid var(--border)', background: 'transparent', transition: 'background .12s' }}>
                      <button onClick={() => toggleItem(item.id, !item.is_checked)}
                        style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${item.is_checked ? TEAL : 'var(--border)'}`,
                          background: item.is_checked ? TEAL : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        {item.is_checked && <Check size={9} color="#fff" />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: item.is_checked ? 'var(--text-muted)' : WHEAT, textDecoration: item.is_checked ? 'line-through' : 'none' }}>
                          {item.name}
                        </p>
                        {(item.quantity || item.unit) && (
                          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                            {item.quantity ?? ''}{item.unit ? ` ${item.unit}` : ''}
                          </p>
                        )}
                      </div>
                      {item.price_estimated && (
                        <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT, flexShrink: 0 }}>{fmtEur(item.price_estimated)}</span>
                      )}
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.3, flexShrink: 0 }}>
                        <X size={11} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Add article footer */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setShowManual(true)} className="crs-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>
              <Plus size={12} style={{ color: TEAL }} /> Ajouter un article
            </button>
            <button onClick={() => setShowSearch(true)} className="crs-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: TEAL_BG, border: 'none', cursor: 'pointer' }}>
              <Plus size={12} style={{ color: WHEAT }} />
            </button>
          </div>
        </div>

        {/* ── Col 2 : Lié aux recettes ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...lbl(TEAL) }}>Lié aux recettes</p>
              <button onClick={() => router.push('/recettes')} style={{ fontSize: 9, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>
                Voir toutes
              </button>
            </div>
            {LINKED_RECIPES.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {r.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: WHEAT, lineHeight: 1.2 }}>{r.name}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{r.when}</p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 5,
                    background: `rgba(242,84,45,0.12)`, color: ORANGE }}>
                    {r.missing} manquants
                  </span>
                </div>
              </div>
            ))}
            {/* Articles manquants */}
            <div style={{ padding: '14px 16px', background: 'rgba(14,149,148,0.05)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <Star size={14} fill={ORANGE} color={ORANGE} />
                <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>9</p>
                <p style={{ fontSize: 8, color: 'var(--text-muted)' }}>manquants ajoutés</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8 }}>Articles manquants ajoutés à votre liste</p>
                <button className="crs-btn" style={{ width: '100%', padding: '7px', borderRadius: 8, background: TEAL_BG, border: 'none', cursor: 'pointer', color: WHEAT, ...DF, fontSize: 10, fontWeight: 700 }}>
                  Générer à nouveau
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Col 3 : Inventaire + Promotions ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Inventaire maison */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...lbl('rgba(255,255,255,0.5)') }}>Inventaire maison</p>
              <button style={{ fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>Gérer</button>
            </div>
            {INVENTAIRE.map(i => (
              <div key={i.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <Package size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: WHEAT }}>{i.name}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{i.qty}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_LABEL[i.status].color }} />
                  <span style={{ fontSize: 9, color: STATUS_LABEL[i.status].color }}>{STATUS_LABEL[i.status].label}</span>
                </div>
              </div>
            ))}
            <button className="crs-btn" onClick={() => router.push('/courses/inventaire')}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: TEAL, ...DF, fontWeight: 700 }}>
              Voir tout l'inventaire →
            </button>
          </div>

          {/* Promotions */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...lbl(ORANGE) }}>Promotions pour vous</p>
              <button style={{ fontSize: 9, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>Voir tout</button>
            </div>
            {PROMOS.map(p => (
              <div key={p.name} className="crs-promo"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: WHEAT }}>{p.name}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.qty}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{p.old.toFixed(2)} €</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT }}>{p.price.toFixed(2)} €</p>
                  <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: ORANGE, color: '#fff' }}>{p.discount}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECONDARY — Parcours + Dépenses + IA
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

        {/* Parcours magasin */}
        <div style={{ ...card(), padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ ...lbl('var(--text-muted)') }}>Parcours magasin recommandé</p>
            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 12 }}>Optimisé pour gagner du temps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Object.keys(byCategory).length > 0
              ? Object.entries(byCategory).map(([cat, catItems], i) => ({ num: i + 1, rayon: cat, count: catItems.length, color: catColor(cat) }))
              : PARCOURS
            ).map(r => (
              <div key={r.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ ...DF, fontSize: 9, fontWeight: 900, color: '#fff' }}>{r.num}</span>
                </div>
                {r.num < (Object.keys(byCategory).length > 0 ? Object.keys(byCategory).length : PARCOURS.length) && (
                  <div style={{ position: 'absolute', marginLeft: 10, marginTop: 22, width: 2, height: 8, background: 'var(--border)' }} />
                )}
                <span style={{ flex: 1, fontSize: 12, color: WHEAT }}>{r.rayon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.count} articles</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Estimation : ~28 min</span>
            </div>
            <button style={{ fontSize: 10, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>Voir le plan</button>
          </div>
        </div>

        {/* Évolution des dépenses */}
        <div style={{ ...darkCard(), padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ ...lbl('rgba(255,255,255,0.4)') }}>Évolution des dépenses</p>
            <select style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.4)', padding: '2px 6px', cursor: 'pointer', ...DF, fontWeight: 700 }}>
              <option>Cette semaine</option>
              <option>Ce mois</option>
            </select>
          </div>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Courses</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <p style={{ ...DF, fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {totalEstimated > 0 ? fmtEur(totalEstimated) : '86,45 €'}
            </p>
            <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: '#5B9F3A' }}>-12,40 €</span>
          </div>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>vs. semaine dernière</p>
          <WeekBars data={WEEK_SPEND} />
          <button style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,0.25)', ...DF, fontWeight: 700, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            onClick={() => router.push('/budget')}>
            Voir le rapport complet →
          </button>
        </div>

        {/* Agent IA */}
        <div style={{ ...tealCard(), padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Zap size={16} style={{ color: WHEAT, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ ...lbl('rgba(240,228,204,0.6)'), marginBottom: 4 }}>Agent IA courses</p>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(240,228,204,0.1)' }}>
                <p style={{ fontSize: 11, color: WHEAT, fontWeight: 600 }}>Bonne nouvelle !</p>
                <p style={{ fontSize: 10, color: 'rgba(240,228,204,0.7)', marginTop: 2 }}>
                  Vous pouvez économiser <span style={{ ...DF, fontWeight: 900, color: WHEAT }}>{fmtEur(savings)}</span> sur cette liste.
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { l: 'Remplacer Saumon par Maquereau', save: '-6,80 €' },
              { l: 'Marque distributeur disponible', save: '-5,20 €' },
              { l: 'Promo sur Tomates cerises',      save: '-2,10 €' },
            ].map(tip => (
              <div key={tip.l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(240,228,204,0.06)' }}>
                <Check size={11} style={{ color: TEAL, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 10, color: 'rgba(240,228,204,0.7)' }}>{tip.l}</span>
                <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: '#5B9F3A' }}>{tip.save}</span>
              </div>
            ))}
          </div>
          <button className="crs-btn" style={{ padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(240,228,204,0.15)', color: WHEAT, ...DF, fontWeight: 800, fontSize: 11, marginTop: 'auto' }}>
            Appliquer les optimisations
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PRÉPARATION & ORGANISATION
      ══════════════════════════════════════════ */}
      <div style={{ ...card() }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ ...lbl('var(--text-muted)') }}>Préparation &amp; Organisation</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            { icon: <Zap size={18} style={{ color: TEAL }} />, title: 'Meal Prep', desc: '3 recettes planifiées cette semaine', btn: 'Voir mes repas', onClick: () => router.push('/recettes') },
            { icon: <Users size={18} style={{ color: ORANGE }} />, title: 'Liste partagée', desc: 'Partagé avec 2 personnes', btn: 'Ouvrir la liste', onClick: () => {} },
            { icon: <Bell size={18} style={{ color: WHEAT }} />, title: 'Rappels', desc: '2 articles à racheter cette semaine', btn: 'Voir rappels', onClick: () => {} },
            { icon: <Truck size={18} style={{ color: '#3B82F6' }} />, title: 'Livraison', desc: 'Prochaine livraison Vendredi 18 mai - 18h', btn: 'Modifier', onClick: () => {} },
          ].map((s, i) => (
            <div key={s.title} style={{ padding: '18px 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ marginBottom: 10 }}>{s.icon}</div>
              <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT, marginBottom: 4 }}>{s.title}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{s.desc}</p>
              <button onClick={s.onClick} className="crs-btn"
                style={{ fontSize: 10, color: TEAL, background: 'none', border: `1px solid var(--border)`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', ...DF, fontWeight: 700 }}>
                {s.btn}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FOOTER — Astuce IA + Total + Valider
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'stretch' }}>
        {/* Astuce IA */}
        <div style={{ ...card({ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }) }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: TEAL_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={14} style={{ color: WHEAT }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ ...DF, fontSize: 10, fontWeight: 800, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Astuce de l'agent IA</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Achetez les produits frais en début de semaine pour éviter le gaspillage. Vos habitudes montrent que vous jetez 12% de produits frais par semaine.
            </p>
          </div>
          <button style={{ fontSize: 10, color: TEAL, background: 'none', border: '1px solid rgba(14,149,148,0.3)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', ...DF, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Voir mes habitudes
          </button>
        </div>

        {/* Total estimé + Valider */}
        <div style={{ ...card({ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24 }) }}>
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Total estimé</p>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>
              {totalEstimated > 0 ? fmtEur(totalEstimated) : '86,45 €'}
            </p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
              {totalItems > 0 ? totalItems : 23} articles &nbsp;·&nbsp; {totalRayons > 0 ? totalRayons : 5} rayons
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: ORANGE }}>
            <ShoppingCart size={18} style={{ color: '#fff' }} />
          </div>
          <button className="crs-btn" onClick={() => activeListId && completeList(activeListId)}
            style={{ padding: '14px 28px', borderRadius: 10, background: TEAL_BG, border: 'none', cursor: 'pointer', color: WHEAT, ...DF, fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap' }}>
            Valider ma liste
          </button>
        </div>
      </div>
    </div>
  )
}
