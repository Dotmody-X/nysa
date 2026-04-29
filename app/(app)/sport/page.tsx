'use client'
import { Suspense } from 'react'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, Plus, RefreshCw, CheckCircle2, AlertCircle, ChevronRight, Activity, Zap, TrendingUp, Target, Award } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'
import { parseGpx } from '@/lib/parseGpx'

/* ─── Constants ──────────────────────────────────────────── */
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const STRAVA_ORANGE = '#FC4C02'
const TEAL          = '#0E9594'
const ORANGE        = '#F2542D'
const WHEAT         = '#F0E4CC'

/* ─── Helpers ────────────────────────────────────────────── */
function fmtPace(sec: number) {
  if (!sec || sec <= 0 || sec === Infinity) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}/km`
}
function fmtDur(sec: number) {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}
function fmtDurLong(sec: number) {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function fmtDateLong(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long' })
}
function stravaAuthUrl() {
  const clientId    = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')}/api/strava/callback`
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`
}

/* ─── SVG Charts ─────────────────────────────────────────── */
function BarChart({ data, labels, color = ORANGE, highlight = -1 }:
  { data: number[]; labels: string[]; color?: string; highlight?: number }) {
  const max = Math.max(...data, 1)
  const H = 100; const W = 260
  const barW = W / data.length - 6
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {data.map((v, i) => {
        const bh = Math.max(v > 0 ? 4 : 2, (v / max) * H)
        const x  = i * (W / data.length) + 3
        const y  = H - bh
        const isHL = i === highlight
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh}
              rx={3} fill={v > 0 ? (isHL ? ORANGE : color) : 'rgba(255,255,255,0.08)'} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle"
              style={{ fontSize: 9, fill: isHL ? ORANGE : 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-display)', fontWeight: isHL ? 800 : 600 }}>
              {labels[i]}
            </text>
            {v > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle"
                style={{ fontSize: 8, fill: isHL ? ORANGE : 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {v.toFixed(1)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function SparkLine({ data, color = TEAL, height = 40 }:
  { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const valid = data.filter(v => v > 0)
  if (valid.length < 2) return null
  const min = Math.min(...valid); const max = Math.max(...valid, min + 1)
  const W = 200
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = v > 0 ? height - ((v - min) / (max - min)) * (height - 6) : height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => v > 0 && (
        <circle key={i}
          cx={(i / (data.length - 1)) * W}
          cy={height - ((v - min) / (max - min)) * (height - 6)}
          r={3} fill={color} />
      ))}
    </svg>
  )
}

function Donut({ pct, color, size = 60, stroke = 8, label }:
  { pct: number; color: string; size?: number; stroke?: number; label?: string }) {
  const r  = (size - stroke) / 2
  const cx = size / 2; const cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      {label && <text x={cx} y={cy + 4} textAnchor="middle"
        style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, fill: color }}>{label}</text>}
    </svg>
  )
}

function HrZonesBar({ zones }: { zones: { name: string; pct: number; color: string; time: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {zones.map(z => (
        <div key={z.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: z.color }}>{z.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{z.time}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: z.color, width: `${z.pct}%`, transition: 'width .6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────── */
function SportPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { activities, loading, addRun, refetch } = useHealth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting]   = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    distance: '', duration: '', notes: '',
  })
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState({ date: tomorrow, distance: '', title: '', notes: '' })
  const [planSaving, setPlanSaving] = useState(false)

  useEffect(() => {
    const strava = searchParams.get('strava')
    if (strava === 'connected') setSyncMsg({ type: 'ok',  text: 'Strava connecté ! Lance une synchronisation.' })
    if (strava === 'denied')    setSyncMsg({ type: 'err', text: 'Autorisation Strava refusée.' })
    if (strava === 'error')     setSyncMsg({ type: 'err', text: 'Erreur lors de la connexion Strava.' })
  }, [searchParams])

  async function handleStravaSync() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res  = await fetch('/api/strava/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur inconnue')
      setSyncMsg({ type: 'ok', text: json.message })
      if (json.synced > 0) refetch()
    } catch (err: any) { setSyncMsg({ type: 'err', text: err.message })
    } finally { setSyncing(false) }
  }

  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const gpx  = parseGpx(text)
      const result = await addRun({
        title:            gpx.name,
        date:             new Date().toISOString().slice(0, 10),
        distance_km:      parseFloat(gpx.distanceKm.toFixed(2)),
        duration_seconds: gpx.durationSeconds ?? undefined,
        pace_sec_per_km:  gpx.avgPaceSecPerKm ?? undefined,
        elevation_m:      Math.round(gpx.elevationGainM),
        raw_data: { gpx: {
          points:        gpx.points,
          kmSplits:      gpx.kmSplits,
          elevationGain: gpx.elevationGainM,
          elevationLoss: gpx.elevationLossM,
          elevationMax:  gpx.elevationMax,
          elevationMin:  gpx.elevationMin,
        }},
      })
      if (result.data?.id) router.push(`/sport/${result.data.id}`)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault(); if (!planForm.distance) return
    setPlanSaving(true)
    await addRun({
      title:       planForm.title || undefined,
      date:        planForm.date,
      distance_km: parseFloat(planForm.distance),
      notes:       planForm.notes || undefined,
    })
    setPlanSaving(false)
    setShowPlanForm(false)
    setPlanForm({ date: tomorrow, distance: '', title: '', notes: '' })
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault(); if (!form.distance) return
    const parts = form.duration.split(':').map(Number)
    const dur   = form.duration ? parts[0] * 3600 + (parts[1] || 0) * 60 : undefined
    await addRun({
      date:             form.date,
      distance_km:      parseFloat(form.distance),
      duration_seconds: dur,
      notes:            form.notes || undefined,
    })
    setShowManual(false)
    setForm({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })
  }

  /* ── Stats derivation ────────────────────────────────── */
  const today     = new Date()
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); weekStart.setHours(0, 0, 0, 0)

  const thisWeek  = activities.filter(a => new Date(a.date + 'T12:00:00') >= weekStart)
  const kmWeek    = parseFloat(thisWeek.reduce((s, a) => s + (a.distance_km ?? 0), 0).toFixed(2))
  const secWeek   = thisWeek.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const elevWeek  = thisWeek.reduce((s, a) => s + (a.elevation_m ?? 0), 0)
  const seancesWeek = thisWeek.length

  const allKm     = activities.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const allSec    = activities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const avgPaceAll= allKm > 0 && allSec > 0 ? allSec / allKm : 0

  // Pace trend from last 7 runs
  const last7     = [...activities].slice(0, 7).reverse()
  const paceData  = last7.map(a => a.pace_sec_per_km ?? 0)
  const paceLabels= last7.map(a => fmtDate(a.date))

  // Day-by-day this week (Mon=0 … Sun=6)
  const dayData   = new Array(7).fill(0)
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayIdx  = today.getDay() === 0 ? 6 : today.getDay() - 1
  thisWeek.forEach(a => {
    const d   = new Date(a.date + 'T12:00:00')
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
    dayData[idx] += a.distance_km ?? 0
  })

  // 6-month progression
  const months6: { label: string; km: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today); d.setMonth(d.getMonth() - i)
    const y = d.getFullYear(); const m = d.getMonth()
    const km = activities
      .filter(a => { const ad = new Date(a.date + 'T12:00:00'); return ad.getFullYear() === y && ad.getMonth() === m })
      .reduce((s, a) => s + (a.distance_km ?? 0), 0)
    months6.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      km: parseFloat(km.toFixed(1)),
    })
  }

  // Best times
  function bestTime(targetKm: number, tol = 1) {
    return activities
      .filter(a => a.distance_km != null && Math.abs(a.distance_km - targetKm) <= tol && a.duration_seconds != null)
      .sort((a, b) => (a.duration_seconds ?? Infinity) - (b.duration_seconds ?? Infinity))[0] ?? null
  }
  const best5k  = bestTime(5, 0.5)
  const best10k = bestTime(10, 1)
  const bestHm  = bestTime(21.097, 1.5)

  // HR zones (estimated from avg HR data, or static fallback)
  const zones = [
    { name: 'Zone 1 — Récupération', pct:  8, color: '#3B82F6', time: '12min' },
    { name: 'Zone 2 — Aérobie',      pct: 35, color: '#10B981', time: '54min' },
    { name: 'Zone 3 — Tempo',        pct: 32, color: ORANGE,    time: '49min' },
    { name: 'Zone 4 — Seuil',        pct: 18, color: '#F59E0B', time: '28min' },
    { name: 'Zone 5 — VO2max',       pct:  7, color: '#EF4444', time: '11min' },
  ]

  // Objectives
  const OBJ_KM  = 30; const OBJ_SEANCES = 4; const OBJ_ELEV = 500
  const pctKm     = Math.min(100, (kmWeek / OBJ_KM) * 100)
  const pctSeances= Math.min(100, (seancesWeek / OBJ_SEANCES) * 100)
  const pctElev   = Math.min(100, (elevWeek / OBJ_ELEV) * 100)

  const nextRun = activities.find(a => new Date(a.date + 'T12:00:00') > today) ?? null

  /* ── Card style helpers ──────────────────────────────── */
  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)',
    overflow: 'hidden', ...extra,
  })
  const tealCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: '#11686A', borderRadius: 12, overflow: 'hidden', ...extra,
  })
  const orangeCard = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: ORANGE, borderRadius: 12, overflow: 'hidden', ...extra,
  })
  const label = (color = ORANGE): React.CSSProperties => ({
    ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color,
  })

  return (
    <div style={{ padding: 30, minHeight: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sport-row-btn:hover { background: var(--bg-card-hover) !important; }
      `}</style>

      {/* ── Notification Strava ──────────────────────────── */}
      {syncMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10, marginBottom: 10,
          background: syncMsg.type === 'ok' ? 'rgba(14,149,148,0.12)' : 'rgba(242,84,45,0.12)',
          border: `1px solid ${syncMsg.type === 'ok' ? 'rgba(14,149,148,0.3)' : 'rgba(242,84,45,0.3)'}`,
        }}>
          {syncMsg.type === 'ok'
            ? <CheckCircle2 size={13} style={{ color: TEAL, flexShrink: 0 }} />
            : <AlertCircle  size={13} style={{ color: ORANGE, flexShrink: 0 }} />}
          <span style={{ ...DF, fontSize: 12, fontWeight: 600, color: syncMsg.type === 'ok' ? TEAL : ORANGE }}>
            {syncMsg.text}
          </span>
          <button onClick={() => setSyncMsg(null)}
            style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* ── Manual add form ──────────────────────────────── */}
      {showManual && (
        <form onSubmit={handleManual} style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16,
          borderRadius: 10, marginBottom: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border-active)',
        }}>
          {[
            { type: 'date',   value: form.date,     key: 'date',     ph: '',                  w: 'auto' },
            { type: 'number', value: form.distance, key: 'distance', ph: 'Distance (km)',     w: '120px' },
            { type: 'text',   value: form.duration, key: 'duration', ph: 'Durée (h:mm)',      w: '110px' },
            { type: 'text',   value: form.notes,    key: 'notes',    ph: 'Notes…',            w: '1' },
          ].map(f => (
            <input key={f.key} type={f.type} step={f.type === 'number' ? '0.01' : undefined}
              value={f.value} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.ph}
              style={{ flex: f.w === '1' ? 1 : undefined, width: f.w !== '1' && f.w !== 'auto' ? f.w : undefined,
                background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', color: 'var(--text)', fontSize: 12, minWidth: 100 }} />
          ))}
          <button type="submit"
            style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '8px 20px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            Enregistrer
          </button>
        </form>
      )}

      {/* ══════════════════════════════════════════════════
          GRID LAYOUT — 4 cols, gap 10
      ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '300px 300px 500px 500px 400px 260px',
        gap: 10,
      }}>

        {/* ── R1C1-2 : HERO ──────────────────────────────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(240,228,204,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>Running</p>
            <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: WHEAT, lineHeight: 1.05, marginBottom: 4 }}>
              {loading ? '…' : `${kmWeek.toFixed(1)} km`}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(240,228,204,0.55)', marginBottom: 20 }}>
              cette semaine · {seancesWeek} sortie{seancesWeek > 1 ? 's' : ''}
            </p>

            {/* Actions toolbar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={typeof window !== 'undefined' ? stravaAuthUrl() : '#'}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  background: STRAVA_ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0 4 13.828h4.17"/>
                </svg>
                Strava
              </a>
              <button onClick={handleStravaSync} disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(240,228,204,0.2)',
                  background: 'rgba(240,228,204,0.08)', color: syncing ? 'rgba(240,228,204,0.4)' : WHEAT, ...DF, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                <RefreshCw size={11} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                {syncing ? 'Sync…' : 'Synchroniser'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(240,228,204,0.2)',
                background: 'rgba(240,228,204,0.08)', color: WHEAT, ...DF, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                <input ref={fileRef} type="file" accept=".gpx" style={{ display: 'none' }} onChange={handleGpxFile} />
                <Upload size={11} /> {importing ? 'Import…' : 'GPX'}
              </label>
              <button onClick={() => setShowManual(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                <Plus size={11} /> Ajouter
              </button>
            </div>
          </div>

          {/* Bottom stats row */}
          <div style={{ display: 'flex', gap: 24, paddingTop: 16, borderTop: '1px solid rgba(240,228,204,0.12)' }}>
            {[
              { l: 'Temps',      v: fmtDurLong(secWeek) },
              { l: 'Dénivelé',   v: elevWeek > 0 ? `+${elevWeek}m` : '—' },
              { l: 'Allure moy', v: kmWeek > 0 && secWeek > 0 ? fmtPace(secWeek / kmWeek) : '—' },
            ].map(s => (
              <div key={s.l}>
                <p style={{ fontSize: 9, color: 'rgba(240,228,204,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{s.l}</p>
                <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: WHEAT }}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── R1C3-4 : RÉSUMÉ DE LA SEMAINE ─────────────── */}
        <div style={{ ...orangeCard(), gridColumn: 'span 2', padding: 28, display: 'flex', flexDirection: 'column' }}>
          <p style={{ ...label('#1A0A0A'), marginBottom: 18 }}>Résumé de la semaine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {[
              { l: 'Distance',  v: `${kmWeek.toFixed(1)} km`,         pct: pctKm,      target: `${OBJ_KM} km` },
              { l: 'Séances',   v: `${seancesWeek} / ${OBJ_SEANCES}`, pct: pctSeances, target: `${OBJ_SEANCES} sorties` },
              { l: 'Dénivelé',  v: `+${elevWeek}m`,                    pct: pctElev,    target: `${OBJ_ELEV}m` },
              { l: 'Temps',     v: fmtDurLong(secWeek),                pct: Math.min(100, (secWeek / 7200) * 100), target: '2h' },
            ].map(obj => (
              <div key={obj.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#1A0A0A' }}>{obj.l}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: '#1A0A0A' }}>{obj.v}</span>
                    <span style={{ fontSize: 10, color: 'rgba(26,10,10,0.5)' }}>/ {obj.target}</span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(26,10,10,0.15)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: '#1A0A0A',
                    width: `${obj.pct}%`, transition: 'width .6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Total all-time */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(26,10,10,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Total all-time</p>
              <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>{allKm.toFixed(0)} km</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Sorties</p>
              <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: '#1A0A0A', lineHeight: 1 }}>{activities.length}</p>
            </div>
          </div>
        </div>

        {/* ── R2 : 4 KPI CARDS ──────────────────────────── */}
        {[
          { l: 'Séances / semaine', v: String(seancesWeek), sub: `obj. ${OBJ_SEANCES}`, pct: pctSeances, color: TEAL, dark: true },
          { l: 'Distance / semaine', v: `${kmWeek.toFixed(1)}`, unit: 'km', sub: `obj. ${OBJ_KM} km`, pct: pctKm, color: ORANGE, dark: false },
          { l: 'Allure moyenne', v: kmWeek > 0 && secWeek > 0 ? fmtPace(secWeek / kmWeek) : avgPaceAll > 0 ? fmtPace(avgPaceAll) : '—', sub: 'dernières sorties', color: '#11686A', dark: true },
          { l: 'Dénivelé / semaine', v: `+${elevWeek}`, unit: 'm', sub: `obj. ${OBJ_ELEV}m`, pct: pctElev, color: '#5B6F3A', dark: true },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.color, borderRadius: 12, padding: '22px 22px 18px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
          }}>
            <div>
              <p style={{ fontSize: 9, color: kpi.dark ? 'rgba(240,228,204,0.5)' : 'rgba(26,10,10,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{kpi.l}</p>
              <p style={{ ...DF, fontSize: 36, fontWeight: 900, color: kpi.dark ? WHEAT : '#1A0A0A', lineHeight: 1 }}>
                {kpi.v}
                {kpi.unit && <span style={{ fontSize: 14, marginLeft: 3 }}>{kpi.unit}</span>}
              </p>
            </div>
            <div>
              {kpi.pct !== undefined && (
                <div style={{ height: 4, borderRadius: 99, background: kpi.dark ? 'rgba(240,228,204,0.15)' : 'rgba(26,10,10,0.15)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: kpi.dark ? WHEAT : '#1A0A0A', width: `${kpi.pct}%` }} />
                </div>
              )}
              <p style={{ fontSize: 10, color: kpi.dark ? 'rgba(240,228,204,0.45)' : 'rgba(26,10,10,0.45)' }}>{kpi.sub}</p>
            </div>
          </div>
        ))}

        {/* ── R3C1-2 : APERÇU SEMAINE ───────────────────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...label('rgba(240,228,204,0.55)') }}>Aperçu de la semaine</p>
            <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.4)' }}>{kmWeek.toFixed(1)} km · {fmtDur(secWeek)}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <BarChart data={dayData} labels={dayLabels} color="rgba(240,228,204,0.35)" highlight={todayIdx} />
          </div>
          {/* Détail jours */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 8 }}>
            {dayData.map((km, i) => {
              const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
              const iso = d.toISOString().slice(0, 10)
              const runs = activities.filter(a => a.date === iso)
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  {km > 0 && runs.map(r => (
                    <p key={r.id} style={{ fontSize: 9, color: ORANGE, ...DF, fontWeight: 700, marginBottom: 2 }}>
                      {r.title?.slice(0, 8) ?? `${km.toFixed(1)}km`}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── R3C3-4 : PROCHAINE COURSE + ALLURE ─────────── */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Prochaine course */}
          <div style={{ ...card(), padding: 22, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ ...label() }}>Prochaine course planifiée</p>
              {!showPlanForm && (
                <button onClick={() => setShowPlanForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
                    background: ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 10,
                    border: 'none', cursor: 'pointer' }}>
                  <Plus size={10} /> Planifier
                </button>
              )}
            </div>

            {showPlanForm ? (
              <form onSubmit={handlePlan} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Date</p>
                    <input type="date" value={planForm.date}
                      onChange={e => setPlanForm(f => ({ ...f, date: e.target.value }))}
                      min={tomorrow}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-active)',
                        borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Distance (km)</p>
                    <input type="number" step="0.1" value={planForm.distance} placeholder="10.0" autoFocus
                      onChange={e => setPlanForm(f => ({ ...f, distance: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Titre (optionnel)</p>
                  <input type="text" value={planForm.title} placeholder="ex : Sortie longue du dimanche"
                    onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="submit" disabled={planSaving || !planForm.distance}
                    style={{ flex: 1, background: planForm.distance ? ORANGE : 'var(--border)', color: '#fff',
                      borderRadius: 8, padding: '9px 0', ...DF, fontWeight: 700, fontSize: 12,
                      border: 'none', cursor: planForm.distance ? 'pointer' : 'default', transition: 'background .2s' }}>
                    {planSaving ? 'Enregistrement…' : 'Planifier cette sortie'}
                  </button>
                  <button type="button" onClick={() => setShowPlanForm(false)}
                    style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--bg-input)',
                      border: '1px solid var(--border)', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : nextRun ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: '#11686A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={22} style={{ color: WHEAT }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: 'var(--wheat)' }}>
                    {(nextRun as any).title ?? `Course — ${fmtDate(nextRun.date)}`}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{fmtDateLong(nextRun.date)}</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    {nextRun.distance_km != null && (
                      <span style={{ ...DF, fontSize: 13, fontWeight: 800, color: ORANGE }}>{nextRun.distance_km.toFixed(1)} km</span>
                    )}
                    {nextRun.pace_sec_per_km != null && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtPace(nextRun.pace_sec_per_km)}</span>
                    )}
                  </div>
                </div>
                {/* Countdown */}
                {(() => {
                  const diff = Math.ceil((new Date(nextRun.date + 'T12:00:00').getTime() - new Date().getTime()) / 86400000)
                  return (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>J-{diff}</p>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                        {diff <= 1 ? 'Demain !' : `${diff} jours`}
                      </p>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 80, gap: 8 }}>
                <Target size={22} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucune sortie planifiée</p>
              </div>
            )}
          </div>

          {/* Allure moyenne — sparkline */}
          <div style={{ ...card(), padding: 22, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ ...label(TEAL) }}>Évolution de l&apos;allure</p>
              <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--wheat)' }}>
                {avgPaceAll > 0 ? fmtPace(avgPaceAll) : '—'}
              </span>
            </div>
            {paceData.some(v => v > 0) ? (
              <SparkLine data={paceData} color={TEAL} height={50} />
            ) : (
              <div style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pas encore de données</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {paceLabels.map((l, i) => (
                <span key={i} style={{ fontSize: 8, color: 'var(--text-muted)' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── R4C1-2 : DERNIÈRES SORTIES ────────────────── */}
        <div style={{ ...card(), gridColumn: 'span 2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <p style={{ ...label() }}>Dernières sorties</p>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activities.length} sorties</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>
            ) : activities.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#11686A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={20} style={{ color: WHEAT }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune sortie enregistrée</p>
              </div>
            ) : activities.map(a => {
              const hasGpx = !!(a.raw_data as any)?.gpx
              return (
                <button key={a.id} className="sport-row-btn" onClick={() => router.push(`/sport/${a.id}`)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#11686A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {hasGpx ? <Zap size={16} style={{ color: ORANGE }} /> : <Activity size={16} style={{ color: WHEAT }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'var(--wheat)', lineHeight: 1.2 }}>
                      {(a as any).title ?? `Course du ${fmtDate(a.date)}`}
                      {hasGpx && <span style={{ fontSize: 8, marginLeft: 6, padding: '2px 5px', borderRadius: 3, background: 'rgba(242,84,45,0.15)', color: ORANGE, ...DF, fontWeight: 700 }}>GPX</span>}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateLong(a.date)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: 'var(--wheat)', lineHeight: 1 }}>{a.distance_km?.toFixed(1)}</p>
                      <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>km</p>
                    </div>
                    {a.duration_seconds != null && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: TEAL }}>{fmtDur(a.duration_seconds)}</p>
                        <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>temps</p>
                      </div>
                    )}
                    {a.pace_sec_per_km != null && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>{fmtPace(a.pace_sec_per_km)}</p>
                        <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>allure</p>
                      </div>
                    )}
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── R4C3-4 : ZONES FC ─────────────────────────── */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...card(), flex: 1, padding: 24 }}>
            <p style={{ ...label(TEAL), marginBottom: 18 }}>Zones de fréquence cardiaque</p>
            <HrZonesBar zones={zones} />
            {/* Total time in zones */}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Temps total analysé</p>
              <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'var(--wheat)' }}>{fmtDurLong(secWeek)}</p>
            </div>
          </div>
          <div style={{ ...card(), padding: 20 }}>
            <p style={{ ...label(), marginBottom: 12 }}>FC Moyenne</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {activities.slice(0, 5).filter(a => a.heart_rate_avg).map(a => (
                <div key={a.id} style={{ textAlign: 'center' }}>
                  <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: 'var(--wheat)' }}>{a.heart_rate_avg}</p>
                  <p style={{ fontSize: 8, color: 'var(--text-muted)' }}>{fmtDate(a.date)}</p>
                </div>
              ))}
              {!activities.some(a => a.heart_rate_avg) && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pas de données FC</p>
              )}
            </div>
          </div>
        </div>

        {/* ── R5C1-2 : PLAN D'ENTRAÎNEMENT ─────────────── */}
        <div style={{ ...tealCard(), gridColumn: 'span 2', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <p style={{ ...label('rgba(240,228,204,0.55)'), marginBottom: 18 }}>Plan d&apos;entraînement</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, flex: 1 }}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => {
              const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
              const iso = d.toISOString().slice(0, 10)
              const runs = activities.filter(a => a.date === iso)
              const km = runs.reduce((s, a) => s + (a.distance_km ?? 0), 0)
              const isPast = d < today; const isToday = iso === today.toISOString().slice(0, 10)
              return (
                <div key={day} style={{
                  borderRadius: 8, padding: '10px 6px', textAlign: 'center',
                  background: isToday ? 'rgba(242,84,45,0.25)' : km > 0 ? 'rgba(240,228,204,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isToday ? 'rgba(242,84,45,0.5)' : 'rgba(240,228,204,0.1)'}`,
                  opacity: isPast && km === 0 ? 0.5 : 1,
                }}>
                  <p style={{ fontSize: 9, color: isToday ? ORANGE : 'rgba(240,228,204,0.45)', ...DF, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>{day}</p>
                  {km > 0 ? (
                    <>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' }}>
                        <Activity size={13} style={{ color: '#fff' }} />
                      </div>
                      <p style={{ ...DF, fontSize: 12, fontWeight: 900, color: WHEAT }}>{km.toFixed(1)}</p>
                      <p style={{ fontSize: 8, color: 'rgba(240,228,204,0.4)' }}>km</p>
                    </>
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(240,228,204,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(240,228,204,0.2)' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Prochains objectifs */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(240,228,204,0.12)', display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: 'rgba(240,228,204,0.07)', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 9, color: 'rgba(240,228,204,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Objectif semaine</p>
              <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT }}>{OBJ_KM} km · {OBJ_SEANCES} sorties</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Donut pct={pctKm} color={ORANGE} size={52} stroke={6} />
              <Donut pct={pctSeances} color={WHEAT} size={52} stroke={6} />
            </div>
          </div>
        </div>

        {/* ── R5C3 : DÉFIS & OBJECTIFS ──────────────────── */}
        <div style={{ ...orangeCard(), padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ ...label('#1A0A0A'), marginBottom: 4 }}>Défis & Objectifs</p>
          {[
            { icon: <Target size={14} />, l: '100 km / mois',   v: `${activities.filter(a => {const d=new Date(a.date+'T12:00:00'); return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()}).reduce((s,a)=>s+(a.distance_km??0),0).toFixed(0)} km`, pct: Math.min(100, (activities.filter(a=>{const d=new Date(a.date+'T12:00:00');return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()}).reduce((s,a)=>s+(a.distance_km??0),0)/100)*100) },
            { icon: <Award   size={14} />, l: 'Total 500 km',    v: `${allKm.toFixed(0)} km`, pct: Math.min(100, (allKm / 500) * 100) },
            { icon: <TrendingUp size={14} />, l: '50 sorties',   v: `${activities.length} sorties`, pct: Math.min(100, (activities.length / 50) * 100) },
          ].map(d => (
            <div key={d.l} style={{ background: 'rgba(26,10,10,0.1)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#1A0A0A' }}>
                {d.icon}
                <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#1A0A0A' }}>{d.l}</span>
                <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: '#1A0A0A', marginLeft: 'auto' }}>{d.v}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(26,10,10,0.2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#1A0A0A', width: `${d.pct}%` }} />
              </div>
              <p style={{ fontSize: 9, color: 'rgba(26,10,10,0.5)', marginTop: 4 }}>{d.pct.toFixed(0)}%</p>
            </div>
          ))}
        </div>

        {/* ── R5C4 : MEILLEURS TEMPS ────────────────────── */}
        <div style={{ ...card(), padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ ...label(TEAL), marginBottom: 4 }}>Meilleurs temps</p>
          {[
            { dist: '5 km',   run: best5k  },
            { dist: '10 km',  run: best10k },
            { dist: 'Semi',   run: bestHm  },
          ].map(({ dist, run }) => (
            <div key={dist} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: 8, background: 'var(--bg-input)',
              border: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ ...DF, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>{dist}</p>
                {run && <p style={{ fontSize: 9, color: 'var(--text-subtle)', marginTop: 2 }}>{fmtDate(run.date)}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: run ? 'var(--wheat)' : 'var(--text-muted)', lineHeight: 1 }}>
                  {run ? fmtDur(run.duration_seconds ?? 0) : '—'}
                </p>
                {run?.pace_sec_per_km && <p style={{ fontSize: 9, color: TEAL, marginTop: 2 }}>{fmtPace(run.pace_sec_per_km)}</p>}
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Plus longue sortie</p>
            {(() => {
              const best = activities.reduce<typeof activities[0] | null>((b, a) =>
                !b || (a.distance_km ?? 0) > (b.distance_km ?? 0) ? a : b, null)
              return best ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'var(--wheat)' }}>{best.distance_km?.toFixed(1)} km</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(best.date)}</p>
                </div>
              ) : <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</p>
            })()}
          </div>
        </div>

        {/* ── R6 : PROGRESSION 6 MOIS ───────────────────── */}
        <div style={{ ...card(), gridColumn: 'span 4', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...label() }}>Progression — 6 derniers mois</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { l: 'Total 6 mois', v: `${months6.reduce((s, m) => s + m.km, 0).toFixed(0)} km` },
                { l: 'Moy / mois',   v: `${(months6.reduce((s, m) => s + m.km, 0) / 6).toFixed(0)} km` },
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{s.l}</p>
                  <p style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--wheat)' }}>{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Bar chart 6 mois */}
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {months6.map((m, i) => {
              const maxKm = Math.max(...months6.map(x => x.km), 1)
              const h = m.km > 0 ? Math.max(8, (m.km / maxKm) * 120) : 4
              const isLast = i === months6.length - 1
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {m.km > 0 && <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: isLast ? ORANGE : 'var(--text-muted)' }}>{m.km.toFixed(0)}</span>}
                  <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0',
                    background: m.km > 0 ? (isLast ? ORANGE : 'var(--bg-card-hover)') : 'var(--border)',
                    border: `1px solid ${isLast ? ORANGE : 'var(--border)'}`,
                    transition: 'height .4s ease' }} />
                  <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: isLast ? ORANGE : 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-subtle)' }}>{m.km.toFixed(0)} km</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

export default function SportPage() {
  return (
    <Suspense fallback={null}>
      <SportPageInner />
    </Suspense>
  )
}
