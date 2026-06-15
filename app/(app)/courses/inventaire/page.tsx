'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, Package, Pencil, Trash2, Check, X,
  AlertTriangle, ShoppingCart, Search, Loader2, Calendar,
} from '@/components/ui/icons'
import { AlertTriangle as AlertIcon } from '@/components/ui/icons'
import { useInventory } from '@/hooks/useInventory'
import { useShoppingLists, useShoppingItems } from '@/hooks/useShoppingLists'
import { CatalogPicker, type PickedItem } from '@/components/ui/CatalogPicker'
import { CATALOG_CATEGORIES } from '@/lib/catalogue'
import { type ExpBatch, itemExpiry, expiryColor, expiryLabel, newBatch } from '@/lib/expiry'

/* ─── Constants ──────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = 'var(--azul)'
const ORANGE  = 'var(--accent-budget)'
const WHEAT   = 'var(--text)'
const TEAL_BG = 'var(--azul)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})
const lbl = (color = ORANGE): React.CSSProperties => ({
  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
})

/* ─── Types ──────────────────────────────────────────────────── */
type Status = 'ok' | 'low' | 'buy'
interface InventItem {
  id: string
  name: string
  qty: string
  category: string
  status: Status
  minQty?: string
  notes?: string
  expirations?: ExpBatch[]
}

