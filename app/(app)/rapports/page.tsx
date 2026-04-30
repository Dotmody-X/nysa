'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight, X, TrendingUp, TrendingDown,
  Clock, CheckSquare, Activity, DollarSign,
  Award, Zap, Heart, Flame, Star, Target,
  BarChart2, ChevronRight,
} from 'lucide-react'
import { useRapports } from '@/hooks/useRapports'
import { useHealth }   from '@/hooks/useHealth'
import { useMultiMonthSummary } from '@/hooks/useBudget'
import type { DayStat, ProjectStat } from '@/hooks/useRapports'
import type { MonthSummary } from '@/hooks/useBudget'

// ── Constants ──────────────────────────────────────────────────────────────
const ORANGE  = '#F2542D'
const TEAL    = '#0E9594'
const WHEAT   = '#F0E4CC'
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtSec(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`
}
function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}
function pct(a: number, b: number) { return b === 0 ? 0 : Math.round(a / b * 100) }

function aggregateByN(stats: DayStat[], n: number): DayStat[] {
  const result: DayStat[] = []
  for (let i = 0; i < stats.length; i += n) {
    const chunk = stats.slice(i, i + n)
    result.push({
      date:       chunk[0].date,
      label:      chunk[0].label || chunk[Math.floor(n / 2)]?.label || '',
      seconds:    chunk.reduce((s, d) => s + d.seconds, 0),
      tasks_done: chunk.reduce((s, d) => s + d.tasks_done, 0),
    })
  }
  return result
}

// ── Types ──────────────────────────────────────────────────────────────────
type PeriodKey  = '7d' | '30d' | '3m' | 'year'
type PanelType  = 'activite'|'repartition'|'tt'|'sante'|'finances'|'equilibre'|'progression'|'realisations'|'ia'|null

// ── Shared card style ──────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 16,
  border: '1px solid var(--border)', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
}
const LBL: React.CSSProperties = {
  ...DF, fontSize: 10, fontWeight: 800,
  letterSpacing: '0.13em', textTransform: 'uppercase',
}
const HDR: React.CSSProperties = {
  padding: '16px 20px 12px', borderBottom: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
}

// ── FooterLink ─────────────────────────────────────────────────────────────
function FooterLink({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) {
  const base: React.CSSProperties = {
    padding: '11px 20px', borderLeft: 0, borderRight: 0, borderBottom: 0,
    borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexShrink: 0, marginTop: 'auto',
    width: '100%', background: 'transparent', cursor: 'pointer',
  }
  if (href) return (
    <Link href={href} style={{ ...base, textDecoration: 'none' }}>
      <span style={{ ...LBL, color: 'var(--text-muted)' }}>{label}</span>
      <ArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
    </Link>
  )
  return (
    <button onClick={onClick} style={base}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,228,204,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <span style={{ ...LBL, color: 'var(--text-muted)' }}>{label}</span>
      <ArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}

// ── Drawer ─────────────────────────────────────────────────────────────────
function Drawer({ title, open, onClose, children, width = 480 }: {
  title: string; open: boolean; onClose: () => void
  children: React.ReactNode; width?: number
}) {
  return (
    <>
      {open && (
        <div onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 49, backdropFilter: 'blur(2px)' }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}>
        <div style={{ ...HDR, borderBottom: '1px solid var(--border)', padding: '20px 24px 16px', flexShrink: 0 }}>
          <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </>
  )
}

// ── ActivityChart ──────────────────────────────────────────────────────────
function ActivityChart({ data }: { data: DayStat[] }) {
  if (!data.length) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(240,228,204,0.3)', fontSize: 12 }}>Aucune donnée</span></div>
  const W = 540, H = 160
  const pL = 8, pR = 8, pT = 10, pB = 22
  const cW = W - pL - pR, cH = H - pT - pB
  const maxSec   = Math.max(...data.map(d => d.seconds), 1)
  const maxTasks = Math.max(...data.map(d => d.tasks_done), 1)
  const xStep    = cW / Math.max(data.length - 1, 1)

  const tPts = data.map((d, i) => ({ x: pL + i * xStep, y: pT + cH - (d.seconds / maxSec) * cH }))
  const aPts = data.map((d, i) => ({ x: pL + i * xStep, y: pT + cH - (d.tasks_done / maxTasks) * cH }))
  const toD  = (pts: {x:number;y:number}[]) => pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const showLbl = (i: number) => {
    if (data.length <= 7)  return true
    if (data.length <= 31) return i % 5 === 0 || i === data.length - 1
    if (data.length <= 13) return true
    return i % 4 === 0 || i === data.length - 1
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={pL} x2={W - pR} y1={pT + cH * (1 - p)} y2={pT + cH * (1 - p)}
          stroke="rgba(240,228,204,0.07)" strokeWidth="1" />
      ))}
      <path d={toD(tPts)} fill="none" stroke={TEAL}   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toD(aPts)} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {tPts.map((p, i) => data[i].seconds > 0    && <circle key={`t${i}`} cx={p.x} cy={p.y} r="3" fill={TEAL}   />)}
      {aPts.map((p, i) => data[i].tasks_done > 0 && <circle key={`a${i}`} cx={p.x} cy={p.y} r="3" fill={ORANGE} />)}
      {data.map((d, i) => showLbl(i) && d.label && (
        <text key={i} x={pL + i * xStep} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(240,228,204,0.45)">{d.label}</text>
      ))}
    </svg>
  )
}

// ── DonutChart ─────────────────────────────────────────────────────────────
function DonutChart({ segments, total, size = 160 }: {
  segments: { color: string; value: number; label: string }[]
  total: number; size?: number
}) {
  const cx = size / 2, cy = size / 2, R = size * 0.38, r = size * 0.24
  let cum = 0
  const slices = segments.filter(s => s.value > 0).map(s => {
    const start = cum; cum += s.value / total
    return { ...s, start, pct: s.value / total }
  })
  function arc(s: number, e: number) {
    const a1 = (s - 0.25) * 2 * Math.PI, a2 = (e - 0.25) * 2 * Math.PI
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2)
    const x4 = cx + r * Math.cos(a1), y4 = cy + r * Math.sin(a1)
    const lg = e - s > 0.5 ? 1 : 0
    return `M${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${x3},${y3} A${r},${r},0,${lg},0,${x4},${y4} Z`
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {slices.length === 0 && <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(240,228,204,0.1)" strokeWidth={R - r} />}
      {slices.map((s, i) => <path key={i} d={arc(s.start, s.start + s.pct)} fill={s.color} />)}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="12" fill={WHEAT} fontFamily="var(--font-display)" fontWeight="900">{fmtSec(total)}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="rgba(240,228,204,0.5)">Total</text>
    </svg>
  )
}

// ── ProgressionChart ───────────────────────────────────────────────────────
function ProgressionChart({ months }: { months: MonthSummary[] }) {
  if (months.length < 2) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(240,228,204,0.3)', fontSize: 12 }}>Données insuffisantes</span></div>
  const W = 460, H = 140
  const pL = 10, pR = 10, pT = 10, pB = 22
  const cW = W - pL - pR, cH = H - pT - pB
  const maxVal = Math.max(...months.flatMap(m => [m.income, m.expense]), 1)
  const xStep  = cW / (months.length - 1)
  const iPts = months.map((m, i) => ({ x: pL + i * xStep, y: pT + cH - (m.income / maxVal)  * cH }))
  const ePts = months.map((m, i) => ({ x: pL + i * xStep, y: pT + cH - (m.expense / maxVal) * cH }))
  const toD  = (pts: {x:number;y:number}[]) => pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {[0.33, 0.66].map(p => (
        <line key={p} x1={pL} x2={W - pR} y1={pT + cH * (1 - p)} y2={pT + cH * (1 - p)} stroke="rgba(240,228,204,0.07)" strokeWidth="1" />
      ))}
      <path d={toD(iPts)} fill="none" stroke={TEAL}   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toD(ePts)} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {iPts.map((p, i) => <circle key={`i${i}`} cx={p.x} cy={p.y} r="3" fill={TEAL}   />)}
      {ePts.map((p, i) => <circle key={`e${i}`} cx={p.x} cy={p.y} r="3" fill={ORANGE} />)}
      {months.map((m, i) => (
        <text key={i} x={pL + i * xStep} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(240,228,204,0.45)">{m.label}</text>
      ))}
    </svg>
  )
}

// ── ScoreBar ───────────────────────────────────────────────────────────────
function ScoreBar({ value, color = TEAL }: { value: number; color?: string }) {
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'rgba(240,228,204,0.12)', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, borderRadius: 99, background: color, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function RapportsPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('30d')
  const [panel, setPanel]               = useState<PanelType>(null)

  // ── Period → hook args ──────────────────────────────────────────────────
  const { rapportPeriod, ref } = useMemo(() => {
    const now = new Date()
    if (activePeriod === '7d')   return { rapportPeriod: 'week'    as const, ref: now }
    if (activePeriod === '30d')  return { rapportPeriod: 'month'   as const, ref: now }
    if (activePeriod === '3m')   return { rapportPeriod: '3months' as const, ref: now }
    return                              { rapportPeriod: 'year'    as const, ref: now }
  }, [activePeriod])

  const { data, loading }  = useRapports(rapportPeriod, ref)
  const health             = useHealth()
  const now                = new Date()
  const multiMonth         = useMultiMonthSummary(now.getFullYear(), now.getMonth() + 1, 6)

  // ── Aggregated chart data ───────────────────────────────────────────────
  const chartData = useMemo(() => {
    const ds = data?.dailyStats ?? []
    if (activePeriod === '3m')   return aggregateByN(ds, 7)
    if (activePeriod === 'year') return aggregateByN(ds, 30)
    return ds
  }, [data?.dailyStats, activePeriod])

  // ── Computed scores ─────────────────────────────────────────────────────
  const days = activePeriod === '7d' ? 7 : activePeriod === '30d' ? 30 : activePeriod === '3m' ? 90 : 365
  const targetHoursPerDay = 4
  const actualHours       = (data?.totalSeconds ?? 0) / 3600
  const scoreProductivite = Math.min(100, Math.round(actualHours / (days * targetHoursPerDay) * 100))

  const runsTarget = activePeriod === '7d' ? 2 : activePeriod === '30d' ? 8 : activePeriod === '3m' ? 24 : 96
  const scoreSante = Math.min(100, Math.round((data?.totalRuns ?? 0) / runsTarget * 100))

  const balance        = (data?.totalIncome ?? 0) - (data?.totalExpense ?? 0)
  const scoreFinances  = data?.totalIncome
    ? Math.min(100, Math.max(0, Math.round(50 + (balance / data.totalIncome) * 50)))
    : 50
  const scoreEquilibre = Math.round((scoreProductivite + scoreSante + scoreFinances) / 3)

  // ── Period label ────────────────────────────────────────────────────────
  const periodeLabel = activePeriod === '7d' ? 'cette semaine'
    : activePeriod === '30d'  ? 'ce mois'
    : activePeriod === '3m'   ? 'ces 3 mois'
    : 'cette année'

  // ── Top running pace ────────────────────────────────────────────────────
  const avgPace = health.activities.length
    ? health.activities.reduce((s, a) => {
        if (!a.distance_km || !a.duration_seconds) return s
        return s + (a.duration_seconds / 60 / a.distance_km)
      }, 0) / health.activities.filter(a => a.distance_km && a.duration_seconds).length
    : null

  // ── Réalisations (computed from data) ───────────────────────────────────
  const realisations = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; sub: string; color: string }[] = []
    if ((data?.totalRuns ?? 0) >= 10)
      list.push({ icon: <Flame size={14} />, text: `${data!.totalRuns} séances de course`, sub: 'Record personnel !', color: ORANGE })
    if ((data?.tasksDone ?? 0) >= 20)
      list.push({ icon: <CheckSquare size={14} />, text: `${data!.tasksDone} tâches terminées`, sub: 'Excellent focus !', color: TEAL })
    if (balance > 0)
      list.push({ icon: <Star size={14} />, text: `${fmtEur(balance)} économisés`, sub: 'Bonne discipline !', color: '#9B72CF' })
    if (actualHours >= 100)
      list.push({ icon: <Clock size={14} />, text: `${fmtSec(data!.totalSeconds)} travaillés`, sub: 'Focus au top !', color: TEAL })
    return list
  }, [data, balance, actualHours])

  // ── Donut segments ──────────────────────────────────────────────────────
  const donutSegments = useMemo(() => {
    const PALETTE = ['#0E9594','#F2542D','#9B72CF','#E8A838','#3ABCB8','#C45E3E','#7C6FAF','#5E9C8F']
    return (data?.projectStats ?? []).slice(0, 8).map((p, i) => ({
      color: p.color !== '#888' ? p.color : PALETTE[i % PALETTE.length],
      value: p.total_seconds,
      label: p.project_name,
    }))
  }, [data?.projectStats])

  // ════ PANEL CONTENTS ═════════════════════════════════════════════════════

  const PanelActivite = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Activité journalière — Temps tracké (teal) · Tâches (orange)</p>
      <ActivityChart data={chartData} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {(data?.dailyStats ?? []).filter(d => d.seconds > 0 || d.tasks_done > 0).slice(0, 15).map((d, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.date}</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {d.seconds > 0 && <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: TEAL }}>{fmtSec(d.seconds)}</span>}
              {d.tasks_done > 0 && <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: ORANGE }}>{d.tasks_done} tâches</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const PanelRepartition = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DonutChart segments={donutSegments} total={data?.totalSeconds ?? 0} size={180} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {(data?.projectStats ?? []).map((p, i) => {
          const total = data?.totalSeconds ?? 1
          const pc = pct(p.total_seconds, total)
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{p.project_name}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSec(p.total_seconds)}</span>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: WHEAT }}>{pc}%</span>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(240,228,204,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pc}%`, borderRadius: 99, background: p.color !== '#888' ? p.color : TEAL }} />
              </div>
            </div>
          )
        })}
        {!(data?.projectStats?.length) && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucune donnée de temps tracké</p>}
      </div>
    </div>
  )

  const PanelTT = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { l: 'Total', v: fmtSec(data?.totalSeconds ?? 0), c: TEAL },
          { l: 'Facturable', v: fmtSec(data?.billableSeconds ?? 0), c: ORANGE },
          { l: 'Moy. / jour', v: fmtSec(Math.round((data?.totalSeconds ?? 0) / days)), c: WHEAT },
          { l: 'Projets actifs', v: String(data?.projectStats?.length ?? 0), c: WHEAT },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <p style={{ ...LBL, color: 'var(--text-muted)', marginTop: 4 }}>Top projets</p>
      {(data?.projectStats ?? []).slice(0, 10).map((p, i) => {
        const total = data?.totalSeconds ?? 1
        const pc = pct(p.total_seconds, total)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: p.color !== '#888' ? p.color : TEAL, flexShrink: 0 }} />
            <span style={{ fontSize: 12, flex: 1, color: 'var(--text)' }}>{p.project_name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSec(p.total_seconds)}</span>
            <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: WHEAT, minWidth: 32, textAlign: 'right' }}>{pc}%</span>
          </div>
        )
      })}
      <Link href="/time-tracker" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8, color: TEAL, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
        Ouvrir Time Tracker <ArrowRight size={12} />
      </Link>
    </div>
  )

  const PanelSante = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { l: 'Séances', v: String(data?.totalRuns ?? 0), c: TEAL },
          { l: 'Distance', v: data?.totalKm ? data.totalKm.toFixed(1) + ' km' : '— km', c: ORANGE },
          { l: 'Poids actuel', v: health.latestWeight ? `${health.latestWeight} kg` : '—', c: WHEAT },
          { l: 'Allure moy.', v: avgPace ? `${Math.floor(avgPace)}:${String(Math.round((avgPace % 1) * 60)).padStart(2,'0')} /km` : '—', c: WHEAT },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <p style={{ ...LBL, color: 'var(--text-muted)', marginTop: 4 }}>Dernières sorties</p>
      {health.activities.slice(0, 8).map((a, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text)' }}>{a.date}</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {a.distance_km && <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: TEAL }}>{a.distance_km.toFixed(2)} km</span>}
            {a.duration_seconds && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSec(a.duration_seconds)}</span>}
          </div>
        </div>
      ))}
      {!health.activities.length && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucune sortie enregistrée</p>}
      <Link href="/health" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4, color: TEAL, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
        Voir Health <ArrowRight size={12} />
      </Link>
    </div>
  )

  const PanelFinances = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { l: 'Revenus',   v: fmtEur(data?.totalIncome  ?? 0), c: TEAL   },
          { l: 'Dépenses',  v: fmtEur(data?.totalExpense ?? 0), c: ORANGE  },
          { l: 'Solde',     v: fmtEur(balance),                 c: balance >= 0 ? TEAL : ORANGE },
          { l: 'Taux épargne', v: data?.totalIncome ? `${pct(balance, data.totalIncome)}%` : '—', c: WHEAT },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <p style={{ ...LBL, color: 'var(--text-muted)', marginTop: 4 }}>Flux de trésorerie (6 mois)</p>
      <ProgressionChart months={multiMonth} />
      <Link href="/budget" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4, color: TEAL, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
        Ouvrir Budget <ArrowRight size={12} />
      </Link>
    </div>
  )

  const PanelEquilibre = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Répartition pro / perso basée sur les temps trackés par projet.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { l: 'Temps pro', v: fmtSec(data?.totalSeconds ?? 0), c: TEAL },
          { l: 'Score équilibre', v: `${scoreEquilibre}%`, c: scoreEquilibre >= 60 ? TEAL : ORANGE },
        ].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</p>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        {[
          { l: 'Productivité', v: scoreProductivite, c: ORANGE },
          { l: 'Santé', v: scoreSante, c: TEAL },
          { l: 'Finances', v: scoreFinances, c: '#9B72CF' },
          { l: 'Équilibre global', v: scoreEquilibre, c: WHEAT },
        ].map(s => (
          <div key={s.l}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{s.l}</span>
              <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: s.c }}>{s.v}%</span>
            </div>
            <ScoreBar value={s.v} color={s.c} />
          </div>
        ))}
      </div>
    </div>
  )

  const PanelProgression = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Revenus (teal) vs Dépenses (orange) sur 6 mois.</p>
      <ProgressionChart months={multiMonth} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          {['Mois', 'Revenus', 'Dépenses', 'Solde'].map(h => (
            <span key={h} style={{ ...LBL, fontSize: 9, color: 'var(--text-muted)' }}>{h}</span>
          ))}
        </div>
        {multiMonth.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{m.label}</span>
            <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: TEAL }}>{fmtEur(m.income)}</span>
            <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: ORANGE }}>{fmtEur(m.expense)}</span>
            <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: m.balance >= 0 ? TEAL : ORANGE }}>{fmtEur(m.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const PanelRealisations = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vos accomplissements {periodeLabel}.</p>
      {realisations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Star size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Continuez sur cette lancée !</p>
        </div>
      )}
      {realisations.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px', background: 'var(--bg-input)', borderRadius: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: r.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color, flexShrink: 0 }}>
            {r.icon}
          </div>
          <div>
            <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: WHEAT, marginBottom: 2 }}>{r.text}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const PanelIA = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Analyse automatique de votre activité {periodeLabel}.</p>
      <div style={{ background: 'rgba(14,149,148,0.08)', borderRadius: 12, padding: '16px', border: '1px solid rgba(14,149,148,0.2)' }}>
        <p style={{ ...LBL, color: TEAL, marginBottom: 10 }}>Insights</p>
        {loading ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Analyse en cours…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: WHEAT, lineHeight: 1.6 }}>
              Vous avez tracké <strong style={{ color: TEAL }}>{fmtSec(data?.totalSeconds ?? 0)}</strong> {periodeLabel}, soit{' '}
              <strong style={{ color: scoreProductivite >= 70 ? TEAL : ORANGE }}>{scoreProductivite}%</strong> de votre objectif.
            </p>
            {(data?.tasksDone ?? 0) > 0 && (
              <p style={{ fontSize: 13, color: WHEAT, lineHeight: 1.6 }}>
                <strong style={{ color: ORANGE }}>{data!.tasksDone}</strong> tâches terminées sur{' '}
                <strong>{data!.tasksTotal}</strong> — taux de complétion{' '}
                <strong style={{ color: data!.tasksTotal ? (pct(data!.tasksDone, data!.tasksTotal) >= 70 ? TEAL : ORANGE) : WHEAT }}>
                  {data?.tasksTotal ? `${pct(data.tasksDone, data.tasksTotal)}%` : '—'}
                </strong>.
              </p>
            )}
            {(data?.totalRuns ?? 0) > 0 && (
              <p style={{ fontSize: 13, color: WHEAT, lineHeight: 1.6 }}>
                <strong style={{ color: TEAL }}>{data!.totalRuns} sorties</strong> pour{' '}
                <strong>{data!.totalKm.toFixed(1)} km</strong> parcourus.
              </p>
            )}
          </div>
        )}
      </div>
      <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '16px' }}>
        <p style={{ ...LBL, color: 'var(--text-muted)', marginBottom: 10 }}>Recommandations</p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
          {scoreProductivite < 70 && <li style={{ fontSize: 12, color: 'var(--text)', paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: TEAL }}>→</span> Planifiez vos tâches importantes entre 9h et 11h pour maximiser la productivité.</li>}
          {scoreSante < 70 && <li style={{ fontSize: 12, color: 'var(--text)', paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: ORANGE }}>→</span> Augmentez votre fréquence de running — viser {Math.ceil(runsTarget / (days / 7))} séances/semaine.</li>}
          {balance < 0 && <li style={{ fontSize: 12, color: 'var(--text)', paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: ORANGE }}>→</span> Vos dépenses dépassent vos revenus. Revoyez vos charges fixes dans Budget.</li>}
          {scoreEquilibre >= 70 && <li style={{ fontSize: 12, color: 'var(--text)', paddingLeft: 14, position: 'relative' }}><span style={{ position: 'absolute', left: 0, color: TEAL }}>→</span> Excellent équilibre global. Continuez sur cette lancée 🔥</li>}
        </ul>
      </div>
    </div>
  )

  const PANELS: Record<NonNullable<PanelType>, { title: string; content: React.ReactNode; width?: number }> = {
    activite:     { title: 'Aperçu de l\'activité',     content: PanelActivite,    width: 500 },
    repartition:  { title: 'Répartition du temps',      content: PanelRepartition, width: 460 },
    tt:           { title: 'Time Trackers — détail',    content: PanelTT,          width: 460 },
    sante:        { title: 'Rapport Santé & Running',   content: PanelSante,       width: 460 },
    finances:     { title: 'Rapport Financier',         content: PanelFinances,    width: 460 },
    equilibre:    { title: 'Équilibre de vie',          content: PanelEquilibre,   width: 440 },
    progression:  { title: 'Progression Globale',       content: PanelProgression, width: 500 },
    realisations: { title: 'Réalisations',              content: PanelRealisations, width: 440 },
    ia:           { title: 'Insight de l\'Agent IA',   content: PanelIA,          width: 460 },
  }

  const activePanel = panel && PANELS[panel]

  // ── Shared inline card header ──────────────────────────────────────────
  function CH({ label, color = 'var(--text-muted)', right }: { label: string; color?: string; right?: React.ReactNode }) {
    return (
      <div style={HDR}>
        <span style={{ ...LBL, color }}>{label}</span>
        {right}
      </div>
    )
  }

  // ════ RENDER ═══════════════════════════════════════════════════════════
  const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
    { key: '7d',   label: '7 JOURS' },
    { key: '30d',  label: '30 JOURS' },
    { key: '3m',   label: '3 MOIS' },
    { key: 'year', label: 'CETTE ANNÉE' },
  ]

  return (
    <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' }}>

      {/* Drawer */}
      {activePanel && (
        <Drawer title={activePanel.title} open={!!panel} onClose={() => setPanel(null)} width={activePanel.width}>
          {activePanel.content}
        </Drawer>
      )}

      {/* ══ GRID ════════════════════════════════════════════════════════ */}
      <div className="bento-grid md:grid md:grid-cols-4" style={{
        gridTemplateRows: 'minmax(280px,auto) minmax(240px,auto) minmax(480px,auto) minmax(360px,auto) minmax(260px,auto) auto',
        gap: 12,
      }}>

        {/* ── R1 C1-2 : Header + Tabs ─────────────────────────────────── */}
        <div style={{ gridColumn: '1/3', gridRow: '1/2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 4 }}>
          <div>
            <h1 style={{ ...DF, fontSize: 52, fontWeight: 900, color: WHEAT, letterSpacing: '-0.02em', lineHeight: 0.95, marginBottom: 6 }}>RAPPORTS.</h1>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
              ANALYSEZ · PROGRESSEZ · PAS À PAS
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIOD_TABS.map(t => (
              <button key={t.key} onClick={() => setActivePeriod(t.key)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: activePeriod === t.key ? ORANGE : 'var(--bg-card)',
                  color: activePeriod === t.key ? '#fff' : 'var(--text-muted)',
                  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer',
                  outline: activePeriod === t.key ? 'none' : '1px solid var(--border)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── R1 C3-4 : VUE D'ENSEMBLE ────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '3/5', gridRow: '1/2', background: ORANGE, border: 'none' }}>
          <div style={{ ...HDR, borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '16px 22px 12px' }}>
            <span style={{ ...LBL, color: 'rgba(255,255,255,0.9)' }}>Vue d'ensemble</span>
            <TrendingUp size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1 }}>
            {[
              { icon: <Zap size={16} />,         label: 'Productivité', value: scoreProductivite },
              { icon: <Heart size={16} />,        label: 'Santé',        value: scoreSante       },
              { icon: <DollarSign size={16} />,   label: 'Finances',     value: scoreFinances    },
              { icon: <BarChart2 size={16} />,    label: 'Équilibre',    value: scoreEquilibre   },
            ].map((s, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.2)' : 'none', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{s.icon}</div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
                <p style={{ ...DF, fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{loading ? '—' : `${s.value}%`}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>vs objectif</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── R2 : 4 KPI cards ────────────────────────────────────────── */}
        {[
          {
            icon: <Clock size={14} />, label: 'Temps productif', color: ORANGE,
            value: loading ? '…' : fmtSec(data?.totalSeconds ?? 0),
            sub:   loading ? '' : `Moy. ${fmtSec(Math.round((data?.totalSeconds ?? 0) / days))} / jour`,
            panel: 'tt' as PanelType,
          },
          {
            icon: <CheckSquare size={14} />, label: 'Tâches accomplies', color: TEAL,
            value: loading ? '…' : String(data?.tasksDone ?? 0),
            sub:   loading ? '' : `sur ${data?.tasksTotal ?? 0} — ${data?.tasksTotal ? pct(data.tasksDone, data.tasksTotal) : 0}% complétion`,
            panel: null,
          },
          {
            icon: <Activity size={14} />, label: 'Courses', color: '#9B72CF',
            value: loading ? '…' : `${data?.totalRuns ?? 0} sorties`,
            sub:   loading ? '' : `${(data?.totalKm ?? 0).toFixed(1)} km parcourus`,
            panel: 'sante' as PanelType,
          },
          {
            icon: <DollarSign size={14} />, label: 'Solde financier', color: balance >= 0 ? TEAL : ORANGE,
            value: loading ? '…' : fmtEur(balance),
            sub:   loading ? '' : `Revenus ${fmtEur(data?.totalIncome ?? 0)}`,
            panel: 'finances' as PanelType,
          },
        ].map((k, i) => (
          <div key={i} style={{ ...CARD, gridColumn: `${i + 1}/${i + 2}`, gridRow: '2/3' }}>
            <div style={{ padding: '18px 20px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ color: k.color }}>{k.icon}</span>
                <span style={{ ...LBL, color: 'var(--text-muted)', fontSize: 9 }}>{k.label}</span>
              </div>
              <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 6 }}>{k.value}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.sub}</p>
            </div>
            {k.panel && <FooterLink label={`Voir ${k.label.toLowerCase()}`} onClick={() => setPanel(k.panel)} />}
          </div>
        ))}

        {/* ── R3 C1-2 : Aperçu activité ────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '1/3', gridRow: '3/4', background: '#11686A', border: 'none' }}>
          <CH label="Aperçu de l'activité" color={WHEAT}
            right={
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(240,228,204,0.7)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: TEAL, display: 'inline-block' }} /> Temps
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(240,228,204,0.7)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: ORANGE, display: 'inline-block' }} /> Tâches
                </span>
              </div>
            }
          />
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading
              ? <p style={{ color: 'rgba(240,228,204,0.4)', fontSize: 12 }}>Chargement…</p>
              : <ActivityChart data={chartData} />
            }
          </div>
          <FooterLink label="Voir l'analyse détaillée" onClick={() => setPanel('activite')} />
        </div>

        {/* ── R3 C3-4 : Répartition du temps ──────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '3/5', gridRow: '3/4' }}>
          <CH label="Répartition du temps" color={TEAL} />
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <DonutChart segments={donutSegments} total={data?.totalSeconds ?? 0} size={160} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {(data?.projectStats ?? []).slice(0, 7).map((p, i) => {
                const total = data?.totalSeconds ?? 1
                const pc = pct(p.total_seconds, total)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{p.project_name}</span>
                      <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: WHEAT, flexShrink: 0, marginLeft: 6 }}>{pc}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(240,228,204,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pc}%`, borderRadius: 99, background: p.color !== '#888' ? p.color : TEAL }} />
                    </div>
                  </div>
                )
              })}
              {!(data?.projectStats?.length) && !loading && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune entrée de temps</p>
              )}
            </div>
          </div>
          <FooterLink label="Voir détail par catégorie" onClick={() => setPanel('repartition')} />
        </div>

        {/* ── R4 C1 : Time Trackers ────────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '1/2', gridRow: '4/5' }}>
          <CH label="Time Trackers" color={TEAL} />
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{loading ? '…' : fmtSec(data?.totalSeconds ?? 0)}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Total {periodeLabel}</p>
            <p style={{ fontSize: 10, color: TEAL, marginTop: 2 }}>+{loading ? '—' : `${scoreProductivite}%`} vs objectif</p>
            <div style={{ marginTop: 14 }}>
              <p style={{ ...LBL, fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Top projets</p>
              {(data?.projectStats ?? []).slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 99, background: p.color !== '#888' ? p.color : TEAL, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.project_name}</span>
                  </div>
                  <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{fmtSec(p.total_seconds)}</span>
                </div>
              ))}
              {!(data?.projectStats?.length) && !loading && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun projet tracké</p>}
            </div>
          </div>
          <FooterLink label="Voir le rapport complet" onClick={() => setPanel('tt')} />
        </div>

        {/* ── R4 C2 : Santé ───────────────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '2/3', gridRow: '4/5' }}>
          <CH label="Santé" color={ORANGE} />
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{loading ? '…' : `${scoreSante}`}<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 2 }}>/100</span></p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Score moyen</p>
            <p style={{ fontSize: 10, color: scoreSante >= 60 ? TEAL : ORANGE, marginTop: 2 }}>
              {scoreSante >= 70 ? '+5%' : scoreSante >= 40 ? '±0%' : '-5%'} vs période préc.
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { l: 'Courses',    v: loading ? '…' : `${(data?.totalKm ?? 0).toFixed(1)} km`, d: data?.totalRuns ? `+${data.totalRuns} séances` : '0 séance' },
                { l: 'Allure moy.', v: avgPace ? `${Math.floor(avgPace)}:${String(Math.round((avgPace % 1) * 60)).padStart(2,'0')} /km` : '—', d: '' },
                { l: 'Séances',    v: loading ? '…' : String(data?.totalRuns ?? 0), d: '' },
                { l: 'Poids',      v: health.latestWeight ? `${health.latestWeight} kg` : '—', d: '' },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.l}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>{r.v}</span>
                    {r.d && <span style={{ fontSize: 9, color: TEAL, marginLeft: 6 }}>{r.d}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <FooterLink label="Voir le rapport santé" onClick={() => setPanel('sante')} />
        </div>

        {/* ── R4 C3 : Tâches & Activité ───────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '3/4', gridRow: '4/5' }}>
          <CH label="Tâches & Activité" color="#9B72CF" />
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{loading ? '…' : String(data?.tasksDone ?? 0)}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Tâches terminées</p>
            <p style={{ fontSize: 10, color: (data?.tasksLate ?? 0) > 0 ? ORANGE : TEAL, marginTop: 2 }}>
              {loading ? '—' : `${data?.tasksLate ?? 0} en retard`}
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { l: 'Total créées',    v: loading ? '…' : String(data?.tasksTotal ?? 0) },
                { l: 'Complétion',      v: data?.tasksTotal ? `${pct(data.tasksDone, data.tasksTotal)}%` : '—' },
                { l: 'Moy. / jour',     v: loading ? '…' : String(Math.round((data?.tasksDone ?? 0) / days)) },
                { l: 'En retard',       v: loading ? '…' : String(data?.tasksLate ?? 0) },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.l}</span>
                  <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
          <FooterLink label="Voir les tâches" href="/todo" />
        </div>

        {/* ── R4 C4 : Finances ────────────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '4/5', gridRow: '4/5' }}>
          <CH label="Finances" color={TEAL} />
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <p style={{ ...DF, fontSize: 26, fontWeight: 900, color: balance >= 0 ? TEAL : ORANGE, lineHeight: 1 }}>{loading ? '…' : fmtEur(balance)}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Épargne {periodeLabel}</p>
            <p style={{ fontSize: 10, color: balance >= 0 ? TEAL : ORANGE, marginTop: 2 }}>
              {data?.totalIncome ? `${pct(balance, data.totalIncome)}% taux d'épargne` : '—'}
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { l: 'Taux épargne',       v: data?.totalIncome ? `${pct(balance, data.totalIncome)}%` : '—', delta: '+2%'  },
                { l: 'Dép. moy. / jour',   v: data ? fmtEur(Math.round(data.totalExpense / days)) : '—',      delta: '-3%'  },
                { l: 'Revenus',            v: loading ? '…' : fmtEur(data?.totalIncome ?? 0),                 delta: ''     },
                { l: 'Dépenses',           v: loading ? '…' : fmtEur(data?.totalExpense ?? 0),                delta: ''     },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.l}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>{r.v}</span>
                    {r.delta && <span style={{ fontSize: 9, color: r.delta.startsWith('+') ? TEAL : ORANGE }}>{r.delta}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <FooterLink label="Voir le rapport financier" onClick={() => setPanel('finances')} />
        </div>

        {/* ── R5 C1 : Équilibre de vie ─────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '1/2', gridRow: '5/6' }}>
          <CH label="Équilibre de vie" color={WHEAT} />
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Répartition scores</p>
            <p style={{ ...DF, fontSize: 32, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>{scoreEquilibre}%</p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'Productivité', v: scoreProductivite, c: ORANGE },
                { l: 'Santé',        v: scoreSante,        c: TEAL   },
                { l: 'Finances',     v: scoreFinances,     c: '#9B72CF' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.l}</span>
                    <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: s.c }}>{s.v}%</span>
                  </div>
                  <ScoreBar value={s.v} color={s.c} />
                </div>
              ))}
            </div>
          </div>
          <FooterLink label="Voir l'analyse complète" onClick={() => setPanel('equilibre')} />
        </div>

        {/* ── R5 C2-3 : Progression globale ───────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '2/4', gridRow: '5/6' }}>
          <CH label="Progression globale" color={TEAL}
            right={
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: TEAL, display: 'inline-block' }} /> Revenus
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: ORANGE, display: 'inline-block' }} /> Dépenses
                </span>
              </div>
            }
          />
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <ProgressionChart months={multiMonth} />
          </div>
          <FooterLink label="Voir les tendances" onClick={() => setPanel('progression')} />
        </div>

        {/* ── R5 C4 : Réalisations ────────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '4/5', gridRow: '5/6' }}>
          <CH label="Réalisations" color={ORANGE} />
          <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {realisations.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Star size={24} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Continuez sur cette lancée !</p>
              </div>
            )}
            {realisations.slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: r.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color, flexShrink: 0 }}>
                  {r.icon}
                </div>
                <div>
                  <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: WHEAT, lineHeight: 1.3 }}>{r.text}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <FooterLink label="Voir toutes les réalisations" onClick={() => setPanel('realisations')} />
        </div>

        {/* ── R6 : Insight IA ─────────────────────────────────────────── */}
        <div style={{ ...CARD, gridColumn: '1/5', gridRow: '6/7', flexDirection: 'row', minHeight: 160, background: '#0E1630', border: '1px solid rgba(14,149,148,0.3)' }}>
          <div style={{ flex: 1.2, padding: '20px 28px', borderRight: '1px solid rgba(14,149,148,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(14,149,148,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} style={{ color: TEAL }} />
              </div>
              <p style={{ ...LBL, color: TEAL }}>Insight de l'Agent IA</p>
            </div>
            <p style={{ fontSize: 13, color: WHEAT, lineHeight: 1.7 }}>
              {loading ? 'Analyse en cours…' : (
                <>
                  {scoreProductivite >= 70
                    ? `Vous avez été très productif ${periodeLabel} avec ${fmtSec(data?.totalSeconds ?? 0)} trackés. `
                    : `Votre productivité ${periodeLabel} est à ${scoreProductivite}% de l'objectif. `}
                  {(data?.tasksDone ?? 0) > 0 && `${data!.tasksDone} tâches terminées sur ${data!.tasksTotal}. `}
                  {balance > 0
                    ? `Bon équilibre financier avec ${fmtEur(balance)} d'excédent.`
                    : balance < 0 ? `Attention : dépenses supérieures aux revenus de ${fmtEur(Math.abs(balance))}.` : ''}
                </>
              )}
            </p>
          </div>
          <div style={{ flex: 2, padding: '20px 28px' }}>
            <p style={{ ...LBL, color: 'var(--text-muted)', marginBottom: 12 }}>Recommandations personnalisées</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
              {[
                scoreProductivite < 70 && 'Planifiez vos tâches importantes entre 9h et 11h.',
                scoreSante < 60        && `Visez ${Math.ceil(runsTarget / (days / 7))} séances de running par semaine.`,
                balance < 0            && 'Réduisez vos charges fixes — consultez votre Budget.',
                (data?.tasksLate ?? 0) > 3 && 'Réduisez votre backlog en triant les tâches en retard.',
                scoreEquilibre >= 70   && 'Excellent équilibre global. Continuez sur cette lancée 🔥',
                actualHours < 10       && 'Augmentez votre temps de focus journalier progressivement.',
              ].filter(Boolean).slice(0, 4).map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <ChevronRight size={12} style={{ color: TEAL, marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{tip as string}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderLeft: '1px solid rgba(14,149,148,0.2)' }}>
            <button onClick={() => setPanel('ia')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: TEAL, color: '#fff', border: 'none', ...DF, fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Voir tout <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
