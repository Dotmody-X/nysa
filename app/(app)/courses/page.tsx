'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Search, ShoppingCart, Check, ChevronRight, Loader2, Barcode } from 'lucide-react'
import { useShoppingLists, useShoppingItems } from '@/hooks/useShoppingLists'
import { searchProducts, getProductByBarcode, guessCategory, OFFProduct } from '@/lib/openFoodFacts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const NUTRI_COLORS: Record<string, string> = {
  a: '#1a9641', b: '#a6d96a', c: '#ffffbf', d: '#fdae61', e: '#d7191c',
}

function NutriScore({ grade }: { grade: string | null }) {
  if (!grade) return null
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase" style={{ background: NUTRI_COLORS[grade.toLowerCase()] ?? '#888', color: '#fff' }}>
      {grade.toUpperCase()}
    </span>
  )
}

export default function CoursesPage() {
  const { lists, loading: listsLoading, createList, deleteList, completeList } = useShoppingLists()
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const { items, loading: itemsLoading, addItem, toggleItem, removeItem, checkedCount, totalEstimated, byCategory } = useShoppingItems(activeListId)

  // New list form
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  // OFF search
  const [query, setQuery]           = useState('')
  const [barcode, setBarcode]       = useState('')
  const [results, setResults]       = useState<OFFProduct[]>([])
  const [searching, setSearching]   = useState(false)
  const [searchTab, setSearchTab]   = useState<'search' | 'barcode'>('search')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual add
  const [manualName, setManualName]   = useState('')
  const [manualQty,  setManualQty]    = useState('1')
  const [manualUnit, setManualUnit]   = useState('')
  const [manualCat,  setManualCat]    = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [showManual, setShowManual]   = useState(false)
  const [addingId, setAddingId]       = useState<string | null>(null)

  // Auto-select first list
  useEffect(() => {
    if (!activeListId && lists.length > 0) setActiveListId(lists[0].id)
  }, [lists, activeListId])

  // Debounced search
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
      name:            product.product_name + (product.brands ? ` — ${product.brands}` : ''),
      quantity:        1,
      unit:            product.quantity ?? '',
      category:        guessCategory(product),
      barcode:         product.code,
      product_id:      product.code,
    })
    setAddingId(null)
  }

  async function handleManualAdd() {
    if (!manualName.trim() || !activeListId) return
    await addItem({
      name:            manualName.trim(),
      quantity:        parseFloat(manualQty) || 1,
      unit:            manualUnit || undefined,
      category:        manualCat || undefined,
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
  }

  const activeList = lists.find(l => l.id === activeListId)
  const progress   = items.length > 0 ? (checkedCount / items.length) * 100 : 0

  return (
    <div className="flex flex-col gap-5 max-w-[1300px]">
      <PageHeader title="Courses" sub="Listes · Recherche produits · Open Food Facts" />

      <div className="grid grid-cols-[240px_1fr_300px] gap-5 min-h-0">

        {/* ── Col 1 : Listes ── */}
        <div className="flex flex-col gap-3">
          {/* Create list */}
          <Card>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Nouvelle liste</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                placeholder="Semaine du 28…"
                className="flex-1 px-3 py-1.5 rounded-[7px] text-xs outline-none min-w-0"
                style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
              <Button variant="primary" size="sm" loading={creatingList} onClick={handleCreateList}>
                <Plus size={12} />
              </Button>
            </div>
          </Card>

          {/* Lists */}
          <Card padding="none">
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mes listes</p>
            </div>
            {listsLoading ? (
              <p className="text-xs p-3" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
            ) : lists.length === 0 ? (
              <p className="text-xs p-3" style={{ color: 'var(--text-muted)' }}>Aucune liste.</p>
            ) : lists.map(list => {
              const isActive = list.id === activeListId
              return (
                <button key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all"
                  style={{ borderBottom: '1px solid var(--border)', background: isActive ? 'var(--bg)' : 'transparent' }}
                >
                  <ShoppingCart size={12} style={{ color: isActive ? '#F2542D' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-xs flex-1 truncate font-medium" style={{ color: isActive ? 'var(--wheat)' : 'var(--text-muted)' }}>{list.name}</span>
                  <ChevronRight size={10} style={{ color: 'var(--text-muted)', opacity: isActive ? 1 : 0 }} />
                </button>
              )
            })}
          </Card>
        </div>

        {/* ── Col 2 : Items de la liste ── */}
        <div className="flex flex-col gap-4">
          {!activeListId ? (
            <Card className="flex flex-col items-center justify-center py-16 gap-3">
              <ShoppingCart size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sélectionne ou crée une liste</p>
            </Card>
          ) : (
            <>
              {/* List header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--wheat)' }}>{activeList?.name}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {checkedCount}/{items.length} articles · {totalEstimated > 0 ? `≈ ${totalEstimated.toFixed(2)} €` : 'prix non renseigné'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowManual(v => !v)}>
                    <Plus size={12} /> Manuel
                  </Button>
                  {items.length > 0 && checkedCount === items.length && (
                    <Button variant="primary" size="sm" onClick={() => { completeList(activeListId); setActiveListId(null) }}>
                      <Check size={12} /> Terminer
                    </Button>
                  )}
                  <button onClick={() => { deleteList(activeListId); setActiveListId(null) }} className="p-1.5 rounded-[6px] opacity-40 hover:opacity-80 transition-opacity" style={{ border: '1px solid var(--border)' }}>
                    <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {items.length > 0 && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? '#0E9594' : '#F2542D' }} />
                </div>
              )}

              {/* Manual add form */}
              {showManual && (
                <Card>
                  <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Ajout manuel</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-32">
                      <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Nom *</label>
                      <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                        placeholder="Pain, lait…"
                        className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                    </div>
                    <div className="w-14">
                      <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Qté</label>
                      <input type="number" min="0.1" step="0.1" value={manualQty} onChange={e => setManualQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                    </div>
                    <div className="w-16">
                      <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Unité</label>
                      <input type="text" value={manualUnit} onChange={e => setManualUnit(e.target.value)} placeholder="kg, L…"
                        className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                    </div>
                    <div className="w-24">
                      <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
                      <input type="text" value={manualCat} onChange={e => setManualCat(e.target.value)} placeholder="Épicerie…"
                        className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Prix €</label>
                      <input type="number" min="0" step="0.01" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="0.00"
                        className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                    </div>
                    <Button variant="primary" size="sm" onClick={handleManualAdd}><Plus size={12} /> Ajouter</Button>
                  </div>
                </Card>
              )}

              {/* Items by category */}
              {itemsLoading ? (
                <Card className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </Card>
              ) : items.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-12 gap-2">
                  <ShoppingCart size={28} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Liste vide — recherche des produits →</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {Object.entries(byCategory).map(([cat, catItems]) => (
                    <Card key={cat} padding="none">
                      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{cat}</p>
                      </div>
                      {catItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                          <button
                            onClick={() => toggleItem(item.id, !item.is_checked)}
                            className="w-4 h-4 rounded-[4px] flex-shrink-0 flex items-center justify-center transition-all"
                            style={{ background: item.is_checked ? '#0E9594' : 'transparent', border: `2px solid ${item.is_checked ? '#0E9594' : 'var(--border)'}` }}
                          >
                            {item.is_checked && <Check size={10} color="#fff" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate" style={{ color: item.is_checked ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: item.is_checked ? 'line-through' : 'none' }}>
                              {item.name}
                            </p>
                            {(item.quantity || item.unit) && (
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {item.quantity ?? ''}{item.unit ? ` ${item.unit}` : ''}
                                {item.price_estimated ? ` · ${item.price_estimated.toFixed(2)} €` : ''}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removeItem(item.id)} className="opacity-30 hover:opacity-80 transition-opacity flex-shrink-0">
                            <X size={11} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Col 3 : Recherche Open Food Facts ── */}
        <div className="flex flex-col gap-3">
          <Card>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Recherche produits</p>

            {/* Tabs */}
            <div className="flex gap-0 mb-3 rounded-[7px] overflow-hidden p-0.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              {(['search', 'barcode'] as const).map(t => (
                <button key={t} onClick={() => { setSearchTab(t); setResults([]) }}
                  className="flex-1 py-1.5 text-[10px] font-medium rounded-[5px] flex items-center justify-center gap-1 transition-all"
                  style={{ background: searchTab === t ? 'var(--bg-card)' : 'transparent', color: searchTab === t ? 'var(--wheat)' : 'var(--text-muted)' }}>
                  {t === 'search' ? <><Search size={10} /> Nom</> : <><Barcode size={10} /> Code-barres</>}
                </button>
              ))}
            </div>

            {searchTab === 'search' ? (
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Nutella, lait entier…"
                  className="w-full pl-8 pr-3 py-2 rounded-[8px] text-xs outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                  placeholder="5449000000996"
                  className="flex-1 px-3 py-2 rounded-[8px] text-xs outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
                />
                <Button variant="secondary" size="sm" onClick={handleBarcodeSearch}>
                  <Search size={12} />
                </Button>
              </div>
            )}

            {!activeListId && (
              <p className="text-[10px] mt-2" style={{ color: '#F2542D' }}>⚠ Sélectionne d'abord une liste</p>
            )}
          </Card>

          {/* Results */}
          {searching ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {results.map(product => (
                <Card key={product.code} className="flex items-start gap-3 cursor-pointer hover:opacity-90 transition-opacity" padding="sm">
                  {product.image_front_small_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_front_small_url} alt={product.product_name}
                      className="w-10 h-10 rounded-[6px] object-cover flex-shrink-0"
                      style={{ border: '1px solid var(--border)' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-[6px] flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <ShoppingCart size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold leading-snug truncate" style={{ color: 'var(--wheat)' }}>{product.product_name}</p>
                    {product.brands && <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{product.brands}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      <NutriScore grade={product.nutriscore_grade} />
                      {product.quantity && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{product.quantity}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddProduct(product)}
                    disabled={!activeListId || addingId === product.code}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                    style={{ background: '#F2542D', color: '#fff' }}
                  >
                    {addingId === product.code
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Plus size={10} />
                    }
                  </button>
                </Card>
              ))}
            </div>
          ) : query.trim() && !searching ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun résultat pour « {query} »</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