/* ─── Status config ──────────────────────────────────────────── */
const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  ok:  { label: 'Stock suffisant', color: '#5B9F3A', bg: 'rgba(91,159,58,0.12)'   },
  low: { label: 'Stock faible',    color: ORANGE,    bg: 'rgba(242,84,45,0.12)'   },
  buy: { label: 'À racheter',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

/* ─── Category config ────────────────────────────────────────── */
const CATEGORIES: string[] = CATALOG_CATEGORIES.map(c => c.name)

const CAT_COLORS: Record<string, string> = {
  'Épicerie': WHEAT, 'Produits frais': ORANGE, 'Fruits & Légumes': '#5B9F3A',
  'Boissons': '#3B82F6', 'Hygiène': '#A78BFA', 'Entretien': '#F59E0B',
  'Congélateur': '#60A5FA', 'Autre': 'var(--text-muted)',
}

/** Couleur d'une catégorie : map historique, sinon couleur du catalogue, sinon fallback. */
function catColor(name: string): string {
  return CAT_COLORS[name]
    ?? CATALOG_CATEGORIES.find(c => c.name === name)?.color
    ?? 'var(--text-muted)'
}

/* ─── ConfirmModal ───────────────────────────────────────────── */
function ConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card(), padding: 28, maxWidth: 380, width: '90%', textAlign: 'center' }}>
        <AlertIcon size={28} style={{ color: ORANGE, margin: '0 auto 12px' }} />
        <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: WHEAT, marginBottom: 6 }}>Supprimer cet article ?</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22 }}>« {name} » sera retiré de l'inventaire.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12 }}>
            Annuler
          </button>
          <button onClick={onConfirm} className="nb-press" style={{ padding: '8px 20px', borderRadius: 'var(--radius-lg)', background: ORANGE, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', color: 'var(--chocolate)', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12 }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── ItemRow ────────────────────────────────────────────────── */
function ItemRow({
  item, onEdit, onDelete, onStatusChange,
}: {
  item: InventItem
  onEdit: (item: InventItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const s = STATUS[item.status]
  const exp = itemExpiry(item.expirations)
  const expired = exp?.level === 'expired'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', transition: 'background .1s', flexWrap: 'wrap',
      background: expired ? 'rgba(239,68,68,0.07)' : undefined, borderLeft: exp ? `3px solid ${expiryColor(exp.level)}` : undefined }}
      className="inv-row">
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Package size={16} style={{ color: catColor(item.category) }} />
      </div>
      {/* Name + qty */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: WHEAT }}>{item.name}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.qty}</span>
          <span style={{ fontSize: 10, color: catColor(item.category), ...DF, fontWeight: 600 }}>{item.category}</span>
          {item.minQty && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min : {item.minQty}</span>}
          {exp && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, color: '#fff', background: expiryColor(exp.level), ...DF }}
              title={exp.batchCount > 1 ? `${exp.batchCount} lots — le plus proche affiché` : undefined}>
              <Calendar size={9} /> {expiryLabel(exp.days)}{exp.batchCount > 1 ? ` · ${exp.batchCount} lots` : ''}
            </span>
          )}
        </div>
      </div>
      {/* Status selector */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {(Object.entries(STATUS) as [Status, typeof STATUS[Status]][]).map(([k, v]) => (
          <button key={k} onClick={() => onStatusChange(item.id, k)}
            style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${item.status === k ? v.color : 'var(--border)'}`,
              background: item.status === k ? v.bg : 'transparent', cursor: 'pointer',
              fontSize: 9, color: item.status === k ? v.color : 'var(--text-muted)', ...DF, fontWeight: 700,
              transition: 'all .12s' }}>
            {v.label}
          </button>
        ))}
      </div>
      {/* Status badge large */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 120, flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
        <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button onClick={() => onDelete(item.id)}
          style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={12} style={{ color: ORANGE } } />
        </button>
      </div>
    </div>
  )
}

/* ─── EditPanel ──────────────────────────────────────────────── */
function EditPanel({
  item, onSave, onClose,
}: {
  item: InventItem | null
  onSave: (item: InventItem) => void
  onClose: () => void
}) {
  const isNew = item === null
  const [form, setForm] = useState<InventItem>(
    item ?? { id: '', name: '', qty: '', category: 'Épicerie', status: 'ok', minQty: '', notes: '', expirations: [] }
  )

  useEffect(() => {
    setForm(item ?? { id: '', name: '', qty: '', category: 'Épicerie', status: 'ok', minQty: '', notes: '', expirations: [] })
  }, [item])

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%',
  }

  function handleSave() {
    if (!form.name.trim()) return
    // On ne garde que les lots qui ont une date
    const expirations = (form.expirations ?? []).filter(b => b.date)
    onSave({ ...form, expirations, id: form.id || Date.now().toString() })
  }

  const batches = form.expirations ?? []
  const addBatch = () => setForm(f => ({ ...f, expirations: [...(f.expirations ?? []), newBatch()] }))
  const updateBatch = (id: string, patch: Partial<ExpBatch>) =>
    setForm(f => ({ ...f, expirations: (f.expirations ?? []).map(b => b.id === id ? { ...b, ...patch } : b) }))
  const removeBatch = (id: string) =>
    setForm(f => ({ ...f, expirations: (f.expirations ?? []).filter(b => b.id !== id) }))

  function handlePick(item: PickedItem) {
    setForm(f => ({
      ...f,
      name: item.name,
      category: item.category ?? f.category,
      qty: f.qty || item.unit || '',
    }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card(), padding: 28, width: 480, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ ...DF, fontSize: 15, fontWeight: 900, color: WHEAT }}>{isNew ? 'Ajouter un article' : 'Modifier l\'article'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Nom */}
          <div style={{ position: 'relative', zIndex: 5 }}>
            <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Nom *</label>
            <CatalogPicker
              query={form.name}
              onQueryChange={name => setForm(f => ({ ...f, name }))}
              onSelect={handlePick}
              placeholder="Riz basmati, Lait…"
              category={form.category}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Quantité */}
            <div>
              <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Quantité</label>
              <input value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                placeholder="1 kg, x6, 500 ml…" style={inp} />
            </div>
            {/* Qté min */}
            <div>
              <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Seuil d'alerte</label>
              <input value={form.minQty ?? ''} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))}
                placeholder="250g, x3…" style={inp} />
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Catégorie</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              {form.category && !CATEGORIES.includes(form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Statut du stock</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.entries(STATUS) as [Status, typeof STATUS[Status]][]).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, status: k }))}
                  style={{ flex: 1, padding: '10px 6px', borderRadius: 9, border: `2px solid ${form.status === k ? v.color : 'var(--border)'}`,
                    background: form.status === k ? v.bg : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all .12s' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, margin: '0 auto 5px' }} />
                  <p style={{ fontSize: 9, color: form.status === k ? v.color : 'var(--text-muted)', ...DF, fontWeight: 700 }}>{v.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dates de péremption (DLC) — plusieurs lots possibles */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dates de péremption (DLC)</label>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Rappels : J‑10, J‑2, veille, jour J</span>
            </div>
            {batches.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {batches.map((b, i) => {
                  const ex = b.date ? itemExpiry([b]) : null
                  return (
                    <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="date" value={b.date} onChange={e => updateBatch(b.id, { date: e.target.value })}
                        style={{ ...inp, flex: 1, borderLeft: ex ? `3px solid ${expiryColor(ex.level)}` : inp.border as string }} />
                      <input value={b.qty ?? ''} onChange={e => updateBatch(b.id, { qty: e.target.value })}
                        placeholder={`Lot ${i + 1} (qté)`} style={{ ...inp, width: 110 }} />
                      <button onClick={() => removeBatch(b.id)} aria-label="Retirer ce lot"
                        style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={12} style={{ color: ORANGE }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={addBatch}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px dashed var(--border)', cursor: 'pointer', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 11 }}>
              <Plus size={12} /> Ajouter une date {batches.length > 0 ? '(autre lot)' : ''}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Notes</label>
            <input value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Marque préférée, magasin habituel…" style={inp} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12 }}>
            Annuler
          </button>
          <button onClick={handleSave} className="nb-press" style={{ flex: 2, padding: '10px', borderRadius: 'var(--radius-lg)', background: ORANGE, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', color: 'var(--chocolate)', cursor: 'pointer', ...DF, fontWeight: 800, fontSize: 12 }}>
            {isNew ? '+ Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function InventairePage() {
  const router = useRouter()

  /* ── Source de vérité partagée (localStorage, démarre vide) ── */
  const { items, upsert, remove, setStatus } = useInventory()

  /* ── Liste de courses active (Supabase) pour "→ ajouter aux courses" ── */
  const { lists } = useShoppingLists()
  const activeListId = lists.length > 0 ? lists[0].id : null
  const { addItem } = useShoppingItems(activeListId)
  const [pushingToCourses, setPushingToCourses] = useState(false)

  const [editItem, setEditItem] = useState<InventItem | null | 'new'>( null) // null=closed, 'new'=add, item=edit
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filterCat, setFilterCat] = useState('Toutes')

  /* ── CRUD (via hook partagé) ── */
  function handleSave(item: InventItem) {
    upsert({ ...item, id: item.id || Date.now().toString() })
    setEditItem(null)
  }

  function handleDelete(id: string) {
    remove(id)
    setConfirmId(null)
  }

  function handleStatusChange(id: string, status: Status) {
    setStatus(id, status)
  }

  /* ── Filters ── */
  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    const matchCat    = filterCat === 'Toutes' || i.category === filterCat
    return matchSearch && matchStatus && matchCat
  })

  const countByStatus = (s: Status) => items.filter(i => i.status === s).length
  // Catégories du catalogue d'abord, puis toute catégorie héritée présente dans les items.
  const allCats = [...CATEGORIES, ...filtered.map(i => i.category).filter(c => !CATEGORIES.includes(c))]
  const grouped = allCats.reduce((acc, cat) => {
    if (acc[cat]) return acc
    const catItems = filtered.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {} as Record<string, InventItem[]>)

  /* ── "À racheter" shortcut — ajoute à la liste de courses active (Supabase) ── */
  async function addToCourses() {
    const toBuy = items.filter(i => i.status === 'buy')
    if (toBuy.length === 0) return
    if (!activeListId) { router.push('/courses'); return }
    setPushingToCourses(true)
    for (const i of toBuy) {
      await addItem({
        name: i.name,
        quantity: 1,
        unit: i.minQty || i.qty || undefined,
        category: i.category || undefined,
      })
    }
    setPushingToCourses(false)
    router.push('/courses')
  }

  const itemToBuy = countByStatus('buy')

  /* ── Rappels de péremption (J-10 → périmé), triés par urgence ── */
  const reminders = items
    .map(i => ({ item: i, exp: itemExpiry(i.expirations) }))
    .filter((x): x is { item: InventItem; exp: NonNullable<ReturnType<typeof itemExpiry>> } => !!x.exp && x.exp.level !== 'ok')
    .sort((a, b) => a.exp.days - b.exp.days)
  const expiredCount = reminders.filter(r => r.exp.level === 'expired').length

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`.inv-row:hover { background: var(--bg-input) !important; }`}</style>

      {/* ── Modals ── */}
      {editItem !== null && (
        <EditPanel
          item={editItem === 'new' ? null : editItem}
          onSave={handleSave}
          onClose={() => setEditItem(null)}
        />
      )}
      {confirmId && (
        <ConfirmModal
          name={items.find(i => i.id === confirmId)?.name ?? ''}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/courses')} className="nb-press"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: '7px 12px', cursor: 'pointer', color: 'var(--text)', fontSize: 11 }}>
          <ChevronLeft size={13} /> Courses
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>INVENTAIRE MAISON</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
            Gérez vos stocks · Évitez le gaspillage
          </p>
        </div>
        {itemToBuy > 0 && (
          <button onClick={addToCourses} disabled={pushingToCourses} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 'var(--radius-lg)', background: ORANGE, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: 'var(--chocolate)', ...DF, fontWeight: 800, fontSize: 12, opacity: pushingToCourses ? 0.6 : 1 }}>
            {pushingToCourses ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />} Ajouter {itemToBuy} article{itemToBuy > 1 ? 's' : ''} aux courses
          </button>
        )}
        <button onClick={() => setEditItem('new')} className="nb-press"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 'var(--radius-lg)', background: TEAL_BG, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: 'var(--creamy-ivory)', ...DF, fontWeight: 800, fontSize: 12 }}>
          <Plus size={13} /> Ajouter un article
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { l: 'Total articles',    v: String(items.length),      color: WHEAT  },
          { l: 'Stock suffisant',   v: String(countByStatus('ok')),  color: '#5B9F3A' },
          { l: 'Stock faible',      v: String(countByStatus('low')), color: ORANGE },
          { l: 'À racheter',        v: String(countByStatus('buy')), color: '#EF4444' },
        ].map(k => (
          <div key={k.l} style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.l}</p>
            <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* ── Rappels de péremption ── */}
      {reminders.length > 0 && (
        <div style={{ marginBottom: 16, padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: expiredCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={18} style={{ color: expiredCount > 0 ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
            <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: expiredCount > 0 ? '#EF4444' : '#F59E0B' }}>
              {expiredCount > 0 && `${expiredCount} périmé${expiredCount > 1 ? 's' : ''} · `}
              {reminders.length} article{reminders.length > 1 ? 's' : ''} à surveiller
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {reminders.map(({ item, exp }) => (
              <button key={item.id} onClick={() => setEditItem(item)} className="nb-press"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: `2px solid ${expiryColor(exp.level)}`, cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: WHEAT }}>{item.name}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: expiryColor(exp.level), ...DF }}>{expiryLabel(exp.days)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, padding: '0 12px', height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
          <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un article…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
        </div>
        {/* Status filter */}
        <div className="toolbar-scroll" style={{ display: 'flex', gap: 6 }}>
          {([['all', 'Tous'], ['ok', 'Suffisant'], ['low', 'Faible'], ['buy', 'À racheter']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilterStatus(k as Status | 'all')}
              style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', ...DF, fontSize: 10, fontWeight: 700,
                background: filterStatus === k ? (k === 'all' ? ORANGE : STATUS[k as Status]?.color ?? ORANGE) : 'var(--bg-card)',
                color: filterStatus === k ? '#fff' : 'var(--text-muted)',
                outline: filterStatus === k ? 'none' : '1px solid var(--border)' }}>
              {l}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: '6px 12px', color: 'var(--text)', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
          <option>Toutes</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── List grouped by category ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(grouped).length === 0 ? (
          <div style={{ ...card({ padding: '40px 20px', textAlign: 'center' }) }}>
            <Package size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun article trouvé</p>
          </div>
        ) : Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ ...card() }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(var(--text-rgb),0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: catColor(cat) }} />
                <p style={{ ...DF, fontSize: 10, fontWeight: 800, color: catColor(cat), letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cat}</p>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{catItems.length} article{catItems.length > 1 ? 's' : ''}</span>
            </div>
            {/* Items */}
            {catItems.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={setEditItem}
                onDelete={id => setConfirmId(id)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── Alert banner: items à racheter ── */}
      {countByStatus('buy') > 0 && (
        <div style={{ marginTop: 16, padding: '14px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(239,68,68,0.08)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: '#EF4444' }}>{countByStatus('buy')} article{countByStatus('buy') > 1 ? 's' : ''} à racheter</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {items.filter(i => i.status === 'buy').map(i => i.name).join(', ')}
            </p>
          </div>
          <button onClick={addToCourses} disabled={pushingToCourses} className="nb-press"
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-lg)', background: ORANGE, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: 'var(--chocolate)', ...DF, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap', opacity: pushingToCourses ? 0.6 : 1 }}>
            → Ajouter aux courses
          </button>
        </div>
      )}
    </div>
  )
}
