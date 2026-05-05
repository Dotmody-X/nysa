'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Scale } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL    = '#0E9594'
const TEAL_BG = '#11686A'
const ORANGE  = '#F2542D'
const WHEAT   = '#F0E4CC'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtDateShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  if (data.length < 2) return null
  const weights = data.map(d => d.weight)
  const min = Math.min(...weights) - 0.5
  const max = Math.max(...weights) + 0.5
  const W = 800; const H = 200; const PAD = 30

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + ((max - d.weight) / (max - min)) * (H - PAD * 2)
    return { x, y, ...d }
  })
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TEAL} stopOpacity={0.2} />
          <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD + t * (H - PAD * 2)
        const val = max - t * (max - min)
        return (
          <g key={t}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD - 8} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {val.toFixed(1)}
            </text>
          </g>
        )
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#wgrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? ORANGE : TEAL}
            stroke={i === pts.length - 1 ? '#fff' : 'none'} strokeWidth={2} />
          {(i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 6) === 0) && (
            <text x={p.x} y={H - 6} textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {fmtDateShort(p.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function PoidsPage() {
  const router = useRouter()
  const { metrics, addWeight, latestWeight, weightTrend } = useHealth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), weight: '' })

  const weightData = metrics
    .filter(m => m.weight_kg != null)
    .slice().reverse()
    .map(m => ({ date: m.date, weight: m.weight_kg! }))

  const minW = weightData.length ? Math.min(...weightData.map(d => d.weight)) : null
  const maxW = weightData.length ? Math.max(...weightData.map(d => d.weight)) : null
  const avgW = weightData.length ? weightData.reduce((s, d) => s + d.weight, 0) / weightData.length : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!form.weight) return
    await addWeight(form.date, parseFloat(form.weight))
    setShowForm(false); setForm({ date: new Date().toISOString().slice(0, 10), weight: '' })
  }

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
          <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: TEAL, lineHeight: 1 }}>Évolution du poids</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Historique complet · {metrics.length} mesures</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            borderRadius: 10, background: TEAL_BG, color: WHEAT, ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
          <Plus size={12} /> Ajouter une mesure
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 16,
          borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }} />
          <input type="number" step="0.1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            placeholder="Poids en kg" autoFocus
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <button type="submit" style={{ background: TEAL_BG, color: WHEAT, borderRadius: 8, padding: '8px 20px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            Enregistrer
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 14px', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>×</button>
        </form>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'Poids actuel', v: latestWeight ? `${latestWeight} kg` : '—', color: ORANGE,
            sub: weightTrend != null ? `${weightTrend > 0 ? '+' : ''}${weightTrend?.toFixed(1)} kg vs hier` : '' },
          { l: 'Minimum',   v: minW ? `${minW.toFixed(1)} kg` : '—', color: TEAL,  sub: '' },
          { l: 'Maximum',   v: maxW ? `${maxW.toFixed(1)} kg` : '—', color: WHEAT, sub: '' },
          { l: 'Moyenne',   v: avgW ? `${avgW.toFixed(1)} kg` : '—', color: TEAL,  sub: `sur ${weightData.length} mesures` },
        ].map(s => (
          <div key={s.l} style={{ padding: '18px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{s.l}</p>
            <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.v}</p>
            {s.sub && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: 24, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: TEAL, textTransform: 'uppercase', marginBottom: 16 }}>
          Courbe de poids
        </p>
        {weightData.length >= 2 ? (
          <WeightChart data={weightData} />
        ) : (
          <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <Scale size={28} style={{ color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pas encore assez de données pour afficher la courbe</p>
          </div>
        )}
      </div>

      {/* History table */}
      <div style={{ borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: ORANGE, textTransform: 'uppercase' }}>Historique</p>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{metrics.length} entrées</span>
        </div>
        {metrics.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune mesure enregistrée</p>
          </div>
        ) : metrics.map((m, i) => {
          const prev = metrics[i + 1]
          const diff = prev?.weight_kg != null && m.weight_kg != null ? m.weight_kg - prev.weight_kg : null
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px',
              borderBottom: '1px solid var(--border)', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>{fmtDate(m.date)}</p>
                {m.notes && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.notes}</p>}
              </div>
              <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: 'var(--wheat)', minWidth: 80, textAlign: 'right' }}>
                {m.weight_kg} <span style={{ fontSize: 11, fontWeight: 500 }}>kg</span>
              </p>
              {diff !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 70, justifyContent: 'flex-end' }}>
                  {diff < 0
                    ? <TrendingDown size={13} style={{ color: TEAL }} />
                    : diff > 0 ? <TrendingUp size={13} style={{ color: ORANGE }} />
                    : null}
                  <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: diff < 0 ? TEAL : diff > 0 ? ORANGE : 'var(--text-muted)' }}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
