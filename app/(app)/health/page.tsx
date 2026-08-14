'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, TrendingDown, TrendingUp, Activity, Moon, Heart, Droplets,
  ChevronRight, Check, Utensils, Apple as AppleIcon, Scale, Flame, Zap, HeartPulse
} from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useHealth } from '@/hooks/useHealth'
import { useMealPlan } from '@/hooks/useMealPlan'
import { userKey } from '@/lib/userStore'

/* ─── Constants ─────────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL   = 'var(--azul)'
const ORANGE = 'var(--accent-brand)'
const WHEAT   = 'var(--text)'
const TEAL_BG = 'var(--azul)'
const ACCENT  = 'var(--accent-health)'   /* couleur de catégorie de la page */

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
            {v > 0 && <span style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.6)', ...DF, fontWeight: 700 }}>{v.toFixed(1)}</span>}
            <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0',
              background: v > 0 ? color : 'rgba(var(--text-rgb),0.1)' }} />
            <span style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.5)', ...DF, fontWeight: 600 }}>{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Card style shortcuts ────────────────────────────────────
   Le contour + l'ombre viennent des classes `nb-card` / `nb-tile`. */
const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', overflow: 'hidden', ...extra,
})
// Fond foncé fixe (cobalt) → encre claire dans les deux thèmes
const INK_LIGHT_VARS = {
  '--text-rgb': '255, 255, 255', '--text': 'var(--ink-light)', '--text-muted': 'rgba(255, 255, 255, 0.72)',
} as React.CSSProperties
// Fond tangerine (clair-moyen) → encre foncée dans les deux thèmes
const INK_DARK_VARS = {
  '--text-rgb': '17, 17, 17', '--text': 'var(--ink-dark)', '--text-muted': 'rgba(17, 17, 17, 0.65)',
} as React.CSSProperties
/* Carte de section en colonne — le contenu occupe la hauteur restante. */
const SECTION_COL: React.CSSProperties = { display: 'flex', flexDirection: 'column' }

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function HealthPage() {
  const router = useRouter()
  const { metrics, activities, loading, addWeight, addRun, latestWeight, weightTrend } = useHealth()
  const { todayNutrition, hasPlan } = useMealPlan()

  /* ── Forms state ─────────────────── */
  const [showWForm, setShowWForm] = useState(false)
  const [showRForm, setShowRForm] = useState(false)
  const [wForm, setWForm]         = useState({ date: new Date().toISOString().slice(0, 10), weight: '' })
  const [rForm, setRForm]         = useState({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })

  /* ── Hydration local state — persisté localStorage par jour ── */
  const todayKey = new Date().toISOString().slice(0, 10)
  const [glasses, setGlasses]     = useState(0)
  const GLASS_TARGET = 8

  /* ── Résumé du jour — éditable + persisté localStorage ── */
  const [resume, setResume] = useState({ pas: 0, pasTarget: 10000, cal: 0, calTarget: 2200 })
  const [editResume, setEditResume] = useState(false)
  const [resumeForm, setResumeForm] = useState({ pas: '', cal: '', pasTarget: '', calTarget: '' })

  /* ── Nutrition — cibles (références objectif) uniquement ── */
  const NUTRITION_TARGETS = { calTarget: 2200, protTarget: 150, glucTarget: 250, lipTarget: 80 }

  /* ── Mesures corporelles — sync localStorage (useEffect pour éviter SSR) ── */
  const [mesures, setMesures] = useState<{ taille?: number; massGrasse?: number; massMuscul?: number; imc?: number; prev?: { taille?: number; massGrasse?: number; massMuscul?: number } }>({})

  /* ── Objectifs — sync localStorage ── */
  const [lsObjectifs, setLsObjectifs] = useState<Array<{ id: string; label: string; target: number; unit: string; color: string; period: string; category: string; currentOverride?: number }>>([])

  useEffect(() => {
    try {
      const savedM = localStorage.getItem(userKey('nysa_mesures'))
      if (savedM) {
        const arr = JSON.parse(savedM) as Array<{ taille?: number; massGrasse?: number; massMuscul?: number; imc?: number }>
        const latest = arr[0] ?? {}
        const prev   = arr[1] ?? {}
        setMesures({ ...latest, prev })
      }
    } catch {}

    try {
      const savedO = localStorage.getItem(userKey('nysa_objectifs'))
      if (savedO) setLsObjectifs(JSON.parse(savedO))
    } catch {}

    try {
      const savedR = localStorage.getItem(userKey('nysa_resume_jour'))
      if (savedR) setResume(JSON.parse(savedR))
    } catch {}

    try {
      const savedH = localStorage.getItem(userKey(`nysa_hydration_${todayKey}`))
      if (savedH) setGlasses(parseInt(savedH) || 0)
    } catch {}
  }, [todayKey])

  function updateGlasses(next: number) {
    const v = Math.max(0, Math.min(GLASS_TARGET, next))
    setGlasses(v)
    try { localStorage.setItem(userKey(`nysa_hydration_${todayKey}`), String(v)) } catch {}
  }

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

  // Calories brûlées (estimation simple) : ~60 kcal / km de course cette semaine
  const calBurnedWeek = Math.round(kmWeek * 60)

  // Nutrition du jour — vient du planning de repas (interconnexion Recettes → Santé)
  const nutrition = {
    cal:  Math.round(todayNutrition.calories),
    prot: Math.round(todayNutrition.protein),
    gluc: Math.round(todayNutrition.carbs),
    lip:  Math.round(todayNutrition.fat),
    ...NUTRITION_TARGETS,
  }
  const hasNutrition = hasPlan && nutrition.cal > 0

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
    background: 'var(--bg-input)', border: '1px solid var(--border)', minHeight: 40,
    borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13,
  }

  // Empty state for demo mode

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`
        .health-btn:hover { opacity: 0.85; }
        .health-row:hover { background: var(--bg-card-hover) !important; }
        .glass-btn { cursor: pointer; transition: transform .1s; }
        .glass-btn:hover { transform: scale(1.1); }
      `}</style>

      {/* ── En-tête de page ───────────────────────────────── */}
      <PageTitle
        title="Health"
        sub="Suivi · Mesures · Objectifs"
        accent={ACCENT}
        icon={HeartPulse}
        iconInk="var(--ink-dark)"
        right={
          <div className="toolbar-scroll" style={{ display: 'flex', gap: 8 }}>
            <StickerButton onClick={() => setShowWForm(v => !v)} accent={TEAL_BG} ink="var(--ink-light)" tilt="l">
              <Scale size={13} /> + Poids
            </StickerButton>
            <StickerButton onClick={() => setShowRForm(v => !v)} accent={ORANGE}>
              <Activity size={13} /> + Run
            </StickerButton>
          </div>
        }
      />

      {/* ── KPIs de la semaine ────────────────────────────── */}
      <KpiGrid>
        <KpiCard label="Distance" value={`${kmWeek.toFixed(1)} km`} sub={`${thisWeek.length} sortie${thisWeek.length !== 1 ? 's' : ''}`} accent={ACCENT} />
        <KpiCard label="Temps"    value={fmtDur(secWeek)} sub="cette semaine" accent={ACCENT} />
        <KpiCard label="Allure"   value={avgPace > 0 ? fmtPace(avgPace) : '—'} sub="moy. semaine" accent={ACCENT} />
        <KpiCard label="Poids"    value={latestWeight ? `${latestWeight} kg` : '—'}
          sub={weightTrend != null ? `${weightTrend > 0 ? '+' : ''}${weightTrend?.toFixed(1)} kg` : 'Aucune donnée'} accent={ACCENT} />
      </KpiGrid>

      {/* ── Inline forms ──────────────────────────────────── */}
      {showWForm && (
        <form onSubmit={handleWeight} className="nb-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, padding: 16,
          ...card() }}>
          <input type="date" value={wForm.date} onChange={e => setWForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
          <input type="number" step="0.1" value={wForm.weight} onChange={e => setWForm(f => ({ ...f, weight: e.target.value }))}
            placeholder="Poids (kg)" autoFocus style={{ ...inputStyle, flex: 1 }} />
          <StickerButton type="submit" accent={ORANGE}>Enregistrer</StickerButton>
          <button type="button" onClick={() => setShowWForm(false)} className="nb-press" title="Fermer" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', borderRadius: 'var(--radius-lg)', minHeight: 40, padding: '8px 14px', ...DF, fontWeight: 700, fontSize: 13, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
            ×
          </button>
        </form>
      )}
      {showRForm && (
        <form onSubmit={handleRun} className="nb-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, padding: 16, ...card() }}>
          <input type="date" value={rForm.date} onChange={e => setRForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
          <input type="number" step="0.01" value={rForm.distance} onChange={e => setRForm(f => ({ ...f, distance: e.target.value }))}
            placeholder="Distance (km)" autoFocus style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
          <input type="text" value={rForm.duration} onChange={e => setRForm(f => ({ ...f, duration: e.target.value }))}
            placeholder="Durée (h:mm)" style={{ ...inputStyle, width: 110 }} />
          <input type="text" value={rForm.notes} onChange={e => setRForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes…" style={{ ...inputStyle, flex: 2, minWidth: 140 }} />
          <StickerButton type="submit" accent={ORANGE}>Ajouter</StickerButton>
          <button type="button" onClick={() => setShowRForm(false)} className="nb-press" title="Fermer" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', borderRadius: 'var(--radius-lg)', minHeight: 40, padding: '8px 14px', ...DF, fontWeight: 700, fontSize: 13, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
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
        gap: 16,
      }}>

        {/* ── R1 : RÉSUMÉ DU JOUR ─────────────────────────── */}
        <SectionCard title="Résumé du jour" num="01" accent={ACCENT} bg={ORANGE} titleColor="var(--ink-dark)"
          style={{ gridColumn: 'span 4', ...SECTION_COL, ...INK_DARK_VARS } as React.CSSProperties}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'rgba(26,10,10,0.5)' }}>{today.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              <button className="nb-press" title="Modifier le résumé du jour"
                onClick={() => { setEditResume(v => !v); setResumeForm({ pas: String(resume.pas), cal: String(resume.cal), pasTarget: String(resume.pasTarget), calTarget: String(resume.calTarget) }) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: 'rgba(26,10,10,0.15)', border: 'none', cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-dark)' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          }>
          <div style={{ padding: 28, flex: 1, overflowY: 'auto' }}>

          {/* Edit form */}
          {editResume && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: 'rgba(26,10,10,0.15)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { k: 'pas',       lbl: 'Pas aujourd\'hui', ph: '8000' },
                { k: 'pasTarget', lbl: 'Objectif pas',     ph: '10000' },
                { k: 'cal',       lbl: 'Calories',         ph: '0' },
                { k: 'calTarget', lbl: 'Objectif kcal',    ph: '2200' },
              ].map(f => (
                <div key={f.k}>
                  <p style={{ ...DF, fontSize: 10, fontWeight: 800, color: 'rgba(26,10,10,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{f.lbl}</p>
                  <input type="number" placeholder={f.ph} value={(resumeForm as any)[f.k]}
                    onChange={e => setResumeForm(v => ({ ...v, [f.k]: e.target.value }))}
                    style={{ width: '100%', minHeight: 40, background: 'rgba(26,10,10,0.15)', border: '1px solid rgba(26,10,10,0.25)', borderRadius: 6, padding: '8px 10px', color: 'var(--ink-dark)', fontSize: 13 }} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 4', display: 'flex', gap: 6, marginTop: 2 }}>
                <button className="nb-press" onClick={() => {
                  const updated = { pas: parseInt(resumeForm.pas) || 0, pasTarget: parseInt(resumeForm.pasTarget) || 10000, cal: parseInt(resumeForm.cal) || 0, calTarget: parseInt(resumeForm.calTarget) || 2200 }
                  setResume(updated)
                  localStorage.setItem(userKey('nysa_resume_jour'), JSON.stringify(updated))
                  setEditResume(false)
                }} style={{ minHeight: 40, padding: '8px 16px', borderRadius: 6, background: 'rgba(26,10,10,0.3)', color: 'var(--ink-dark)', border: 'none', fontSize: 12, ...DF, fontWeight: 700, cursor: 'pointer' }}>
                  Enregistrer
                </button>
                <button className="nb-press" onClick={() => setEditResume(false)} style={{ minHeight: 40, padding: '8px 14px', borderRadius: 6, background: 'rgba(26,10,10,0.1)', color: 'var(--ink-dark)', border: 'none', fontSize: 12, cursor: 'pointer' }}>
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
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: 'rgba(26,10,10,0.2)', color: 'var(--ink-dark)', ...DF, fontWeight: 700 }}>Soon</span>
          </div>
          </div>
        </SectionCard>

        {/* ── R2 C1 : COURSE À PIED ───────────────────────── */}
        <SectionCard title="Course à pied" num="02" accent={ACCENT} bg={TEAL_BG} titleColor="var(--ink-light)"
          style={{ ...SECTION_COL, ...INK_LIGHT_VARS } as React.CSSProperties}
          action={<Activity size={16} style={{ color: 'rgba(var(--text-rgb),0.5)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.45)' }}>Cette semaine</p>
          <div>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: WHEAT, lineHeight: 1, marginBottom: 3 }}>
              {kmWeek.toFixed(1)} <span style={{ fontSize: 16, fontWeight: 500 }}>km</span>
            </p>
            <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.5)' }}>{thisWeek.length} session{thisWeek.length !== 1 ? 's' : ''}</p>
          </div>
          <WeekBars data={dayKm} labels={dayLabels} color={ORANGE} />
          <button onClick={() => router.push('/sport')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6 }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(var(--text-rgb),0.6)' }}>VOIR LE PROGRAMME</span>
            <ChevronRight size={11} style={{ color: 'rgba(var(--text-rgb),0.6)' }} />
          </button>
          </div>
        </SectionCard>

        {/* ── R2 C2 : POIDS ───────────────────────────────── */}
        <SectionCard title="Poids" num="03" accent={ACCENT} bg={TEAL_BG} titleColor="var(--ink-light)"
          style={{ ...SECTION_COL, ...INK_LIGHT_VARS } as React.CSSProperties}
          action={<Scale size={16} style={{ color: 'rgba(var(--text-rgb),0.5)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Aujourd&apos;hui</p>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: WHEAT, lineHeight: 1, marginBottom: 4 }}>
              {latestWeight ? <>{latestWeight} <span style={{ fontSize: 14, fontWeight: 500 }}>kg</span></> : '—'}
            </p>
            {weightTrend !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {weightTrend < 0
                  ? <TrendingDown size={13} style={{ color: TEAL }} />
                  : <TrendingUp size={13} style={{ color: ORANGE }} />}
                <span style={{ fontSize: 11, color: weightTrend < 0 ? 'rgba(var(--text-rgb),0.8)' : ORANGE }}>
                  {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg vs hier
                </span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 4 }}>
            {weightHistory.length >= 2
              ? <WeightSparkLine data={weightHistory} />
              : <p style={{ fontSize: 11, color: 'rgba(var(--text-rgb),0.55)' }}>Pas encore assez de mesures</p>}
          </div>
          <button onClick={() => router.push('/health/poids')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(var(--text-rgb),0.6)' }}>VOIR L&apos;ÉVOLUTION</span>
            <ChevronRight size={11} style={{ color: 'rgba(var(--text-rgb),0.6)' }} />
          </button>
          </div>
        </SectionCard>

        {/* ── R2 C3 : SOMMEIL ─────────────────────────────── */}
        <SectionCard title="Sommeil" num="04" accent={ACCENT} bg="var(--bg)"
          style={SECTION_COL}
          action={<Moon size={16} style={{ color: 'rgba(160,130,220,0.6)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Dernière nuit</p>
            <p style={{ ...DF, fontSize: 38, fontWeight: 900, color: 'var(--text)', lineHeight: 1, marginBottom: 6 }}>
              — <span style={{ fontSize: 16, fontWeight: 500 }}>h</span>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(var(--text-rgb),0.35)' }}>Qualité · —</p>
          </div>
          {/* Pas de source de données sommeil → état "à venir" */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 8, background: 'rgba(160,130,220,0.06)', border: '1px dashed rgba(160,130,220,0.2)' }}>
            <span style={{ fontSize: 10, color: 'rgba(160,130,220,0.5)' }}>Aucune donnée de sommeil</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, background: 'rgba(160,130,220,0.08)', border: '1px solid rgba(160,130,220,0.15)', marginTop: 4 }}>
            <AppleIcon size={11} style={{ color: 'rgba(160,130,220,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'rgba(160,130,220,0.6)' }}>Sommeil — connexion Apple Santé à venir</span>
          </div>
          </div>
        </SectionCard>

        {/* ── R2 C4 : FORME GÉNÉRALE ──────────────────────── */}
        <SectionCard title="Forme générale" num="05" accent={ACCENT} style={SECTION_COL}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, minHeight: 0 }}>
          {[
            { l: 'Running / sem.',    v: `${kmWeek.toFixed(1)} km`, pct: Math.min(100, (kmWeek / 30) * 100),            color: TEAL_BG },
            { l: 'Sorties / sem.',    v: `${thisWeek.length} / 4`,  pct: Math.min(100, (thisWeek.length / 4) * 100),    color: ORANGE },
            { l: 'Calories brûlées', v: calBurnedWeek > 0 ? `${calBurnedWeek} kcal` : '—', pct: Math.min(100, (calBurnedWeek / 2000) * 100), color: '#5B6F3A' },
            { l: 'Hydratation',      v: `${glasses} / ${GLASS_TARGET}`, pct: Math.min(100, (glasses / GLASS_TARGET) * 100), color: '#3B82F6' },
          ].map(s => (
            <div key={s.l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}</span>
                <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{s.v}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 99, background: s.color, transition: 'width .5s ease' }} />
              </div>
            </div>
          ))}
          </div>
        </SectionCard>

        {/* ── R3 C1-2 : PROGRAMME COURSE ──────────────────── */}
        <SectionCard title="Programme Course à Pied" num="06" accent={ACCENT} bg="var(--bg)"
          style={{ gridColumn: 'span 2', ...SECTION_COL }}
          action={
            <button onClick={() => router.push('/sport')} className="nb-press"
              style={{ ...DF, fontSize: 10, fontWeight: 700, minHeight: 40, padding: '0 4px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Plan actuel ▾
            </button>
          }>
          <div style={{ padding: 26, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Sessions list from recent activities */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {activities.length === 0 && !loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
                <Activity size={24} style={{ color: 'var(--text-subtle)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune session enregistrée</p>
                <StickerButton onClick={() => setShowRForm(true)} accent={ORANGE}>
                  <Plus size={13} /> Ajouter un run
                </StickerButton>
              </div>
            ) : activities.slice(0, 6).map((a, i) => {
              const isToday = a.date === today.toISOString().slice(0, 10)
              return (
                <div key={a.id} className="health-row nb-press nb-card" onClick={() => router.push(`/sport/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 40,
                    background: isToday ? `rgba(242,84,45,0.15)` : 'rgba(var(--text-rgb),0.04)',
                    cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isToday ? ORANGE : 'rgba(var(--text-rgb),0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={16} style={{ color: isToday ? '#fff' : 'rgba(var(--text-rgb),0.4)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                      {(a as any).title ?? `Sortie ${i + 1} — ${a.distance_km?.toFixed(1)} km`}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.35)', marginTop: 2 }}>
                      {a.duration_seconds ? fmtDur(a.duration_seconds) + ' · ' : ''}
                      {a.distance_km ? `${a.distance_km.toFixed(1)} km` : ''}
                      {a.elevation_m ? ` · +${a.elevation_m}m` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.35)' }}>{fmtDate(a.date)}</p>
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

          <button onClick={() => router.push('/sport')} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0 0', marginTop: 6, borderTop: '1px solid rgba(var(--text-rgb),0.07)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>VOIR TOUT LE PROGRAMME</span>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
          </div>
        </SectionCard>

        {/* ── R3 C3-4 : ACTIVITÉ HEBDOMADAIRE ─────────────── */}
        <SectionCard title="Activité hebdomadaire" num="07" accent={ACCENT} bg={TEAL_BG} titleColor="var(--ink-light)"
          style={{ gridColumn: 'span 2', ...SECTION_COL, ...INK_LIGHT_VARS } as React.CSSProperties}
          action={<span style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.55)' }}>Cette semaine</span>}>
          <div style={{ padding: 26, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Durée totale', v: fmtDur(secWeek)       },
              { l: 'Distance',     v: `${kmWeek.toFixed(1)} km` },
              { l: 'Dénivelé',     v: elevWeek > 0 ? `+${elevWeek}m` : '—' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(var(--text-rgb),0.08)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.l}</p>
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
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {km > 0 && <span style={{ ...DF, fontSize: 9, fontWeight: 800, color: isToday ? WHEAT : 'rgba(var(--text-rgb),0.55)' }}>{km.toFixed(1)}</span>}
                  <div style={{
                    width: '100%', height: h, borderRadius: '4px 4px 0 0',
                    background: km > 0 ? (isToday ? ORANGE : 'rgba(var(--text-rgb),0.35)') : 'rgba(var(--text-rgb),0.08)',
                  }} />
                  <span style={{ ...DF, fontSize: 9, fontWeight: isToday ? 800 : 600, color: isToday ? WHEAT : 'rgba(var(--text-rgb),0.45)', textTransform: 'uppercase' }}>{day}</span>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(var(--text-rgb),0.1)' }}>
            {[{ c: TEAL, l: 'Course' }, { c: ORANGE, l: 'Aujourd\'hui' }, { c: 'rgba(var(--text-rgb),0.35)', l: 'Autre' }].map(s => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
                <span style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.45)' }}>{s.l}</span>
              </div>
            ))}
          </div>
          </div>
        </SectionCard>

        {/* ── R4 C1 : FRÉQUENCE CARDIAQUE ─────────────────── */}
        <SectionCard title="Fréquence cardiaque" num="08" accent={ACCENT} bg="var(--bg)"
          style={SECTION_COL}
          action={<Heart size={16} style={{ color: 'rgba(255,80,80,0.7)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <div>
            <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Repos (moy.)</p>
            <p style={{ ...DF, fontSize: 40, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
              {avgHr ?? '—'} <span style={{ fontSize: 14, fontWeight: 500 }}>bpm</span>
            </p>
          </div>
          <div style={{ flex: 1 }}>
            {hrData.filter(v => v > 0).length >= 2
              ? <HrSparkLine data={hrData} />
              : <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucune donnée cardiaque</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {activities.slice(0, 2).map(a => a.heart_rate_avg && (
              <div key={a.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(var(--text-rgb),0.05)' }}>
                <p style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.3)' }}>{fmtDate(a.date)}</p>
                <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: '#ff5050', marginTop: 2 }}>{a.heart_rate_avg} <span style={{ fontSize: 10 }}>bpm</span></p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/health/frequence-cardiaque')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 'auto' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>VOIR PLUS</span>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
          </div>
        </SectionCard>

        {/* ── R4 C2 : NUTRITION ───────────────────────────── */}
        <SectionCard title="Nutrition" num="09" accent={ACCENT} bg="var(--bg)"
          style={SECTION_COL}
          action={<Utensils size={16} style={{ color: 'var(--text-muted)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {!hasNutrition ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
              <Utensils size={24} style={{ color: 'var(--text-subtle)' }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Planifie tes repas dans Recettes</p>
              <StickerButton onClick={() => router.push('/recettes')} accent={TEAL} ink="var(--ink-light)" tilt="l">
                Aller aux recettes →
              </StickerButton>
            </div>
          ) : (
            <>
              <div>
                <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Calories aujourd&apos;hui</p>
                <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                  {nutrition.cal.toLocaleString()} <span style={{ fontSize: 12, color: 'rgba(var(--text-rgb),0.3)' }}>/ {nutrition.calTarget.toLocaleString()} kcal</span>
                </p>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(var(--text-rgb),0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (nutrition.cal / nutrition.calTarget) * 100)}%`, borderRadius: 99, background: TEAL }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { l: 'Protéines', v: nutrition.prot, t: nutrition.protTarget, c: TEAL },
                  { l: 'Glucides',  v: nutrition.gluc, t: nutrition.glucTarget, c: ORANGE },
                  { l: 'Lipides',   v: nutrition.lip,  t: nutrition.lipTarget,  c: 'rgba(var(--text-rgb),0.4)' },
                ].map(m => (
                  <div key={m.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: m.c }} />
                        <span style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.5)' }}>{m.l}</span>
                      </div>
                      <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{m.v}g <span style={{ color: 'rgba(var(--text-rgb),0.3)' }}>/ {m.t}g</span></span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(var(--text-rgb),0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${m.t > 0 ? Math.min(100, (m.v / m.t) * 100) : 0}%`, borderRadius: 99, background: m.c }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/recettes')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 'auto' }}>
                <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>VOIR LES RECETTES</span>
                <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            </>
          )}
          </div>
        </SectionCard>

        {/* ── R4 C3 : HYDRATATION ─────────────────────────── */}
        <SectionCard title="Hydratation" num="10" accent={ACCENT} bg={ORANGE} titleColor="var(--ink-dark)"
          style={{ ...SECTION_COL, ...INK_DARK_VARS } as React.CSSProperties}
          action={<Droplets size={16} style={{ color: 'rgba(26,10,10,0.6)' }} />}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
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
              <button key={i} className="glass-btn" onClick={() => updateGlasses(i < glasses ? i : i + 1)}
                style={{ aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: i < glasses ? 'rgba(26,10,10,0.3)' : 'rgba(26,10,10,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={16} style={{ color: i < glasses ? '#1A0A0A' : 'rgba(26,10,10,0.3)' }} />
              </button>
            ))}
          </div>
          <button onClick={() => updateGlasses(glasses + 1)} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'rgba(26,10,10,0.15)', border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer', justifyContent: 'center' }}>
            <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: 'var(--ink-dark)' }}>+ AJOUTER UN VERRE</span>
          </button>
          </div>
        </SectionCard>

        {/* ── R4 C4 : APPLE SANTÉ ─────────────────────────── */}
        <SectionCard title="Intégrations santé" num="11" accent={ACCENT} style={SECTION_COL}>
          <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            {[
              { icon: <AppleIcon size={18} />, name: 'Apple Santé', desc: 'Pas, sommeil, calories, FC', status: 'soon', color: '#666' },
              { icon: <Activity size={18} />,  name: 'Strava',      desc: 'Activités course importées', status: 'active', color: '#FC4C02' },
              { icon: <Heart size={18} />,     name: 'Garmin',      desc: 'Montres & capteurs',         status: 'soon', color: '#007DC3' },
            ].map(s => (
              <div key={s.name} className="nb-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--bg-input)' }}>
                <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{s.name}</p>
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
        </SectionCard>

        {/* ── R5 C1-2 : MESURES CORPORELLES ───────────────── */}
        <SectionCard title="Mesures corporelles" num="12" accent={ACCENT}
          style={{ gridColumn: 'span 2', ...SECTION_COL }}
          action={
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          }>
          <div style={{ padding: 26, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
              <div key={s.l} className="nb-card" style={{ padding: '16px 14px', background: 'var(--bg-input)' }}>
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
          <button onClick={() => router.push('/health/mesures')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0 0', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>VOIR L&apos;HISTORIQUE</span>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
          </div>
        </SectionCard>

        {/* ── R5 C3-4 : DÉFIS & OBJECTIFS ─────────────────── */}
        <SectionCard title="Défis & Objectifs" num="13" accent={ACCENT} bg={TEAL_BG} titleColor="var(--ink-light)"
          style={{ gridColumn: 'span 2', ...SECTION_COL, ...INK_LIGHT_VARS } as React.CSSProperties}>
          <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {lsObjectifs.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'rgba(var(--text-rgb),0.6)' }}>Aucun objectif défini</p>
              <StickerButton onClick={() => router.push('/health/objectifs')} accent={ORANGE}>
                <Plus size={13} /> Ajoute un objectif
              </StickerButton>
            </div>
          ) : (
            <>
              {/* Objectif principal — premier objectif localStorage */}
              {(() => {
                const mainObj = lsObjectifs[0]
                const autoVal = mainObj.id === '1' ? kmWeek : mainObj.id === '2' ? thisWeek.length : mainObj.id === '3' ? allKm : mainObj.id === '4' ? monthKm : 0
                const current = mainObj.currentOverride != null ? mainObj.currentOverride : autoVal
                const pct = mainObj.target > 0 ? Math.min(100, (current / mainObj.target) * 100) : 0
                return (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--text-rgb),0.08)', border: '1px solid rgba(var(--text-rgb),0.12)' }}>
                    <p style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Objectif actuel</p>
                    <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: WHEAT, marginBottom: 8, lineHeight: 1.1 }}>{mainObj.label}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT }}>{Math.round(pct)}%</span>
                      <span style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.45)' }}>{Number.isInteger(current) ? current : current.toFixed(1)} / {mainObj.target} {mainObj.unit}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(var(--text-rgb),0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: mainObj.color, transition: 'width .5s ease' }} />
                    </div>
                  </div>
                )
              })()}

              {/* Défis actifs */}
              {lsObjectifs.length > 1 && (
                <>
                  <p style={{ fontSize: 8, color: 'rgba(var(--text-rgb),0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Défis actifs</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lsObjectifs.slice(1, 5).map(obj => {
                      const autoVal = obj.id === '1' ? kmWeek : obj.id === '2' ? thisWeek.length : obj.id === '3' ? allKm : obj.id === '4' ? monthKm : obj.id === '5' ? glasses * 0.25 : 0
                      const rawV = obj.currentOverride != null ? obj.currentOverride : autoVal
                      const d = { l: obj.label, v: Number.isInteger(rawV) ? String(rawV) : rawV.toFixed(1), t: obj.target, unit: obj.unit, color: obj.color }
                      const pct = d.t > 0 ? Math.min(100, (parseFloat(d.v) / d.t) * 100) : 0
                      return (
                        <div key={obj.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.6)' }}>{d.l}</span>
                              <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: WHEAT }}>{d.v} / {d.t} {d.unit}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: 'rgba(var(--text-rgb),0.1)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: d.color, transition: 'width .5s ease' }} />
                            </div>
                          </div>
                          <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: WHEAT, minWidth: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          <button onClick={() => router.push('/health/objectifs')} className="nb-press" style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0', marginTop: 'auto', borderTop: '1px solid rgba(var(--text-rgb),0.1)' }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(var(--text-rgb),0.6)' }}>VOIR TOUS LES OBJECTIFS</span>
            <ChevronRight size={11} style={{ color: 'rgba(var(--text-rgb),0.6)' }} />
          </button>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
