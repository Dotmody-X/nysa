'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Trash2, Search, ShoppingCart, Check, Loader2, Barcode,
  ChevronRight, Zap, Tag, Bell, Truck, Users, Star, TrendingDown,
  Package, AlertTriangle, MapPin, Calendar, Store, Navigation,
} from 'lucide-react'
import { PageEmpty } from '@/components/ui/PageEmpty'
import { isDemoModeDisabled } from '@/lib/demo-mode'
import { useShoppingLists, useShoppingItems } from '@/hooks/useShoppingLists'
import { useInventory } from '@/hooks/useInventory'
import { useMealPlan } from '@/hooks/useMealPlan'
import { createClient } from '@/lib/supabase/client'
import { searchProducts, getProductByBarcode, guessCategory, OFFProduct } from '@/lib/openFoodFacts'
import { getRecentDiscountedPrices, discountPct, type OpenPrice } from '@/lib/openPrices'
import { STORE_CHAINS, getChainById, mapCategoryToDepartment, type StoreChain, type SavedStore } from '@/lib/storeData'
import { CatalogPicker, type PickedItem } from '@/components/ui/CatalogPicker'
import { CATALOG_CATEGORIES } from '@/lib/catalogue'

/* ─── Constants ──────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = 'var(--azul)'
const ORANGE  = 'var(--accent-budget)'
const WHEAT   = 'var(--text)'
const TEAL_BG = 'var(--azul)'
const DARK    = 'var(--bg)'

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtEur(n: number) { return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

/* ─── Card helpers ───────────────────────────────────────────── */
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
})
const tealCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: TEAL_BG, borderRadius: 12, overflow: 'hidden',
  '--text-rgb': '245, 241, 237', '--text': '#f5f1ed', '--text-muted': 'rgba(245, 241, 237, 0.72)', ...extra,
} as React.CSSProperties)
const orangeCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: ORANGE, borderRadius: 12, overflow: 'hidden',
  '--text-rgb': '26, 10, 10', '--text': '#1a0a0a', '--text-muted': 'rgba(26, 10, 10, 0.65)', ...extra,
} as React.CSSProperties)
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

/* ─── Inventaire : libellés de statut (données via useInventory) ── */
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ok:  { label: 'Stock suffisant', color: '#5B9F3A' },
  low: { label: 'Stock faible',    color: ORANGE    },
  buy: { label: 'À racheter',      color: '#EF4444' },
}

/* ─── Fallback static promos (shown while loading or on error) ── */
const FALLBACK_PROMOS = [
  { product_name: 'Tomates cerises', price: 1.69, price_without_discount: 2.39, pct: -29, emoji: '🍅', currency: 'EUR' },
  { product_name: 'Saumon frais',    price: 3.49, price_without_discount: 4.99, pct: -30, emoji: '🐟', currency: 'EUR' },
  { product_name: 'Café moulu',      price: 2.59, price_without_discount: 3.29, pct: -21, emoji: '☕', currency: 'EUR' },
]

/* ─── Store Selector Modal ───────────────────────────────────── */
interface OSMStore { id: number; lat: number; lon: number; name: string; brand: string; address: string; city: string }

