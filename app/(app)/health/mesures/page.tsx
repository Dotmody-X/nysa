'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Pencil, Trash2, Check, X } from 'lucide-react'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL   = '#0E9594'
const ORANGE = '#F2542D'
const WHEAT  = '#F0E4CC'

type Mesure = {
  id: string; date: string
  taille?: number; massGrasse?: number; massMuscul?: number; imc?: number; notes?: string
}

type FormState = { date: string; taille: string; massGrasse: string; massMuscul: string; imc: string; notes: string }

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function MiniChart({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values); const max = Math.max(...values, min + 0.1)
  const W = 120; const H = 36
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / (max - min)) * (H - 4)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 120, height: 36 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i}
          cx={(i / (values.length - 1)) * W}
          cy={H - ((v - min) / (max - min)) * (H - 4)}
          r={i === values.length - 1 ? 3.5 : 2} fill={color}
          stroke={i === values.length - 1 ? 'var(--bg-card)' : 'none'} strokeWidth={1.5}
        />
      ))}
    </svg>
  )
}

const FORM_FIELDS = [
  { k: 'date',       t: 'date',   ph: '',                    lbl: 'Date' },
  { k: 'taille',     t: 'number', ph: 'ex: 81',              lbl: 'Taille (cm)' },
  { k: 'massGrasse', t: 'number', ph: 'ex: 15.2',            lbl: 'Masse grasse (%)' },
  { k: 'massMuscul', t: 'number', ph: 'ex: 56.3',            lbl: 'Masse musc. (kg)' },
  { k: 'imc',        t: 'number', ph: 'ex: 22.1',            lbl: 'IMC' },
  { k: 'notes',      t: 'text',   ph: 'Notes optionnelles…', lbl: 'Notes' },
]

function toMesure(id: string, f: FormState): Mesure {
  return {
    id,
    date:       f.date,
    taille:     f.taille     ? parseFloat(f.taille)     : undefined,
    massGrasse: f.massGrasse ? parseFloat(f.massGrasse) : undefined,
    massMuscul: f.massMuscul ? parseFloat(f.massMuscul) : undefined,
    imc:        f.imc        ? parseFloat(f.imc)        : undefined,
    notes:      f.notes || undefined,
  }
}

function fromMesure(m: Mesure): FormState {
  return {
    date:       m.date,
    taille:     m.taille     != null ? String(m.taille)     : '',
    massGrasse: m.massGrasse != null ? String(m.massGrasse) : '',
    massMuscul: m.massMuscul != null ? String(m.massMuscul) : '',
    imc:        m.imc        != null ? String(m.imc)        : '',
    notes:      m.notes ?? '',
  }
}

const EMPTY_FORM: FormState = { date: new Date().toISOString().slice(0, 10), taille: '', massGrasse: '', massMuscul: '', imc: '', notes: '' }

