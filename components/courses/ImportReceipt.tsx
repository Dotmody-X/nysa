'use client'

import { useState, useRef } from 'react'
import { Upload, X, Plus, Check, Loader2, Trash2, Store, Calendar } from '@/components/ui/icons'
import { CatalogPicker, type PickedItem } from '@/components/ui/CatalogPicker'
import { parseReceiptText, type ReceiptItem } from '@/lib/receiptParse'
import { usePrices } from '@/hooks/usePrices'
import { useBudget } from '@/hooks/useBudget'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = 'var(--accent-budget)'
const TEAL = 'var(--azul)'
const WHEAT = 'var(--text)'

type Row = ReceiptItem & { key: string }
const rid = () => Math.random().toString(36).slice(2)
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/**
 * Import d'un ticket de caisse / PDF → vérification → remplit le stock,
 * enregistre les prix (par magasin) et, en option, ajoute la dépense au budget.
 */
export function ImportReceipt({
  onClose,
  restock,
  onDone,
}: {
  onClose: () => void
  restock: (name: string, qty: string, category?: string) => void
  onDone?: (msg: string) => void
}) {
  const { recordPrices } = usePrices()
  const now = new Date()
  const { addTransaction } = useBudget(now.getFullYear(), now.getMonth() + 1)

  const [step, setStep] = useState<'input' | 'review'>('input')
  const [store, setStore] = useState('')
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState<Row[]>([])
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toStock, setToStock] = useState(true)
  const [toBudget, setToBudget] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  function applyParsed(text: string) {
    const r = parseReceiptText(text)
    setStore(s => s || r.store || '')
    setDate(d => r.date || d)
    setRows(r.items.map(it => ({ ...it, key: rid() })))
    setStep('review')
    if (r.items.length === 0) setError('Aucune ligne détectée — ajoute-les manuellement.')
  }

  async function onFile(file: File) {
    setBusy(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.text) applyParsed(data.text)
      else { setError(data.error || 'Lecture impossible — colle le texte ou saisis manuellement.'); setStep('review') }
    } catch { setError('Échec de lecture — colle le texte ou saisis manuellement.'); setStep('review') }
    finally { setBusy(false) }
  }

  const total = rows.reduce((s, r) => s + (r.total || 0), 0)
  const setRow = (key: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r))
  const addRow = () => setRows(rs => [...rs, { key: rid(), name: '', quantity: 1, total: 0 }])
  const delRow = (key: string) => setRows(rs => rs.filter(r => r.key !== key))

  async function confirm() {
    setBusy(true)
    try {
      const valid = rows.filter(r => r.name.trim())
      if (toStock) {
        for (const r of valid) {
          const qty = r.unit ? `${r.quantity} ${r.unit}` : (r.quantity > 1 ? `x${r.quantity}` : '')
          restock(r.name, qty, r.category || 'Autre')
        }
      }
      await recordPrices(valid.map(r => ({
        product_name: r.name, store: store || null, quantity: r.quantity, unit: r.unit ?? null,
        unit_price: r.unitPrice ?? (r.quantity ? Math.round((r.total / r.quantity) * 100) / 100 : r.total),
        total_price: r.total, date, source: 'receipt',
      })))
      if (toBudget && total > 0) {
        await addTransaction({ amount: Math.round(total * 100) / 100, type: 'expense', date, description: store ? `Courses — ${store}` : 'Courses' })
      }
      onDone?.(`Ticket importé : ${valid.length} article${valid.length > 1 ? 's' : ''}${toStock ? ' au stock' : ''}${toBudget && total > 0 ? `, ${total.toFixed(2)} € au budget` : ''}.`)
      onClose()
    } finally { setBusy(false) }
  }

  const inp: React.CSSProperties = { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--ink)', boxShadow: '6px 6px 0 var(--ink)', width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '2px solid var(--ink)' }}>
          <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: ORANGE, flex: 1 }}>Importer un ticket</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {step === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dropzone PDF */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--ink)', borderRadius: 'var(--radius-lg)', padding: '30px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)' }}>
                {busy ? <Loader2 size={26} className="spin" style={{ color: ORANGE }} /> : <Upload size={26} style={{ color: ORANGE }} />}
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT, marginTop: 10 }}>Glisse un PDF ici, ou clique pour choisir</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>PDF texte (facture / e-ticket). Photo scannée → utilise le collage ci-dessous.</p>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
              </div>

              {/* Coller le texte */}
              <div>
                <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT, marginBottom: 6 }}>…ou colle le texte du ticket</p>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={5} placeholder={'CARREFOUR\nLAIT 1L      0,89\nOEUFS x6     2,45\n…'}
                  style={{ ...inp, resize: 'vertical', fontFamily: 'monospace' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => applyParsed(pasteText)} disabled={!pasteText.trim()}
                    style={{ ...DF, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 8, border: '2px solid var(--ink)', background: ORANGE, color: 'var(--chocolate)', cursor: pasteText.trim() ? 'pointer' : 'default', opacity: pasteText.trim() ? 1 : 0.5 }}>
                    Analyser le texte
                  </button>
                  <button onClick={() => { setRows([{ key: rid(), name: '', quantity: 1, total: 0 }]); setStep('review') }}
                    style={{ ...DF, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 8, border: '2px solid var(--ink)', background: 'var(--bg-card)', color: WHEAT, cursor: 'pointer' }}>
                    Saisie manuelle
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', color: '#B45309', fontSize: 11 }}>{error}</div>}

              {/* Magasin + date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Store size={11} /> Magasin</label>
                  <input value={store} onChange={e => setStore(e.target.value)} placeholder="Carrefour, Lidl…" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Calendar size={11} /> Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Lignes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 80px 28px', gap: 8, fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 2px' }}>
                  <span>Article</span><span>Qté</span><span>Unité</span><span>Prix €</span><span />
                </div>
                {rows.map(r => (
                  <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 80px 28px', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <CatalogPicker query={r.name} onQueryChange={v => setRow(r.key, { name: v })}
                        onSelect={(it: PickedItem) => setRow(r.key, { name: it.name, category: it.category ?? r.category, unit: it.unit ?? r.unit })}
                        placeholder="Article" enableOFF={false} category={r.category} />
                    </div>
                    <input type="number" step="0.01" value={r.quantity} onChange={e => setRow(r.key, { quantity: parseFloat(e.target.value) || 0 })} style={inp} />
                    <input value={r.unit ?? ''} onChange={e => setRow(r.key, { unit: e.target.value || undefined })} placeholder="g, ml…" style={inp} />
                    <input type="number" step="0.01" value={r.total} onChange={e => setRow(r.key, { total: parseFloat(e.target.value) || 0 })} style={inp} />
                    <button onClick={() => delRow(r.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 0 }}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px dashed var(--border)', cursor: 'pointer', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 11 }}>
                  <Plus size={12} /> Ajouter une ligne
                </button>
              </div>

              {/* Total + options */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: WHEAT, cursor: 'pointer' }}>
                    <input type="checkbox" checked={toStock} onChange={e => setToStock(e.target.checked)} /> Remplir le stock
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: WHEAT, cursor: 'pointer' }}>
                    <input type="checkbox" checked={toBudget} onChange={e => setToBudget(e.target.checked)} /> Ajouter au budget
                  </label>
                </div>
                <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: TEAL }}>Total : {total.toFixed(2)} €</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 22px', borderTop: '2px solid var(--ink)' }}>
            <button onClick={() => setStep('input')} style={{ ...DF, fontSize: 12, fontWeight: 700, padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '2px solid var(--ink)', color: WHEAT, cursor: 'pointer' }}>← Retour</button>
            <button onClick={confirm} disabled={busy || rows.every(r => !r.name.trim())} className="nb-press"
              style={{ ...DF, flex: 1, fontSize: 12, fontWeight: 800, padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: ORANGE, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', color: 'var(--chocolate)', cursor: busy ? 'default' : 'pointer', opacity: busy || rows.every(r => !r.name.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Valider l'import
            </button>
          </div>
        )}
      </div>
      <style>{`.spin{animation:rcspin .8s linear infinite}@keyframes rcspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
