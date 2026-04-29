'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, TrendingDown, TrendingUp, Activity, Moon, Heart, Droplets,
  ChevronRight, Check, Utensils, Apple as AppleIcon, Scale, Flame, Zap
} from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'

/* ─── Constants ─────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL   = '#0E9594'
const ORANGE = '#F2542D'
const WHEAT  = '#F0E4CC'
const TEAL_BG = '#11686A'
const DARK   = '#1A1A2E'

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtPace(sec: number) {
  if (!sec || sec <= 0) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}/km`
}
function fmtDur(sec: number) {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/* ─── SVG Helpers ───────────────────────────────────────────── */
function WeightSparkLine({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const min = Math.min(...data); const max = Math.max(...data, min + 0.1)
  const W = 220; const H = 50
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / (max - min)) * (H - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <polyline points={pts} fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i}
          cx={(i / (data.length - 1)) * W}
          cy={H - ((v - min) / (max - min)) * (H - 8)}
          r={i === data.length - 1 ? 4 : 2}
          fill={i === data.length - 1 ? ORANGE : TEAL}
          stroke={i === data.length - 1 ? '#fff' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  )
}

function HrSparkLine({ data }: { data: number[] }) {
  if (data.filter(v => v > 0).length < 2) return null
  const valid = data.filter(v => v > 0)
  const min = Math.min(...valid) - 5; const max = Math.max(...valid) + 5
  const W = 200; const H = 45
  const pts = data.map((v, i) => {
    if (!v) return null
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / (max - min)) * (H - 6)
    return `${x},${y}`
  }).filter(Boolean).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <polyline points={pts} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WeekBars({ data, labels, color = ORANGE, max: maxProp }:
  { data: number[]; labels: string[]; color?: string; max?: number }) {
  const max = maxProp ?? Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 70 }}>
      {data.map((v, i) => {
        const h = v > 0 ? Math.max(6, (v / max) * 62) : 4
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {v > 0 && <span style={{ fontSize: 8, color: 'rgba(240,228,204,0.6)', ...DF, fontWeight: 700 }}>{v.toFixed(1)}</span>}
            <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0',
              background: v > 0 ? color : 'rgba(240,228,204,0.1)' }} />
            <span style={{ fontSize: 8, color: 'rgba(240,228,204,0.5)', ...DF, fontWeight: 600 }}>{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Card style shortcuts ──────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function HealthPage() {
  const router = useRouter()
  const { metrics, activities, loading, addWeight, addRun, latestWeight, weightTrend } = useHealth()

  /* ── Forms state ─────────────────── */
  const [showWForm, setShowWForm] = useState(false)
  const [showRForm, setShowRForm] = useState(false)
  const [wForm, setWForm]         = useState({ date: new Date().toISOString().slice(0, 10), weight: '' })
  const [rForm, setRForm]         = useState({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })

  /* ── Hydration local state ───────── */
  const [glasses, setGlasses]     = useState(0)
  const GLASS_TARGET = 8

  /* ── Résumé du jour — éditable + persisté localStorage ── */
  const [resume, setResume] = useState({ pas: 0, pasTarget: 10000, cal: 1842, calTarget: 2200 })
  const [editResume, setEditResume] = useState(false)
  const [resumeForm, setResumeForm] = useState({ pas: '', cal: '', pasTarget: '', calTarget: '' })

  /* ── Nutrition local state ───────── */
  const [nutrition] = useState({ cal: 1842, calTarget: 2200, prot: 120, protTarget: 150, gluc: 180, glucTarget: 250, lip: 65, lipTarget: 80 })

  /* ── Mesures corporelles — sync localStorage (useEffect pour éviter SSR) ── */
  const [mesures, setMesures] = useState<{ taille?: number; massGrasse?: number; massMuscul?: number; imc?: number; prev?: { taille?: number; massGrasse?: number; massMuscul?: number } }>({ taille: 81, massGrasse: 15.2, massMuscul: 56.3, imc: 22.1 })

  /* ── Objectifs — sync localStorage ── */
  const [lsObjectifs, setLsObjectifs] = useState<Array<{ id: string; label: string; target: number; unit: string; color: string; period: string; category: string; currentOverride?: number }>>([])

  useEffect(() => {
    try {
      const savedM = localStorage.getItem('nysa_mesures')
      if (savedM) {
        const arr = JSON.parse(savedM) as Array<{ taille?: number; massGrasse?: number; massMuscul?: number; imc?: number }>
        const latest = arr[0] ?? {}
        const prev   = arr[1] ?? {}
        setMesures({ ...latest, prev })
      }
    } catch {}

    try {
      const savedO = localStorage.getItem('nysa_objectifs')
      if (savedO) setLsObjectifs(JSON.parse(savedO))
    } catch {}

    try {
      const savedR = localStorage.getItem('nysa_resume_jour')
      if (savedR) setResume(JSON.parse(savedR))
    } catch {}
  }, [])

  /* ── Stats derivation ────────────── */
  const today     = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  weekStart.setHours(0, 0, 0, 0)

  const thisWeek  = activities.filter(a => new Date(a.date + 'T12:00:00') >= weekStart)
  const kmWeek    = parseFloat(thisWeek.reduce((s, a) => s + (a.distance_km ?? 0), 0).toFixed(2))
  const secWeek   = thisWeek.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const elevWeek  = thisWeek.reduce((s, a) => s + (a.elevation_m ?? 0), 0)
  const avgPace   = kmWeek > 0 && secWeek > 0 ? secWeek / kmWeek : 0

  // Day-by-day bars
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const dayKm     = new Array(7).fill(0)
  thisWeek.forEach(a => {
    const d = new Date(a.date + 'T12:00:00')
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
    dayKm[idx] += a.distance_km ?? 0
  })
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

  // Weight history for sparkline (last 14 points)
  const weightHistory = metrics.slice(0, 14).reverse().map(m => m.weight_kg ?? 0).filter(v => v > 0)

  // HR from activities
  const hrData = activities.slice(0, 7).reverse().map(a => a.heart_rate_avg ?? 0)
  const avgHr  = hrData.filter(v => v > 0).length > 0
    ? Math.round(hrData.filter(v => v > 0).reduce((s, v) => s + v, 0) / hrData.filter(v => v > 0).length)
    : null

  // 6-month total for objectifs
  const monthKm = activities
    .filter(a => { const d = new Date(a.date + 'T12:00:00'); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() })
    .reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const allKm   = activities.reduce((s, a) => s + (a.distance_km ?? 0), 0)

  async function handleWeight(e: React.FormEvent) {
    e.preventDefault(); if (!wForm.weight) return
    await addWeight(wForm.date, parseFloat(wForm.weight))
    setShowWForm(false); setWForm({ date: new Date().toISOString().slice(0, 10), weight: '' })
  }
  async function handleRun(e: React.FormEvent) {
    e.preventDefault(); if (!rForm.distance) return
    const [h, m] = rForm.duration.split(':').map(Number)
    const dur    = rForm.duration ? h * 3600 + (m || 0) * 60 : undefined
    await addRun({ date: rForm.date, distance_km: parseFloat(rForm.distance), duration_seconds: dur, notes: rForm.notes || undefined })
    setShowRForm(false); setRForm({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12,
  }

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`
        .health-btn:hover { opacity: 0.85; }
        .health-row:hover { background: var(--bg-card-hover) !important; }
        .glass-btn { cursor: pointer; transition: transform .1s; }
        .glass-btn:hover { transform: scale(1.1); }
      `}</style>

      {/* ── Inline forms ──────────────────────────────────── */}
      {showWForm && (
        <form onSubmit={handleWeight} style={{ display: 'flex', gap: 8, marginBottom: 10, padding: 14,
          borderRadius: 10, ...card() }}>
          <input type="date" value={wForm.date} onChange={e => setWForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
          <input type="number" step="0.1" value={wForm.weight} onChange={e => setWForm(f => ({ ...f, weight: e.target.value }))}
            placeholder="Poids (kg)" autoFocus style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" style={{ background: TEAL_BG, color: WHEAT, borderRadius: 8, padding: '8px 16px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            Enregistrer
          </button>
          <button type="button" onClick={() => setShowWForm(false)} style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 12px', ...DF, fontWeight: 700, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
            ×
          </button>
        </form>
      )}
      {showRForm && (
        <form onSubmit={handleRun} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, padding: 14, borderRadius: 10, ...card() }}>
          <input type="date" value={rForm.date} onChange={e => setRForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
          <input type="number" step="0.01" value={rForm.distance} onChange={e => setRForm(f => ({ ...f, distance: e.target.value }))}
            placeholder="Distance (km)" autoFocus style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
          <input type="text" value={rForm.duration} onChange={e => setRForm(f => ({ ...f, duration: e.target.value }))}
            placeholder="Durée (h:mm)" style={{ ...inputStyle, width: 110 }} />
          <input type="text" value={rForm.notes} onChange={e => setRForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes…" style={{ ...inputStyle, flex: 2, minWidth: 140 }} />
          <button type="submit" style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '8px 16px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            Ajouter
          </button>
          <button type="button" onClick={() => setShowRForm(false)} style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', borderRadius: 8, padding: '8px 12px', ...DF, fontWeight: 700, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
            ×
          </button>
        </form>
      )}

      {/* ══════════════════════════════════════════════════
          GRID — 4 cols × 5 rows
      ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '300px 300px 500px 400px 380px',
        gap: 10,
      }}>

        {/* ── R1 C1-2 : HERO ──────────────────────────────── */}
        <div style={{ gridColumn: 'span 2', padding: '24px 28px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div>
            <p style={{ ...DF, fontSize: 42, fontWeight: 900, color: ORANGE, lineHeight: 0.95, marginBottom: 6 }}>HEALTH.</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Suivez. Progressez. Prenez soin de vous.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="health-btn" onClick={() => setShowWForm(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                  background: TEAL_BG, color: WHEAT, ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                <Scale size={11} /> + Poids
              </button>
              <button className="health-btn" onClick={() => setShowRForm(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
                  background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                <Activity size={11} /> + Run
              </button>
            </div>
          </div>
          {/* 4 KPIs en ligne unique */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { l: 'Distance',  v: `${kmWeek.toFixed(1)} km`, sub: `${thisWeek.length} sortie${thisWeek.length !== 1 ? 's' : ''}`, color: ORANGE },
              { l: 'Temps',     v: fmtDur(secWeek),            sub: 'cette semaine', color: TEAL },
              { l: 'Allure',    v: avgPace > 0 ? fmtPace(avgPace) : '—', sub: 'moy. semaine', color: WHEAT },
              { l: 'Poids',     v: latestWeight ? `${latestWeight}kg` : '—', sub: weightTrend != null ? `${weightTrend > 0 ? '+' : ''}${weightTrend?.toFixed(1)} kg` : 'Aucune donnée', color: TEAL },
            ].map(s => (
              <div key={s.l} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.l}</p>
                <p style={{ ...DF, fontSize: 15, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 3 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── R1 C3-4 : RÉSUMÉ DU JOUR ────────────────────── */}
        <div style={{ ...orangeCard(), gridColumn: 'span 2', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <p style={{ ...lbl('#1A0A0A') }}>Résumé du jour</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(26,10,10,0.5)' }}>{today.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              <button onClick={() => { setEditResume(v => !v); setResumeForm({ pas: String(resume.pas), cal: String(resume.cal), pasTarget: String(resume.pasTarget), calTarget: String(resume.calTarget) }) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'rgba(26,10,10,0.15)', border: 'none', cursor: 'pointer' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </div>

          {/* Edit form */}
          {editResume && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: 'rgba(26,10,10,0.15)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { k: 'pas',       lbl: 'Pas aujourd\'hui', ph: '8000' },
                { k: 'pasTarget', lbl: 'Objectif pas',     ph: '10000' },
                { k: 'cal',       lbl: 'Calories',         ph: '1842' },
                { k: 'calTarget', lbl: 'Objectif kcal',    ph: '2200' },
              ].map(f => (
                <div key={f.k}>
                  <p style={{ fontSize: 8, color: 'rgba(26,10,10,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{f.lbl}</p>
                  <input type="number" placeholder={f.ph} value={(resumeForm as any)[f.k]}
                    onChange={e => setResumeForm(v => ({ ...v, [f.k]: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(26,10,10,0.15)', border: '1px solid rgba(26,10,10,0.25)', borderRadius: 6, padding: '6px 8px', color: '#1A0A0A', fontSize: 12 }} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 4', display: 'flex', gap: 6, marginTop: 2 }}>
                <button onClick={() => {
                  const updated = { pas: parseInt(resumeForm.pas) || 0, pasTarget: parseInt(resumeForm.pasTarget) || 10000, cal: parseInt(resumeForm.cal) || 0, calTarget: parseInt(resumeForm.calTarget) || 2200 }
                  setResume(updated)
                  localStorage.setItem('nysa_resume_jour', JSON.stringify(updated))
                  setEditResume(false)
                }} style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(26,10,10,0.3)', color: '#1A0A0A', border: 'none', fontSize: 11, ...DF, fontWeight: 700, cursor: 'pointer' }}>
                  Enregistrer
                </button>
                <button onClick={() => setEditResume(false)} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(26,10,10,0.1)', color: '#1A0A0A', border: 'none', fontSize: 11, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { icon: <Flame size={16} />,    l: 'Pas',      v: resume.pas > 0 ? resume.pas.toLocaleString() : '—',  obj: resume.pasTarget.toLocaleString(), unit: '' },
              { icon: <Activity size={16} />, l: 'Activité', v: fmtDur(secWeek),                                      obj: '60 min',                          unit: '' },
              { icon: <Zap size={16} />,      l: 'Calories', v: resume.cal > 0 ? resume.cal.toLocaleString() : '—',  obj: resume.calTarget.toLocaleString(), unit: 'kcal' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(26,10,10,0.12)', borderRadius: 10, padding: '14px 12px' }}>
                <div style={{ color: '#1A0A0A', marginBottom: 6 }}>{s.icon}</div>
                <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>
                  {s.v}{s.unit && <span style={{ fontSize: 11, marginLeft: 2 }}>{s.unit}</span>}
                </p>
                <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.55)', marginTop: 3 }}>Objectif {s.obj}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(26,10,10,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AppleIcon size={16} style={{ color: '#1A0A0A', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, color: '#1A0A0A' }}>Apple Santé</p>
              <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.6)' }}>Bientôt disponible — synchronisation pas, calories, sommeil</p>
            </div>
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: 'rgba(26,10,10,0.2)', color: '#1A0A0A', ...DF, fontWeight: 700 }}>Soon</span>
          </div>
        </div>

        {/* ── R2 C1 : COURSE À PIED ───────────────────────── */}
        <div style={{ ...tealCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ ...lbl('rgba(240,228,204,0.55)'), marginBottom: 4 }}>Course à pied</p>
              <p style={{ fontSize: 10, color: 'rgba(240,228,204,0.45)' }}>Cette semaine</p>
            </div>
            <Activity size={18} style={{ color: 'rgba(240,228,204,0.35)' }} />
          </div>
          <div>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: WHEAT, lineHeight: 1, marginBottom: 3 }}>
              {kmWeek.toFixed(1)} <span style={{ fontSize: 16, fontWeight: 500 }}>km</span>
            </p>
            <p style={{ fontSize: 10, color: 'rgba(240,228,204,0.5)' }}>{thisWeek.length} session{thisWeek.length !== 1 ? 's' : ''}</p>
          </div>
          <WeekBars data={dayKm} labels={dayLabels} color={ORANGE} />
          <button onClick={() => router.push('/sport')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6 }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(240,228,204,0.6)' }}>VOIR LE PROGRAMME</span>
            <ChevronRight size={11} style={{ color: 'rgba(240,228,204,0.6)' }} />
          </button>
        </div>

        {/* ── R2 C2 : POIDS ───────────────────────────────── */}
        <div style={{ ...tealCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ ...lbl('rgba(240,228,204,0.55)') }}>Poids</p>
            <Scale size={18} style={{ color: 'rgba(240,228,204,0.35)' }} />
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(240,228,204,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Aujourd&apos;hui</p>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: WHEAT, lineHeight: 1, marginBottom: 4 }}>
              {latestWeight ? <>{latestWeight} <span style={{ fontSize: 14, fontWeight: 500 }}>kg</span></> : '—'}
            </p>
            {weightTrend !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {weightTrend < 0
                  ? <TrendingDown size={13} style={{ color: TEAL }} />
                  : <TrendingUp size={13} style={{ color: ORANGE }} />}
                <span style={{ fontSize: 11, color: weightTrend < 0 ? 'rgba(240,228,204,0.8)' : ORANGE }}>
                  {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg vs hier
                </span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 4 }}>
            <WeightSparkLine data={weightHistory} />
          </div>
          <button onClick={() => router.push('/health/poids')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(240,228,204,0.6)' }}>VOIR L&apos;ÉVOLUTION</span>
            <ChevronRight size={11} style={{ color: 'rgba(240,228,204,0.6)' }} />
          </button>
        </div>

        {/* ── R2 C3 : SOMMEIL ─────────────────────────────── */}
        <div style={{ ...darkCard(), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ ...lbl('rgba(160,130,220,0.7)') }}>Sommeil</p>
            <Moon size={18} style={{ color: 'rgba(160,130,220,0.5)' }} />
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Dernière nuit</p>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
              — <span style={{ fontSize: 16, fontWeight: 500 }}>h</span>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Qualité · —</p>
          </div>
          {/* Placeholder sleep bars */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
            {[3, 5, 8, 6, 7, 4, 8, 7, 6, 8, 5, 7, 6, 4, 8, 7, 5, 6].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h * 4, borderRadius: 2,
                background: `rgba(160,130,220,${0.15 + (h / 8) * 0.35})` }} />
            ))}
            <span style={{ position: 'absolute' }} /> {/* spacer */}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, background: 'rgba(160,130,220,0.08)', border: '1px solid rgba(160,130,220,0.15)', marginTop: 4 }}>
            <AppleIcon size={11} style={{ color: 'rgba(160,130,220,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'rgba(160,130,220,0.6)' }}>Apple Santé — synchronisation bientôt</span>
          </div>
        </div>

        {/* ── R2 C4 : FORME GÉNÉRALE ──────────────────────── */}
        <div style={{ ...card(), padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ ...lbl(TEAL) }}>Forme générale</p>
          {[
            { l: 'Running / sem.',    v: `${kmWeek.toFixed(1)} km`, pct: Math.min(100, (kmWeek / 30) * 100),            color: TEAL_BG },
            { l: 'Sorties / sem.',    v: `${thisWeek.length} / 4`,  pct: Math.min(100, (thisWeek.length / 4) * 100),    color: ORANGE },
            { l: 'Calories brûlées', v: '—',                        pct: 0,                                             color: '#5B6F3A' },
            { l: 'Hydratation',      v: `${glasses} / ${GLASS_TARGET}`, pct: Math.min(100, (glasses / GLASS_TARGET) * 100), color: '#3B82F6' },
          ].map(s => (
            <div key={s.l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}</span>
                <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: 'var(--wheat)' }}>{s.v}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 99, background: s.color, transition: 'width .5s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── R3 C1-2 : PROGRAMME COURSE ──────────────────── */}
        <div style={{ ...darkCard(), gridColumn: 'span 2', padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...lbl('rgba(255,255,255,0.5)') }}>Programme Course à Pied</p>
            <button onClick={() => router.push('/sport')}
              style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Plan actuel ▾
            </button>
          </div>

          {/* Sessions list from recent activities */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {activities.length === 0 && !loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
                <Activity size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Aucune session enregistrée</p>
                <button onClick={() => setShowRForm(true)}
                  style={{ ...DF, fontSize: 11, fontWeight: 700, color: ORANGE, background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Ajouter un run
                </button>
              </div>
            ) : activities.slice(0, 6).map((a, i) => {
              const isToday = a.date === today.toISOString().slice(0, 10)
              return (
                <div key={a.id} className="health-row" onClick={() => router.push(`/sport/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
                    background: isToday ? `rgba(242,84,45,0.15)` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isToday ? 'rgba(242,84,45,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isToday ? ORANGE : 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={16} style={{ color: isToday ? '#fff' : 'rgba(255,255,255,0.4)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: '#fff' }}>
                      {(a as any).title ?? `Sortie ${i + 1} — ${a.distance_km?.toFixed(1)} km`}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                      {a.duration_seconds ? fmtDur(a.duration_seconds) + ' · ' : ''}
                      {a.distance_km ? `${a.distance_km.toFixed(1)} km` : ''}
                      {a.elevation_m ? ` · +${a.elevation_m}m` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{fmtDate(a.date)}</p>
                    {a.pace_sec_per_km && (
                      <p style={{ ...DF, fontSize: 11, fontWeight: 800, color: TEAL, marginTop: 2 }}>{fmtPace(a.pace_sec_per_km)}</p>
                    )}
                  </div>
                  {isToday && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} style={{ color: '#fff' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={() => router.push('/sport')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0 0', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>VOIR TOUT LE PROGRAMME</span>
            <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
          </button>
        </div>

        {/* ── R3 C3-4 : ACTIVITÉ HEBDOMADAIRE ─────────────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...lbl('rgba(240,228,204,0.55)') }}>Activité hebdomadaire</p>
            <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.35)' }}>Cette semaine</span>
          </div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Durée totale', v: fmtDur(secWeek)       },
              { l: 'Distance',     v: `${kmWeek.toFixed(1)} km` },
              { l: 'Dénivelé',     v: elevWeek > 0 ? `+${elevWeek}m` : '—' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(240,228,204,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 9, color: 'rgba(240,228,204,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.l}</p>
                <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{s.v}</p>
              </div>
            ))}
          </div>
          {/* Multi-bar chart */}
          <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {dayLabels.map((day, i) => {
              const km = dayKm[i]
              const maxKm = Math.max(...dayKm, 1)
              const h  = km > 0 ? Math.max(8, (km / maxKm) * 150) : 6
              const isToday = i === todayIdx
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {km > 0 && <span style={{ ...DF, fontSize: 9, fontWeight: 800, color: isToday ? ORANGE : 'rgba(240,228,204,0.55)' }}>{km.toFixed(1)}</span>}
                  <div style={{
                    width: '100%', height: h, borderRadius: '4px 4px 0 0',
                    background: km > 0 ? (isToday ? ORANGE : 'rgba(240,228,204,0.35)') : 'rgba(240,228,204,0.08)',
                  }} />
                  <span style={{ ...DF, fontSize: 9, fontWeight: isToday ? 800 : 600, color: isToday ? ORANGE : 'rgba(240,228,204,0.45)', textTransform: 'uppercase' }}>{day}</span>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(240,228,204,0.1)' }}>
            {[{ c: TEAL, l: 'Course' }, { c: ORANGE, l: 'Aujourd\'hui' }, { c: 'rgba(240,228,204,0.35)', l: 'Autre' }].map(s => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
                <span style={{ fontSize: 9, color: 'rgba(240,228,204,0.45)' }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── R4 C1 : FRÉQUENCE CARDIAQUE ─────────────────── */}
        <div style={{ ...darkCard(), padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ ...lbl('rgba(255,80,80,0.7)') }}>Fréquence cardiaque</p>
            <Heart size={16} style={{ color: 'rgba(255,80,80,0.5)' }} />
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Repos (moy.)</p>
            <p style={{ ...DF, fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {avgHr ?? '—'} <span style={{ fontSize: 14, fontWeight: 500 }}>bpm</span>
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <HrSparkLine data={hrData} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {activities.slice(0, 2).map(a => a.heart_rate_avg && (
              <div key={a.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{fmtDate(a.date)}</p>
                <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: '#ff5050', marginTop: 2 }}>{a.heart_rate_avg} <span style={{ fontSize: 10 }}>bpm</span></p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/health/frequence-cardiaque')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 'auto' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>VOIR PLUS</span>
            <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </button>
        </div>

        {/* ── R4 C2 : NUTRITION ───────────────────────────── */}
        <div style={{ ...darkCard(), padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ ...lbl('rgba(255,255,255,0.4)') }}>Nutrition</p>
            <Utensils size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Calories aujourd&apos;hui</p>
            <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {nutrition.cal.toLocaleString()} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>/ {nutrition.calTarget.toLocaleString()} kcal</span>
            </p>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(nutrition.cal / nutrition.calTarget) * 100}%`, borderRadius: 99, background: TEAL }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Protéines', v: nutrition.prot, t: nutrition.protTarget, c: TEAL },
              { l: 'Glucides',  v: nutrition.gluc, t: nutrition.glucTarget, c: ORANGE },
              { l: 'Lipides',   v: nutrition.lip,  t: nutrition.lipTarget,  c: 'rgba(255,255,255,0.4)' },
            ].map(m => (
              <div key={m.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: m.c }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{m.l}</span>
                  </div>
                  <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: '#fff' }}>{m.v}g <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {m.t}g</span></span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(m.v / m.t) * 100}%`, borderRadius: 99, background: m.c }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/recettes')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 'auto' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>VOIR LES RECETTES</span>
            <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </button>
        </div>

        {/* ── R4 C3 : HYDRATATION ─────────────────────────── */}
        <div style={{ ...orangeCard(), padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ ...lbl('#1A0A0A') }}>Hydratation</p>
            <Droplets size={16} style={{ color: 'rgba(26,10,10,0.5)' }} />
          </div>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Eau bue</p>
            <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>
              {(glasses * 0.25).toFixed(1)} <span style={{ fontSize: 14, fontWeight: 500 }}>L</span>
              <span style={{ fontSize: 13, color: 'rgba(26,10,10,0.4)', fontWeight: 500 }}> / 2,5 L</span>
            </p>
            <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.5)', marginTop: 3 }}>{Math.round((glasses / GLASS_TARGET) * 100)}% de l&apos;objectif</p>
          </div>
          {/* Glasses grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {Array.from({ length: GLASS_TARGET }).map((_, i) => (
              <button key={i} className="glass-btn" onClick={() => setGlasses(i < glasses ? i : i + 1)}
                style={{ aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: i < glasses ? 'rgba(26,10,10,0.3)' : 'rgba(26,10,10,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={16} style={{ color: i < glasses ? '#1A0A0A' : 'rgba(26,10,10,0.3)' }} />
              </button>
            ))}
          </div>
          <button onClick={() => setGlasses(v => Math.min(GLASS_TARGET, v + 1))}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(26,10,10,0.15)', border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer', justifyContent: 'center' }}>
            <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#1A0A0A' }}>+ AJOUTER UN VERRE</span>
          </button>
        </div>

        {/* ── R4 C4 : APPLE SANTÉ ─────────────────────────── */}
        <div style={{ ...card(), padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ ...lbl(TEAL) }}>Intégrations santé</p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <AppleIcon size={18} />, name: 'Apple Santé', desc: 'Pas, sommeil, calories, FC', status: 'soon', color: '#666' },
              { icon: <Activity size={18} />,  name: 'Strava',      desc: 'Activités course importées', status: 'active', color: '#FC4C02' },
              { icon: <Heart size={18} />,     name: 'Garmin',      desc: 'Montres & capteurs',         status: 'soon', color: '#007DC3' },
            ].map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
                background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: 'var(--wheat)' }}>{s.name}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.desc}</p>
                </div>
                <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                  background: s.status === 'active' ? 'rgba(14,149,148,0.2)' : 'var(--border)',
                  color: s.status === 'active' ? TEAL : 'var(--text-muted)' }}>
                  {s.status === 'active' ? 'Actif' : 'Bientôt'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(14,149,148,0.08)', border: '1px solid rgba(14,149,148,0.2)' }}>
            <p style={{ fontSize: 10, color: TEAL, ...DF, fontWeight: 600 }}>Sync Recettes → Nutrition</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Les recettes consommées alimenteront automatiquement le suivi nutritionnel.</p>
          </div>
        </div>

        {/* ── R5 C1-2 : MESURES CORPORELLES ───────────────── */}
        <div style={{ ...card(), gridColumn: 'span 2', padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...lbl() }}>Mesures corporelles</p>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: 1 }}>
            {(() => {
              const p = (mesures as any).prev ?? {}
              const fmtDelta = (curr?: number, prev?: number, unit = '') => {
                if (curr == null || prev == null) return ''
                const d = curr - prev
                return `${d > 0 ? '+' : ''}${d.toFixed(1)} ${unit}`.trim()
              }
              return [
                { l: 'Tour de taille',    v: mesures.taille     != null ? `${mesures.taille} cm`     : '—', delta: fmtDelta(mesures.taille,     p.taille,     'cm'), up: mesures.taille != null && p.taille != null ? mesures.taille < p.taille : false, color: TEAL   },
                { l: 'Masse grasse',      v: mesures.massGrasse != null ? `${mesures.massGrasse} %`  : '—', delta: fmtDelta(mesures.massGrasse, p.massGrasse, '%'),  up: mesures.massGrasse != null && p.massGrasse != null ? mesures.massGrasse < p.massGrasse : false, color: TEAL   },
                { l: 'Masse musculaire',  v: mesures.massMuscul != null ? `${mesures.massMuscul} kg` : '—', delta: fmtDelta(mesures.massMuscul, p.massMuscul, 'kg'), up: mesures.massMuscul != null && p.massMuscul != null ? mesures.massMuscul > p.massMuscul : true,  color: ORANGE },
                { l: 'IMC',              v: mesures.imc        != null ? String(mesures.imc)        : '—', delta: mesures.imc != null && mesures.imc < 25 ? 'Normal' : mesures.imc != null ? 'Surpoids' : '', up: null, color: WHEAT  },
              ]
            })().map(s => (
              <div key={s.l} style={{ padding: '16px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.l}</p>
                <p style={{ ...DF, fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.v}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {s.up === true  && <TrendingUp size={11}   style={{ color: ORANGE }} />}
                  {s.up === false && <TrendingDown size={11} style={{ color: TEAL }} />}
                  <span style={{ fontSize: 9, color: s.up === true ? ORANGE : s.up === false ? TEAL : 'var(--text-muted)' }}>{s.delta}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/health/mesures')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0 0', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>VOIR L&apos;HISTORIQUE</span>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* ── R5 C3-4 : DÉFIS & OBJECTIFS ─────────────────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ ...lbl('rgba(240,228,204,0.55)') }}>Défis &amp; Objectifs</p>

          {/* Objectif principal — dynamique depuis localStorage */}
          {(() => {
            const mainObj = lsObjectifs[0] ?? { id: '4', label: 'Courir 100 km / mois', target: 100, unit: 'km', color: ORANGE }
            const autoVal = mainObj.id === '1' ? kmWeek : mainObj.id === '2' ? thisWeek.length : mainObj.id === '3' ? allKm : mainObj.id === '4' ? monthKm : 0
            const current = (mainObj as any).currentOverride != null ? (mainObj as any).currentOverride : autoVal
            const pct = Math.min(100, (current / mainObj.target) * 100)
            return (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(240,228,204,0.08)', border: '1px solid rgba(240,228,204,0.12)' }}>
                <p style={{ fontSize: 8, color: 'rgba(240,228,204,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Objectif actuel</p>
                <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT, marginBottom: 8, lineHeight: 1.1 }}>{mainObj.label}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ ...DF, fontSize: 12, fontWeight: 800, color: mainObj.color }}>{Math.round(pct)}%</span>
                  <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.45)' }}>{Number.isInteger(current) ? current : current.toFixed(1)} / {mainObj.target} {mainObj.unit}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(240,228,204,0.1)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: mainObj.color, transition: 'width .5s ease' }} />
                </div>
              </div>
            )
          })()}

          {/* Défis actifs */}
          <p style={{ fontSize: 8, color: 'rgba(240,228,204,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Défis actifs</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(lsObjectifs.length > 0 ? lsObjectifs.slice(1, 5) : [
              { id: '1', label: '30 km / semaine',    target: 30,  unit: 'km',      color: ORANGE,    currentOverride: undefined },
              { id: '2', label: '4 sorties / sem.',   target: 4,   unit: 'sorties', color: WHEAT,     currentOverride: undefined },
              { id: '3', label: 'Total 500 km',       target: 500, unit: 'km',      color: TEAL,      currentOverride: undefined },
              { id: '5', label: 'Boire 2,5 L / jour', target: 2.5, unit: 'L',       color: '#3B82F6', currentOverride: undefined },
            ]).map(obj => {
              const autoVal = obj.id === '1' ? kmWeek : obj.id === '2' ? thisWeek.length : obj.id === '3' ? allKm : obj.id === '4' ? monthKm : obj.id === '5' ? glasses * 0.25 : 0
              const rawV = obj.currentOverride != null ? obj.currentOverride : autoVal
              const d = { l: obj.label, v: Number.isInteger(rawV) ? String(rawV) : rawV.toFixed(1), t: obj.target, unit: obj.unit, color: obj.color }
              const pct = Math.min(100, (parseFloat(d.v) / d.t) * 100)
              return (
                <div key={d.l} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.6)' }}>{d.l}</span>
                      <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: WHEAT }}>{d.v} / {d.t} {d.unit}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(240,228,204,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: d.color, transition: 'width .5s ease' }} />
                    </div>
                  </div>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: d.color, minWidth: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>

          <button onClick={() => router.push('/health/objectifs')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0', marginTop: 'auto', borderTop: '1px solid rgba(240,228,204,0.1)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(240,228,204,0.35)' }}>VOIR TOUS LES OBJECTIFS</span>
            <ChevronRight size={11} style={{ color: 'rgba(240,228,204,0.35)' }} />
          </button>
        </div>

      </div>
    </div>
  )
}