function StoreSelectorModal({
  current, onSelect, onClose,
}: {
  current: SavedStore | null
  onSelect: (s: SavedStore) => void
  onClose: () => void
}) {
  const DF2: React.CSSProperties = { fontFamily: 'var(--font-display)' }
  const [step, setStep]         = useState<'chain' | 'location'>('chain')
  const [selectedChain, setSelectedChain] = useState<StoreChain | null>(null)
  const [city, setCity]         = useState('')
  const [searching, setSearching] = useState(false)
  const [nearbyStores, setNearbyStores] = useState<OSMStore[]>([])
  const [error, setError]       = useState('')

  async function handleSearch() {
    if (!city.trim() || !selectedChain) return
    setSearching(true); setError(''); setNearbyStores([])
    try {
      // 1. Geocode the city
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(city)}`)
      const geoData = await geoRes.json()
      if (!geoData?.[0]) { setError('Ville introuvable'); setSearching(false); return }
      const { lat, lon } = { lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon) }

      // 2. Find nearby stores
      const storeRes = await fetch(`/api/stores?lat=${lat}&lon=${lon}&radius=8000&brand=${encodeURIComponent(selectedChain.osmBrand)}`)
      const storeData: OSMStore[] = await storeRes.json()
      setNearbyStores(storeData.slice(0, 10))
      if (storeData.length === 0) setError(`Aucun ${selectedChain.name} trouvé dans un rayon de 8 km`)
    } catch { setError('Erreur de recherche, réessaie.') }
    setSearching(false)
  }

  function selectStore(store: OSMStore) {
    if (!selectedChain) return
    onSelect({ chainId: selectedChain.id, osmId: store.id, name: store.name || selectedChain.name, city: store.city || city, address: store.address, lat: store.lat, lon: store.lon })
  }

  function selectChainOnly() {
    if (!selectedChain) return
    onSelect({ chainId: selectedChain.id, name: selectedChain.name, city })
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', width: 560, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ ...DF2, fontSize: 15, fontWeight: 900, color: WHEAT }}>Mon magasin préféré</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Le parcours s'adapte automatiquement à votre enseigne</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step 1: Chain picker */}
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              1 · Choisissez votre enseigne
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {STORE_CHAINS.map(chain => (
                <button key={chain.id} onClick={() => setSelectedChain(chain)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
                    border: `2px solid ${selectedChain?.id === chain.id ? chain.color : 'var(--border)'}`,
                    background: selectedChain?.id === chain.id ? `${chain.color}18` : 'var(--bg-input)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: chain.color, flexShrink: 0 }} />
                  <span style={{ ...DF2, fontSize: 11, fontWeight: 700, color: WHEAT }}>{chain.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: City search */}
          {selectedChain && (
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                2 · Trouvez votre magasin (optionnel)
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={city} onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={`Ville ou commune (ex: Ixelles, Bruxelles…)`}
                  style={{ ...inp, flex: 1 }} />
                <button onClick={handleSearch} disabled={searching || !city.trim()}
                  style={{ padding: '8px 14px', borderRadius: 8, background: TEAL_BG, color: 'var(--creamy-ivory)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: !city.trim() ? 0.5 : 1 }}>
                  {searching ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  <span style={{ ...DF2, fontSize: 11, fontWeight: 700 }}>Chercher</span>
                </button>
              </div>
              {error && <p style={{ fontSize: 10, color: ORANGE, marginTop: 6 }}>⚠ {error}</p>}

              {/* Nearby stores results */}
              {nearbyStores.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {nearbyStores.map(store => (
                    <button key={store.id} onClick={() => selectStore(store)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                        background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                      <MapPin size={14} style={{ color: selectedChain.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ ...DF2, fontSize: 12, fontWeight: 700, color: WHEAT }}>{store.name || selectedChain.name}</p>
                        {store.address && <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{store.address}</p>}
                      </div>
                      <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedChain && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', ...DF2, fontWeight: 700, fontSize: 12 }}>
              Annuler
            </button>
            <button onClick={selectChainOnly}
              style={{ flex: 2, padding: '10px', borderRadius: 9, background: selectedChain.color, border: 'none', color: '#fff', cursor: 'pointer', ...DF2, fontWeight: 900, fontSize: 12 }}>
              Utiliser {selectedChain.name} {city ? `— ${city}` : '(sans localisation)'}
            </button>
          </div>
        )}
      </div>
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

  /* ── Interconnexions : inventaire maison + recettes du jour ── */
  const { items: inventory, toBuy, hydrated: inventoryHydrated } = useInventory()
  const { todayRecipes } = useMealPlan()

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
  const [manualBarcode, setManualBarcode] = useState('')

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

  /* ── Preferred store ─────────────────────────── */
  const [preferredStore, setPreferredStore] = useState<SavedStore | null>(null)
  const [showStoreSelector, setShowStoreSelector] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('nysa_preferred_store')
      if (s) setPreferredStore(JSON.parse(s))
    } catch {}
  }, [])

  function saveStore(store: SavedStore) {
    setPreferredStore(store)
    localStorage.setItem('nysa_preferred_store', JSON.stringify(store))
    setShowStoreSelector(false)
  }

  /* ── Live promotions (Open Prices API) ───────── */
  const [livePromos, setLivePromos]       = useState<OpenPrice[]>([])
  const [loadingPromos, setLoadingPromos] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchPromos() {
      setLoadingPromos(true)
      const data = await getRecentDiscountedPrices(6)
      if (!cancelled) {
        setLivePromos(data.filter(p => p.price_without_discount != null && p.price_without_discount > 0))
        setLoadingPromos(false)
      }
    }
    fetchPromos()
    return () => { cancelled = true }
  }, [])

  /* ── Parcours based on selected store chain ──── */
  const activeChain = preferredStore ? getChainById(preferredStore.chainId) : null

  function buildParcours() {
    const cats = Object.keys(byCategory)
    if (cats.length === 0) return null   // will use default static list

    if (activeChain) {
      // Map each category to chain department + sort by chain dept order
      const mapped = cats.map(cat => {
        const { dept, order } = mapCategoryToDepartment(cat, activeChain)
        return { rayon: dept, origCat: cat, count: byCategory[cat].length, order, color: catColor(cat) }
      })
      // Merge categories that map to same department
      const merged = mapped.reduce((acc, m) => {
        const ex = acc.find(a => a.rayon === m.rayon)
        if (ex) { ex.count += m.count } else acc.push({ ...m })
        return acc
      }, [] as typeof mapped)
      return merged.sort((a, b) => a.order - b.order).map((r, i) => ({ ...r, num: i + 1 }))
    }

    // No chain selected: use raw categories from list
    return cats.map((cat, i) => ({
      num: i + 1, rayon: cat, count: byCategory[cat].length, order: i, color: catColor(cat), origCat: cat,
    }))
  }

  const parcours = buildParcours()
  // Économies réelles : somme des remises des promos live. 0 si aucune promo.
  const savings = livePromos.reduce((s, p) => s + (p.price_without_discount ? p.price_without_discount - p.price : 0), 0)

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

  function handleManualPick(item: PickedItem) {
    setManualName(item.name)
    if (item.category) setManualCat(item.category)
    if (item.unit) setManualUnit(item.unit)
    if (item.barcode) setManualBarcode(item.barcode)
  }

  async function handleManualAdd() {
    if (!manualName.trim() || !activeListId) return
    await addItem({
      name: manualName.trim(),
      quantity: parseFloat(manualQty) || 1,
      unit: manualUnit || undefined,
      category: manualCat || undefined,
      price_estimated: manualPrice ? parseFloat(manualPrice) : undefined,
      barcode: manualBarcode || undefined,
      product_id: manualBarcode || undefined,
    })
    setManualName(''); setManualQty('1'); setManualUnit(''); setManualCat(''); setManualPrice(''); setManualBarcode('')
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

  /* ── Gating démo : page vide tant qu'aucune liste n'existe ── */
  const noDemoMode = isDemoModeDisabled()
  const hasData = lists.length > 0

  /* ── Interconnexion Inventaire → Courses ── */
  const [pushingInventory, setPushingInventory] = useState(false)
  async function addInventoryToBuy() {
    if (!activeListId || toBuy.length === 0) return
    setPushingInventory(true)
    for (const i of toBuy) {
      await addItem({
        name: i.name,
        quantity: 1,
        unit: i.minQty || i.qty || undefined,
        category: i.category || undefined,
      })
    }
    setPushingInventory(false)
  }

  /* ── Interconnexion Courses → Budget ── */
  const [savingExpense, setSavingExpense] = useState(false)
  const [expenseSaved, setExpenseSaved] = useState(false)
  async function saveAsExpense() {
    if (totalEstimated <= 0 || !activeList) return
    setSavingExpense(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: totalEstimated,
        type: 'expense',
        description: 'Courses — ' + activeList.name,
        date: new Date().toISOString().slice(0, 10),
      })
      setExpenseSaved(true)
    }
    setSavingExpense(false)
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '7px 11px', color: 'var(--text)', fontSize: 12, outline: 'none',
  }

  /* ── État vide : aucune liste (après chargement) ── */
  if (noDemoMode && !listsLoading && !hasData) {
    return (
      <div style={{ padding: 30, minHeight: '100%' }}>
        <PageEmpty
          icon="🛒"
          title="Aucune liste de courses"
          description="Crée ta première liste pour commencer."
          actionLabel="Nouvelle liste"
          actionOnClick={() => createList('Ma liste')}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {/* ── Store Selector Modal ─────────────────── */}
      {showStoreSelector && (
        <StoreSelectorModal
          current={preferredStore}
          onSelect={saveStore}
          onClose={() => setShowStoreSelector(false)}
        />
      )}

      <style>{`
        .crs-btn:hover   { opacity: .85; }
        .crs-row:hover   { background: rgba(var(--text-rgb),0.04) !important; }
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
                background: TEAL_BG, color: 'var(--creamy-ivory)', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
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
              {fmtEur(totalEstimated)}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.55)', marginTop: 2, marginBottom: 10 }}>
              Budget : {BUDGET_TARGET},00 €
            </p>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'rgba(26,10,10,0.65)', width: `${budgetPct}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)' }}>{budgetPct.toFixed(0)}%</span>
              <span style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)' }}>
                Reste : {fmtEur(Math.max(0, BUDGET_TARGET - totalEstimated))}
              </span>
            </div>
          </div>
        </div>

        {/* Économies prévues */}
        <div style={{ ...tealCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ ...lbl('rgba(var(--text-rgb),0.55)') }}>Économies prévues</p>
            <Tag size={18} style={{ color: 'rgba(var(--text-rgb),0.3)' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.45)', marginBottom: 2 }}>Cette semaine</p>
            {savings > 0 ? (
              <>
                <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{fmtEur(savings)}</p>
                <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.45)', marginTop: 4 }}>via les promotions du jour</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <TrendingDown size={12} style={{ color: WHEAT }} />
                  <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT }}>{livePromos.length} promo{livePromos.length > 1 ? 's' : ''}</span>
                </div>
              </>
            ) : (
              <>
                <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>—</p>
                <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.45)', marginTop: 4 }}>Aucune donnée pour le moment</p>
              </>
            )}
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
                <button onClick={handleBarcodeSearch} style={{ padding: '7px 12px', borderRadius: 8, background: TEAL_BG, color: 'var(--creamy-ivory)', border: 'none', cursor: 'pointer' }}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: TEAL_BG, border: 'none', color: 'var(--creamy-ivory)', fontSize: 10, cursor: 'pointer', ...DF, fontWeight: 700 }}>
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
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(242,84,45,0.04)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 30, overflow: 'visible' }}>
              <div style={{ flex: 1, minWidth: 140, position: 'relative', zIndex: 31 }}>
                <CatalogPicker
                  query={manualName}
                  onQueryChange={setManualName}
                  onSelect={handleManualPick}
                  placeholder="Nom de l'article *"
                  autoFocus
                />
              </div>
              <input type="number" value={manualQty} onChange={e => setManualQty(e.target.value)} placeholder="Qté" style={{ ...inp, width: 60 }} />
              <input value={manualUnit} onChange={e => setManualUnit(e.target.value)} placeholder="Unité" style={{ ...inp, width: 70 }} />
              <select value={manualCat} onChange={e => setManualCat(e.target.value)} style={{ ...inp, width: 130, cursor: 'pointer' }}>
                <option value="">Catégorie</option>
                {CATALOG_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                {manualCat && !CATALOG_CATEGORIES.some(c => c.name === manualCat) && (
                  <option value={manualCat}>{manualCat}</option>
                )}
              </select>
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
            {todayRecipes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', textAlign: 'center' }}>
                <Star size={20} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Aucune recette planifiée aujourd'hui</p>
                <button onClick={() => router.push('/recettes')} style={{ ...DF, fontSize: 10, fontWeight: 700, color: TEAL, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Planifier des repas →
                </button>
              </div>
            ) : (
              todayRecipes.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {r.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ShoppingCart size={18} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: WHEAT, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.servings} portion{r.servings > 1 ? 's' : ''}{r.prep_time ? ` · ${r.prep_time} min` : ''}
                    </p>
                  </div>
                  {r.ingredients && r.ingredients.length > 0 && (
                    <div style={{ flexShrink: 0 }}>
                      <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 5,
                        background: `rgba(242,84,45,0.12)`, color: ORANGE }}>
                        {r.ingredients.length} ingréd.
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Col 3 : Inventaire + Promotions ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Inventaire maison */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...lbl('rgba(var(--text-rgb),0.5)') }}>Inventaire maison</p>
              <button onClick={() => router.push('/courses/inventaire')} style={{ fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>Gérer</button>
            </div>
            {!inventoryHydrated ? null : inventory.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', textAlign: 'center' }}>
                <Package size={20} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>Inventaire vide</p>
                <button onClick={() => router.push('/courses/inventaire')} style={{ ...DF, fontSize: 10, fontWeight: 700, color: TEAL, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Ajouter des produits →
                </button>
              </div>
            ) : (
              <>
                {inventory.slice(0, 5).map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <Package size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: WHEAT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</p>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{i.qty}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_LABEL[i.status].color }} />
                      <span style={{ fontSize: 9, color: STATUS_LABEL[i.status].color }}>{STATUS_LABEL[i.status].label}</span>
                    </div>
                  </div>
                ))}
                {/* Interconnexion Inventaire → Courses */}
                {toBuy.length > 0 && (
                  <button className="crs-btn" onClick={addInventoryToBuy} disabled={!activeListId || pushingInventory}
                    style={{ width: '100%', padding: '9px', background: 'rgba(242,84,45,0.1)', border: 'none', cursor: !activeListId ? 'default' : 'pointer', fontSize: 10, color: ORANGE, ...DF, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !activeListId ? 0.5 : 1, borderBottom: '1px solid var(--border)' }}>
                    {pushingInventory ? <Loader2 size={11} className="animate-spin" /> : <ShoppingCart size={11} />}
                    Ajouter {toBuy.length} à racheter aux courses
                  </button>
                )}
              </>
            )}
            <button className="crs-btn" onClick={() => router.push('/courses/inventaire')}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: TEAL, ...DF, fontWeight: 700 }}>
              Voir tout l'inventaire →
            </button>
          </div>

          {/* Promotions — Open Prices live data */}
          <div style={{ ...card() }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ ...lbl(ORANGE) }}>Promotions pour vous</p>
                {!loadingPromos && livePromos.length > 0 && (
                  <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(91,159,58,0.15)', color: '#5B9F3A', ...DF, fontWeight: 700 }}>
                    LIVE
                  </span>
                )}
                {loadingPromos && <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>via Open Prices</span>
            </div>
            {/* En chargement : placeholders FALLBACK ; sinon promos réelles ; sinon état vide */}
            {(loadingPromos ? FALLBACK_PROMOS : livePromos.slice(0, 4)).map((p, i) => {
              const isLive = !loadingPromos
              const pct = isLive
                ? discountPct(p as OpenPrice)
                : (p as typeof FALLBACK_PROMOS[0]).pct
              const oldPrice = isLive
                ? (p as OpenPrice).price_without_discount
                : (p as typeof FALLBACK_PROMOS[0]).price_without_discount
              const name = (p as OpenPrice).product_name ?? (p as typeof FALLBACK_PROMOS[0]).product_name ?? '—'
              return (
                <div key={i} className="crs-promo"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: loadingPromos ? 0.5 : 1 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🏷️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: WHEAT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                    {oldPrice && <p style={{ fontSize: 9, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{oldPrice.toFixed(2)} €</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT }}>{p.price.toFixed(2)} €</p>
                    {pct != null && (
                      <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: ORANGE, color: '#fff' }}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {!loadingPromos && livePromos.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 16px', textAlign: 'center' }}>
                <Tag size={18} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Aucune promotion disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECONDARY — Parcours + Dépenses + IA
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

        {/* Parcours magasin */}
        <div style={{ ...card(), padding: 20 }}>
          {/* Store badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ ...lbl('var(--text-muted)') }}>Parcours magasin recommandé</p>
            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          {/* Selected store chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            {activeChain ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: activeChain.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: WHEAT }}>{preferredStore?.name ?? activeChain.name}</span>
                {preferredStore?.city && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>· {preferredStore.city}</span>}
              </div>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>Optimisé pour gagner du temps</span>
            )}
            <button onClick={() => setShowStoreSelector(true)} className="crs-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer', fontSize: 9, color: 'var(--text-muted)' }}>
              <Store size={9} /> {activeChain ? 'Changer' : 'Choisir mon magasin'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!parcours || parcours.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 12px', textAlign: 'center' }}>
                <Navigation size={18} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>Ajoute des articles pour générer le parcours</p>
              </div>
            ) : (
              parcours.map(r => (
                <div key={r.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ ...DF, fontSize: 9, fontWeight: 900, color: '#fff' }}>{r.num}</span>
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: WHEAT }}>{r.rayon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.count} article{r.count > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
          {parcours && parcours.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Estimation : ~{(parcours.reduce((s, r) => s + r.count, 0) * 1.2).toFixed(0)} min</span>
              </div>
              <button onClick={() => setShowStoreSelector(true)} style={{ fontSize: 10, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>Voir le plan</button>
            </div>
          )}
        </div>

        {/* Évolution des dépenses */}
        <div style={{ ...darkCard(), padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ ...lbl('rgba(var(--text-rgb),0.4)') }}>Évolution des dépenses</p>
            <select style={{ fontSize: 9, background: 'rgba(var(--text-rgb),0.06)', border: '1px solid rgba(var(--text-rgb),0.1)', borderRadius: 5, color: 'rgba(var(--text-rgb),0.4)', padding: '2px 6px', cursor: 'pointer', ...DF, fontWeight: 700 }}>
              <option>Cette semaine</option>
              <option>Ce mois</option>
            </select>
          </div>
          <p style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Courses</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '36px 12px', textAlign: 'center' }}>
            <TrendingDown size={20} style={{ color: 'rgba(var(--text-rgb),0.25)' }} />
            <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'rgba(var(--text-rgb),0.4)' }}>À venir</p>
            <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.25)', lineHeight: 1.4 }}>L'historique des dépenses sera disponible après quelques courses validées.</p>
          </div>
          <button style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(var(--text-rgb),0.25)', ...DF, fontWeight: 700, marginTop: 10, borderTop: '1px solid rgba(var(--text-rgb),0.06)' }}
            onClick={() => router.push('/budget')}>
            Voir le rapport complet →
          </button>
        </div>

        {/* Agent IA */}
        <div style={{ ...tealCard(), padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Zap size={16} style={{ color: WHEAT, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ ...lbl('rgba(var(--text-rgb),0.6)'), marginBottom: 4 }}>Agent IA courses</p>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(var(--text-rgb),0.1)' }}>
                {savings > 0 ? (
                  <>
                    <p style={{ fontSize: 11, color: WHEAT, fontWeight: 600 }}>Bonne nouvelle !</p>
                    <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.7)', marginTop: 2 }}>
                      Les promotions du jour permettent d'économiser <span style={{ ...DF, fontWeight: 900, color: WHEAT }}>{fmtEur(savings)}</span>.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.7)' }}>
                    Les recommandations d'économies arriveront avec tes données. À venir.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 10px', textAlign: 'center', flex: 1, justifyContent: 'center' }}>
            <Zap size={16} style={{ color: 'rgba(var(--text-rgb),0.4)' }} />
            <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.6)', lineHeight: 1.4 }}>Suggestions d'optimisation à venir</p>
          </div>
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
            {
              icon: <Zap size={18} style={{ color: TEAL }} />,
              title: 'Meal Prep',
              desc: todayRecipes.length > 0
                ? `${todayRecipes.length} recette${todayRecipes.length > 1 ? 's' : ''} planifiée${todayRecipes.length > 1 ? 's' : ''} aujourd'hui`
                : 'Aucune recette planifiée',
              btn: 'Voir mes repas',
              onClick: () => router.push('/recettes'),
            },
            {
              icon: <Bell size={18} style={{ color: WHEAT }} />,
              title: 'Rappels',
              desc: toBuy.length > 0
                ? `${toBuy.length} article${toBuy.length > 1 ? 's' : ''} à racheter`
                : 'Aucun rappel',
              btn: "Voir l'inventaire",
              onClick: () => router.push('/courses/inventaire'),
            },
            { icon: <Users size={18} style={{ color: 'var(--text-muted)' }} />, title: 'Liste partagée', desc: 'À venir', btn: null, onClick: () => {} },
            { icon: <Truck size={18} style={{ color: 'var(--text-muted)' }} />, title: 'Livraison', desc: 'À venir', btn: null, onClick: () => {} },
          ].map((s, i) => (
            <div key={s.title} style={{ padding: '18px 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ marginBottom: 10 }}>{s.icon}</div>
              <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT, marginBottom: 4 }}>{s.title}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{s.desc}</p>
              {s.btn && (
                <button onClick={s.onClick} className="crs-btn"
                  style={{ fontSize: 10, color: TEAL, background: 'none', border: `1px solid var(--border)`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', ...DF, fontWeight: 700 }}>
                  {s.btn}
                </button>
              )}
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
              Les astuces personnalisées sur tes habitudes d'achat seront disponibles prochainement. À venir.
            </p>
          </div>
        </div>

        {/* Total estimé + Valider */}
        <div style={{ ...card({ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24 }) }}>
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Total estimé</p>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>
              {fmtEur(totalEstimated)}
            </p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
              {totalItems} article{totalItems > 1 ? 's' : ''} &nbsp;·&nbsp; {totalRayons} rayon{totalRayons > 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: ORANGE }}>
            <ShoppingCart size={18} style={{ color: '#fff' }} />
          </div>
          {/* Interconnexion Courses → Budget */}
          <button className="crs-btn" onClick={saveAsExpense} disabled={totalEstimated <= 0 || savingExpense || expenseSaved}
            style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: totalEstimated <= 0 ? 'default' : 'pointer', color: ORANGE, ...DF, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: totalEstimated <= 0 ? 0.5 : 1 }}>
            {savingExpense ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {expenseSaved ? 'Dépense enregistrée' : 'Enregistrer comme dépense'}
          </button>
          <button className="crs-btn" onClick={() => activeListId && completeList(activeListId)}
            style={{ padding: '14px 28px', borderRadius: 10, background: TEAL_BG, border: 'none', cursor: 'pointer', color: 'var(--creamy-ivory)', ...DF, fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap' }}>
            Valider ma liste
          </button>
        </div>
      </div>
    </div>
  )
}
