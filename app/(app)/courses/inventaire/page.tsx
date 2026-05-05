'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, Package, Pencil, Trash2, Check, X,
  AlertTriangle, ShoppingCart, Search,
} from 'lucide-react'
import { AlertTriangle as AlertIcon } from 'lucide-react'

/* ─── Constants ──────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = '#0E9594'
const ORANGE  = '#F2542D'
const WHEAT   = '#F0E4CC'
const TEAL_BG = '#11686A'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', ...extra,
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
}

/* ─── Status config ──────────────────────────────────────────── */
const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  ok:  { label: 'Stock suffisant', color: '#5B9F3A', bg: 'rgba(91,159,58,0.12)'   },
  low: { label: 'Stock faible',    color: ORANGE,    bg: 'rgba(242,84,45,0.12)'   },
  buy: { label: 'À racheter',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

/* ─── Category config ────────────────────────────────────────── */
const CATEGORIES = ['Épicerie', 'Produits frais', 'Fruits & Légumes', 'Boissons', 'Hygiène', 'Entretien', 'Congélateur', 'Autre']

const CAT_COLORS: Record<string, string> = {
  'Épicerie': WHEAT, 'Produits frais': ORANGE, 'Fruits & Légumes': '#5B9F3A',
  'Boissons': '#3B82F6', 'Hygiène': '#A78BFA', 'Entretien': '#F59E0B',
  'Congélateur': '#60A5FA', 'Autre': 'var(--text-muted)',
}

/* ─── Seed data ──────────────────────────────────────────────── */
const SEED: InventItem[] = [
  { id: '1', name: 'Riz basmati',    qty: '1 kg',    category: 'Épicerie',          status: 'ok',  minQty: '500g'  },
  { id: '2', name: 'Œufs',           qty: 'x6',      category: 'Produits frais',    status: 'ok',  minQty: 'x6'    },
  { id: '3', name: "Huile d'olive",  qty: '500 ml',  category: 'Épicerie',          status: 'low', minQty: '250ml' },
  { id: '4', name: 'Lait',           qty: '1 L',     category: 'Produits frais',    status: 'buy', minQty: '1L'    },
  { id: '5', name: 'Beurre',         qty: '250 g',   category: 'Produits frais',    status: 'ok',  minQty: '125g'  },
  { id: '6', name: 'Farine',         qty: '1 kg',    category: 'Épicerie',          status: 'ok',  minQty: '500g'  },
  { id: '7', name: 'Sucre',          qty: '500 g',   category: 'Épicerie',          status: 'low', minQty: '250g'  },
  { id: '8', name: 'Pâtes',          qty: '500 g',   category: 'Épicerie',          status: 'ok',  minQty: '250g'  },
  { id: '9', name: 'Tomates (boîte)',qty: '2 boîtes',category: 'Épicerie',          status: 'ok'                   },
  { id:'10', name: 'Yaourt nature',  qty: 'x4',      category: 'Produits frais',    status: 'buy'                  },
  { id:'11', name: 'Bananes',        qty: '1 grappe',category: 'Fruits & Légumes',  status: 'low'                  },
  { id:'12', name: 'Eau minérale',   qty: '6 L',     category: 'Boissons',          status: 'ok'                   },
]

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
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 8, background: ORANGE, border: 'none', color: '#fff', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12 }}>
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
      className="inv-row">
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Package size={16} style={{ color: CAT_COLORS[item.category] ?? 'var(--text-muted)' }} />
      </div>
      {/* Name + qty */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: WHEAT }}>{item.name}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.qty}</span>
          <span style={{ fontSize: 10, color: CAT_COLORS[item.category] ?? 'var(--text-muted)', ...DF, fontWeight: 600 }}>{item.category}</span>
          {item.minQty && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min : {item.minQty}</span>}
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
    item ?? { id: '', name: '', qty: '', category: 'Épicerie', status: 'ok', minQty: '', notes: '' }
  )

  useEffect(() => {
    setForm(item ?? { id: '', name: '', qty: '', category: 'Épicerie', status: 'ok', minQty: '', notes: '' })
  }, [item])

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%',
  }

  function handleSave() {
    if (!form.name.trim()) return
    onSave({ ...form, id: form.id || Date.now().toString() })
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
          <div>
            <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Nom *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Riz basmati, Lait…" autoFocus style={inp} />
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
          <button onClick={handleSave} style={{ flex: 2, padding: '10px', borderRadius: 9, background: ORANGE, border: 'none', color: '#fff', cursor: 'pointer', ...DF, fontWeight: 800, fontSize: 12 }}>
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

  const [items,    setItems]    = useState<InventItem[]>(SEED)
  const [hydrated, setHydrated] = useState(false)
  const [editItem, setEditItem] = useState<InventItem | null | 'new'>( null) // null=closed, 'new'=add, item=edit
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filterCat, setFilterCat] = useState('Toutes')

  /* ── localStorage ── */
  useEffect(() => {
    try { const s = localStorage.getItem('nysa_inventaire'); if (s) setItems(JSON.parse(s)) } catch {}
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('nysa_inventaire', JSON.stringify(items))
  }, [items, hydrated])

  /* ── CRUD ── */
  function handleSave(item: InventItem) {
    setItems(prev => {
      const exists = prev.find(i => i.id === item.id)
      return exists ? prev.map(i => i.id === item.id ? item : i) : [...prev, item]
    })
    setEditItem(null)
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setConfirmId(null)
  }

  function handleStatusChange(id: string, status: Status) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  /* ── Filters ── */
  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    const matchCat    = filterCat === 'Toutes' || i.category === filterCat
    return matchSearch && matchStatus && matchCat
  })

  const countByStatus = (s: Status) => items.filter(i => i.status === s).length
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {} as Record<string, InventItem[]>)

  /* ── "À racheter" shortcut — add to courses ── */
  function addToCourses() {
    const toBuy = items.filter(i => i.status === 'buy')
    const existing = (() => { try { return JSON.parse(localStorage.getItem('nysa_courses') || '[]') } catch { return [] } })()
    const newItems = toBuy.map(i => ({
      id: `inv_${i.id}_${Date.now()}`,
      item: i.name,
      qty: i.minQty || i.qty,
      done: false,
    }))
    localStorage.setItem('nysa_courses', JSON.stringify([...existing, ...newItems]))
    router.push('/courses')
  }

  const itemToBuy = countByStatus('buy')

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => router.push('/courses')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>
          <ChevronLeft size={13} /> Courses
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>INVENTAIRE MAISON</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
            Gérez vos stocks · Évitez le gaspillage
          </p>
        </div>
        {itemToBuy > 0 && (
          <button onClick={addToCourses}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: ORANGE, border: 'none', cursor: 'pointer', color: '#fff', ...DF, fontWeight: 800, fontSize: 12 }}>
            <ShoppingCart size={13} /> Ajouter {itemToBuy} article{itemToBuy > 1 ? 's' : ''} aux courses
          </button>
        )}
        <button onClick={() => setEditItem('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: TEAL_BG, border: 'none', cursor: 'pointer', color: WHEAT, ...DF, fontWeight: 800, fontSize: 12 }}>
          <Plus size={13} /> Ajouter un article
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'Total articles',    v: String(items.length),      color: WHEAT  },
          { l: 'Stock suffisant',   v: String(countByStatus('ok')),  color: '#5B9F3A' },
          { l: 'Stock faible',      v: String(countByStatus('low')), color: ORANGE },
          { l: 'À racheter',        v: String(countByStatus('buy')), color: '#EF4444' },
        ].map(k => (
          <div key={k.l} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.l}</p>
            <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, padding: '0 12px', height: 36, borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un article…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6 }}>
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
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat] ?? 'var(--text-muted)' }} />
                <p style={{ ...DF, fontSize: 10, fontWeight: 800, color: CAT_COLORS[cat] ?? 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cat}</p>
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
        <div style={{ marginTop: 16, padding: '14px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: '#EF4444' }}>{countByStatus('buy')} article{countByStatus('buy') > 1 ? 's' : ''} à racheter</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {items.filter(i => i.status === 'buy').map(i => i.name).join(', ')}
            </p>
          </div>
          <button onClick={addToCourses}
            style={{ padding: '8px 16px', borderRadius: 9, background: ORANGE, border: 'none', cursor: 'pointer', color: '#fff', ...DF, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>
            → Ajouter aux courses
          </button>
        </div>
      )}
    </div>
  )
}
