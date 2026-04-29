'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Target, Award, Droplets, Activity, Trash2, Check } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL   = '#0E9594'
const TEAL_BG = '#11686A'
const ORANGE = '#F2542D'
const WHEAT  = '#F0E4CC'

type Objectif = {
  id: string; label: string; target: number; unit: string; color: string
  category: 'course' | 'poids' | 'nutrition' | 'hydratation' | 'autre'
  period: 'jour' | 'semaine' | 'mois' | 'total'
  icon: string
}

const ICONS: Record<string, React.ReactNode> = {
  activity: <Activity size={16} />,
  target:   <Target size={16} />,
  award:    <Award size={16} />,
  drops:    <Droplets size={16} />,
}

function DonutProgress({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2; const cx = size / 2; const cy = size / 2
  const circ = 2 * Math.PI * r
  const dash  = Math.min(pct, 100) / 100 * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x={cx} y={cy + 4} textAnchor="middle"
        style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 900, fill: color }}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function ObjectifsPage() {
  const router = useRouter()
  const { activities, metrics } = useHealth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', target: '', unit: 'km', color: ORANGE, period: 'semaine' as const, category: 'course' as const, icon: 'activity' })

  const [objectifs, setObjectifs] = useState<Objectif[]>([
    { id: '1', label: 'Distance / semaine',     target: 30,  unit: 'km',      color: ORANGE,   category: 'course',      period: 'semaine', icon: 'activity' },
    { id: '2', label: 'Sorties / semaine',       target: 4,   unit: 'sorties', color: WHEAT,    category: 'course',      period: 'semaine', icon: 'activity' },
    { id: '3', label: 'Distance totale',         target: 500, unit: 'km',      color: TEAL,     category: 'course',      period: 'total',   icon: 'award' },
    { id: '4', label: 'Courir 100 km / mois',    target: 100, unit: 'km',      color: ORANGE,   category: 'course',      period: 'mois',    icon: 'target' },
    { id: '5', label: 'Hydratation journalière', target: 2.5, unit: 'L',       color: '#3B82F6', category: 'hydratation', period: 'jour',   icon: 'drops' },
  ])

  // Calculer la valeur actuelle pour chaque objectif
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  weekStart.setHours(0, 0, 0, 0)

  const thisWeek = activities.filter(a => new Date(a.date + 'T12:00:00') >= weekStart)
  const kmWeek   = thisWeek.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const allKm    = activities.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const monthKm  = activities
    .filter(a => { const d = new Date(a.date + 'T12:00:00'); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() })
    .reduce((s, a) => s + (a.distance_km ?? 0), 0)

  function getCurrentValue(obj: Objectif): number {
    if (obj.id === '1') return kmWeek
    if (obj.id === '2') return thisWeek.length
    if (obj.id === '3') return allKm
    if (obj.id === '4') return monthKm
    return 0
  }

  function addObjectif(e: React.FormEvent) {
    e.preventDefault(); if (!form.label || !form.target) return
    setObjectifs(o => [...o, {
      id: Date.now().toString(), label: form.label,
      target: parseFloat(form.target), unit: form.unit,
      color: form.color, category: form.category,
      period: form.period, icon: form.icon,
    }])
    setShowForm(false)
    setForm({ label: '', target: '', unit: 'km', color: ORANGE, period: 'semaine', category: 'course', icon: 'activity' })
  }

  function removeObjectif(id: string) {
    setObjectifs(o => o.filter(x => x.id !== id))
  }

  const PERIOD_LABELS: Record<string, string> = { jour: '/ jour', semaine: '/ semaine', mois: '/ mois', total: 'total' }
  const CATEGORY_COLORS: Record<string, string> = { course: TEAL_BG, poids: '#5B6F3A', nutrition: '#7C3AED', hydratation: '#1D4ED8', autre: '#374151' }

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
          <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>Défis &amp; Objectifs</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{objectifs.length} objectifs actifs</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            borderRadius: 10, background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
          <Plus size={12} /> Ajouter un objectif
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={addObjectif} style={{ marginBottom: 16, padding: 20, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Nouvel objectif</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Intitulé</p>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="ex: Courir 5 km / semaine" autoFocus
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Cible</p>
              <input type="number" step="0.1" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder="ex: 30"
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Unité</p>
              <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="km"
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Période</p>
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as any }))}
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }}>
                <option value="jour">Par jour</option>
                <option value="semaine">Par semaine</option>
                <option value="mois">Par mois</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Couleur</p>
              <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                {[ORANGE, TEAL, WHEAT, '#3B82F6', '#7C3AED', '#10B981'].map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit"
              style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '9px 20px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
              Créer l&apos;objectif
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 8, padding: '9px 14px', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Objectifs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {objectifs.map(obj => {
          const current = getCurrentValue(obj)
          const pct     = Math.min(100, (current / obj.target) * 100)
          const done    = pct >= 100
          return (
            <div key={obj.id} style={{ padding: '20px 22px', borderRadius: 12, background: 'var(--bg-card)',
              border: `1px solid ${done ? obj.color + '44' : 'var(--border)'}`,
              display: 'flex', gap: 16, alignItems: 'center',
              background: done ? `${obj.color}0A` : 'var(--bg-card)' as any }}>
              {/* Donut */}
              <DonutProgress pct={pct} color={obj.color} size={64} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: CATEGORY_COLORS[obj.category] || 'var(--border)',
                        color: WHEAT, fontSize: 8, ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {obj.category}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{PERIOD_LABELS[obj.period]}</span>
                    </div>
                    <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: done ? obj.color : 'var(--wheat)' }}>{obj.label}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {done && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: obj.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} style={{ color: '#fff' }} />
                      </div>
                    )}
                    <button onClick={() => removeObjectif(obj.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: obj.color, transition: 'width .5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: obj.color }}>
                    {typeof current === 'number' ? (Number.isInteger(current) ? current : current.toFixed(1)) : current} {obj.unit}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ {obj.target} {obj.unit}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {objectifs.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Target size={36} style={{ color: 'var(--text-muted)' }} />
          <p style={{ ...DF, fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>Aucun objectif défini</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Crée ton premier objectif pour suivre ta progression.</p>
          <button onClick={() => setShowForm(true)}
            style={{ background: ORANGE, color: '#fff', borderRadius: 10, padding: '10px 24px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', marginTop: 8 }}>
            + Créer un objectif
          </button>
        </div>
      )}
    </div>
  )
}