export default function MesuresPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const [mesures, setMesures] = useState<Mesure[]>([
    { id: '1', date: '2026-04-29', taille: 81,   massGrasse: 15.2, massMuscul: 56.3, imc: 22.1 },
    { id: '2', date: '2026-03-15', taille: 81.5, massGrasse: 15.5, massMuscul: 55.9, imc: 22.1 },
    { id: '3', date: '2026-02-01', taille: 82,   massGrasse: 16.0, massMuscul: 55.5, imc: 22.3 },
    { id: '4', date: '2026-01-10', taille: 82.5, massGrasse: 16.4, massMuscul: 55.1, imc: 22.4 },
  ])

  const latest = mesures[0]
  const prev   = mesures[1]

  function diff(curr?: number, p?: number) {
    if (curr == null || p == null) return null
    return curr - p
  }

  // ── ADD ──
  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const newM = toMesure(Date.now().toString(), form)
    setMesures(m => [newM, ...m].sort((a, b) => b.date.localeCompare(a.date)))
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  // ── EDIT ──
  function startEdit(m: Mesure) {
    setEditId(m.id)
    setEditForm(fromMesure(m))
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setMesures(ms => ms
      .map(m => m.id === editId ? toMesure(editId, editForm) : m)
      .sort((a, b) => b.date.localeCompare(a.date))
    )
    setEditId(null)
  }

  function cancelEdit() { setEditId(null) }

  // ── DELETE ──
  function deleteMesure(id: string) {
    if (!confirm('Supprimer cette mesure ?')) return
    setMesures(ms => ms.filter(m => m.id !== id))
  }

  const tailleVals = mesures.slice().reverse().map(m => m.taille ?? 0).filter(v => v > 0)
  const grasVals   = mesures.slice().reverse().map(m => m.massGrasse ?? 0).filter(v => v > 0)
  const musclVals  = mesures.slice().reverse().map(m => m.massMuscul ?? 0).filter(v => v > 0)

  const metrics = [
    { l: 'Tour de taille',   v: latest?.taille     != null ? `${latest.taille} cm`     : '—', unit: 'cm',  d: diff(latest?.taille,     prev?.taille),     up: false, color: TEAL,   vals: tailleVals },
    { l: 'Masse grasse',     v: latest?.massGrasse != null ? `${latest.massGrasse} %`  : '—', unit: '%',   d: diff(latest?.massGrasse, prev?.massGrasse), up: false, color: TEAL,   vals: grasVals   },
    { l: 'Masse musculaire', v: latest?.massMuscul != null ? `${latest.massMuscul} kg` : '—', unit: 'kg',  d: diff(latest?.massMuscul, prev?.massMuscul), up: true,  color: ORANGE, vals: musclVals  },
    { l: 'IMC',              v: latest?.imc        != null ? String(latest.imc)        : '—', unit: '',    d: null,                                        up: null,  color: WHEAT,  vals: []         },
  ]

  const inputStyle = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12 }

  return (
    <div style={{ padding: 30, minHeight: '100%', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
            borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div>
          <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>Mesures corporelles</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Suivi composition corporelle · {mesures.length} entrées</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null) }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            borderRadius: 10, background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
          <Plus size={12} /> Nouvelle mesure
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={{ marginBottom: 16, padding: 20, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Nouvelle mesure</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 2fr', gap: 10, marginBottom: 10 }}>
            {FORM_FIELDS.map(f => (
              <div key={f.k}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{f.lbl}</p>
                <input type={f.t} step="0.1" placeholder={f.ph}
                  value={(form as any)[f.k]} onChange={e => setForm(v => ({ ...v, [f.k]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '9px 20px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 8, padding: '9px 14px', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {metrics.map(m => (
          <div key={m.l} style={{ padding: '22px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{m.l}</p>
            <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.v}</p>
            {m.d !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {m.d < 0 && !m.up  ? <TrendingDown size={12} style={{ color: TEAL }} />   : null}
                {m.d > 0 && m.up   ? <TrendingUp   size={12} style={{ color: ORANGE }} /> : null}
                {m.d < 0 && m.up   ? <TrendingDown size={12} style={{ color: TEAL }} />   : null}
                {m.d > 0 && !m.up  ? <TrendingUp   size={12} style={{ color: ORANGE }} /> : null}
                <span style={{ fontSize: 10, color: m.d < 0 ? TEAL : ORANGE }}>
                  {m.d > 0 ? '+' : ''}{m.d.toFixed(1)} {m.unit}
                </span>
              </div>
            )}
            {m.vals.length >= 2 && <MiniChart values={m.vals} color={m.color} />}
          </div>
        ))}
      </div>

      {/* IMC indicator */}
      {latest?.imc && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Indice de Masse Corporelle (IMC)</p>
            <div style={{ display: 'flex', height: 16, borderRadius: 99, overflow: 'hidden' }}>
              {[{ l: 'Sous-poids', color: '#3B82F6' }, { l: 'Normal', color: TEAL }, { l: 'Surpoids', color: '#F59E0B' }, { l: 'Obésité', color: ORANGE }]
                .map(z => <div key={z.l} style={{ flex: 1, background: z.color, opacity: 0.6 }} />)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {['< 18.5', '18.5–25', '25–30', '> 30'].map(l => (
                <span key={l} style={{ fontSize: 8, color: 'var(--text-muted)' }}>{l}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: TEAL, lineHeight: 1 }}>{latest.imc}</p>
            <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: TEAL, marginTop: 3 }}>Normal</p>
          </div>
        </div>
      )}

      {/* History table */}
      <div style={{ borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: ORANGE, textTransform: 'uppercase' }}>Historique des mesures</p>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{mesures.length} entrées</span>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 80px 72px',
          padding: '8px 20px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
          {['Date', 'Taille', 'Masse grasse', 'Masse musc.', 'IMC', ''].map(h => (
            <p key={h} style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</p>
          ))}
        </div>

        {mesures.map((m, i) => {
          const p = mesures[i + 1]

          // ── EDIT ROW ──
          if (editId === m.id) {
            return (
              <form key={m.id} onSubmit={saveEdit}
                style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: `${ORANGE}08`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 2fr', gap: 8 }}>
                  {FORM_FIELDS.map(f => (
                    <div key={f.k}>
                      <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{f.lbl}</p>
                      <input type={f.t} step="0.1" placeholder={f.ph}
                        value={(editForm as any)[f.k]} onChange={e => setEditForm(v => ({ ...v, [f.k]: e.target.value }))}
                        style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 5, background: TEAL, color: '#fff', borderRadius: 7, padding: '7px 16px', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                    <Check size={11} /> Enregistrer
                  </button>
                  <button type="button" onClick={cancelEdit}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 7, padding: '7px 12px', fontSize: 11, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <X size={11} /> Annuler
                  </button>
                </div>
              </form>
            )
          }

          // ── NORMAL ROW ──
          return (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 80px 72px',
              padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>{fmtDate(m.date)}</p>
                {m.notes && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.notes}</p>}
              </div>
              {[
                { v: m.taille,     p: p?.taille,     unit: 'cm', good: false },
                { v: m.massGrasse, p: p?.massGrasse, unit: '%',  good: false },
                { v: m.massMuscul, p: p?.massMuscul, unit: 'kg', good: true  },
                { v: m.imc,        p: p?.imc,        unit: '',   good: null  },
              ].map((s, si) => {
                const d = s.v != null && s.p != null ? s.v - s.p : null
                const isGood = d == null ? null : (s.good ? d > 0 : d < 0)
                return (
                  <div key={si} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--wheat)' }}>
                      {s.v != null ? `${s.v} ${s.unit}` : '—'}
                    </span>
                    {d !== null && (
                      <span style={{ fontSize: 9, color: isGood ? TEAL : ORANGE }}>
                        {d > 0 ? '▲' : '▼'}{Math.abs(d).toFixed(1)}
                      </span>
                    )}
                  </div>
                )
              })}
              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(m)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                    borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <Pencil size={11} style={{ color: TEAL }} />
                </button>
                <button onClick={() => deleteMesure(m.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                    borderRadius: 7, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <Trash2 size={11} style={{ color: ORANGE }} />
                </button>
              </div>
            </div>
          )
        })}

        {mesures.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune mesure enregistrée</p>
          </div>
        )}
      </div>
    </div>
  )
}
