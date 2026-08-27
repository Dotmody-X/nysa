'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight, X, TrendingUp,
  Clock, CheckSquare, CheckCircle2,
  Zap, Heart, Flame, Star,
  BarChart2, ChevronRight,
} from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useRapports } from '@/hooks/useRapports'
import { useHealth }   from '@/hooks/useHealth'
import { useMultiMonthSummary } from '@/hooks/useBudget'
import type { DayStat, ProjectStat } from '@/hooks/useRapports'
import type { MonthSummary } from '@/hooks/useBudget'

// ── Constants ──────────────────────────────────────────────────────────────
const ORANGE  = 'var(--accent-brand)'
const TEAL    = 'var(--azul)'
const WHEAT   = 'var(--text)'
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtSec(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`
}
/** Heures décimales, arrondies au centième — la forme qu'on reporte sur une facture. */
function fmtHeures(sec: number) {
  return (sec / 3600).toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      entries_count: chunk.reduce((s, d) => s + d.entries_count, 0),
    })
  }
  return result
}

// ── Types ──────────────────────────────────────────────────────────────────
type PeriodKey  = '7d' | '30d' | '3m' | 'year'
type PanelType  = 'activite'|'repartition'|'tt'|'progression'|'realisations'|null

// ── Shared card style ──────────────────────────────────────────────────────
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
    minHeight: 40, padding: '11px 20px', borderLeft: 0, borderRight: 0, borderBottom: 0,
    borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexShrink: 0, marginTop: 'auto',
    width: '100%', background: 'transparent', cursor: 'pointer',
  }
  if (href) return (
    <Link href={href} className="nb-press" style={{ ...base, textDecoration: 'none' }}>
      <span style={{ ...LBL, color: 'var(--text-muted)' }}>{label}</span>
      <ArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
    </Link>
  )
  return (
    <button onClick={onClick} className="nb-press" style={base}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--text-rgb),0.04)' }}
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
        position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: width,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}>
        <div style={{ ...HDR, borderBottom: '1px solid var(--border)', padding: '20px 24px 16px', flexShrink: 0 }}>
          <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: WHEAT }}>{title}</span>
          <button onClick={onClose} className="nb-press" title="Fermer"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
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
  if (!data.length) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée sur cette période</span></div>
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
          stroke="rgba(var(--text-rgb),0.07)" strokeWidth="1" />
      ))}
      <path d={toD(tPts)} fill="none" stroke={TEAL}   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toD(aPts)} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {tPts.map((p, i) => data[i].seconds > 0    && <circle key={`t${i}`} cx={p.x} cy={p.y} r="3" fill={TEAL}   />)}
      {aPts.map((p, i) => data[i].tasks_done > 0 && <circle key={`a${i}`} cx={p.x} cy={p.y} r="3" fill={ORANGE} />)}
      {data.map((d, i) => showLbl(i) && d.label && (
        <text key={i} x={pL + i * xStep} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(var(--text-rgb),0.45)">{d.label}</text>
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
      {slices.length === 0 && <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(var(--text-rgb),0.1)" strokeWidth={R - r} />}
      {slices.map((s, i) => <path key={i} d={arc(s.start, s.start + s.pct)} fill={s.color} />)}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="12" fill={WHEAT} fontFamily="var(--font-display)" fontWeight="900">{fmtSec(total)}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="rgba(var(--text-rgb),0.5)">Total</text>
    </svg>
  )
}

// ── ProgressionChart ───────────────────────────────────────────────────────
function ProgressionChart({ months }: { months: MonthSummary[] }) {
  if (months.length < 2) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Données insuffisantes — il faut au moins 2 mois</span></div>
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
        <line key={p} x1={pL} x2={W - pR} y1={pT + cH * (1 - p)} y2={pT + cH * (1 - p)} stroke="rgba(var(--text-rgb),0.07)" strokeWidth="1" />
      ))}
      <path d={toD(iPts)} fill="none" stroke={TEAL}   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={toD(ePts)} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {iPts.map((p, i) => <circle key={`i${i}`} cx={p.x} cy={p.y} r="3" fill={TEAL}   />)}
      {ePts.map((p, i) => <circle key={`e${i}`} cx={p.x} cy={p.y} r="3" fill={ORANGE} />)}
      {months.map((m, i) => (
        <text key={i} x={pL + i * xStep} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(var(--text-rgb),0.45)">{m.label}</text>
      ))}
    </svg>
  )
}

// ── ScoreBar ───────────────────────────────────────────────────────────────
function ScoreBar({ value, color = TEAL }: { value: number; color?: string }) {
  return (
    <div style={{ height: 3, borderRadius: 99, background: 'rgba(var(--text-rgb),0.12)', overflow: 'hidden', marginTop: 6 }}>
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

  const heuresPrestees = Math.round((data?.totalSeconds ?? 0) / 3600)
  const joursPrestes   = (data?.dailyStats ?? []).filter(d => d.seconds > 0).length
  const partFacturable = data?.totalSeconds
    ? Math.round((data.billableSeconds / data.totalSeconds) * 100) : 0

  const balance        = (data?.totalIncome ?? 0) - (data?.totalExpense ?? 0)

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
    const PALETTE = ['var(--azul)','var(--accent-brand)','#9B72CF','#E8A838','#3ABCB8','#C45E3E','#7C6FAF','#5E9C8F']
    return (data?.projectStats ?? []).slice(0, 8).map((p, i) => ({
      color: p.color !== '#888' ? p.color : PALETTE[i % PALETTE.length],
      value: p.total_seconds,
      label: p.project_name,
    }))
  }, [data?.projectStats])

  // ════ PANEL CONTENTS ═════════════════════════════════════════════════════

  // Le relevé porte tous les jours de la période, y compris ceux à zéro : un
  // jour sans heures est une information, pas une ligne à masquer. La moyenne,
  // elle, ne compte que les jours travaillés — diviser par les week-ends
  // donnerait un chiffre qui ne veut rien dire.
  const releve = useMemo(() => {
    const jours = data?.dailyStats ?? []
    const travailles = jours.filter(d => d.seconds > 0)
    return {
      jours,
      travailles: travailles.length,
      total: jours.reduce((s, d) => s + d.seconds, 0),
      moyenne: travailles.length ? Math.round(travailles.reduce((s, d) => s + d.seconds, 0) / travailles.length) : 0,
      plusLong: travailles.reduce((m, d) => Math.max(m, d.seconds), 0),
    }
  }, [data?.dailyStats])

  const PanelActivite = (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Activité journalière — Temps tracké (teal) · Tâches (orange)</p>
      <ActivityChart data={chartData} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        {[
          { l: 'Total',              v: fmtSec(releve.total), h: `${fmtHeures(releve.total)} h` },
          { l: 'Jours travaillés',   v: String(releve.travailles), h: `sur ${releve.jours.length}` },
          { l: 'Moy. / jour presté', v: fmtSec(releve.moyenne), h: `${fmtHeures(releve.moyenne)} h` },
          { l: 'Plus longue journée', v: fmtSec(releve.plusLong), h: `${fmtHeures(releve.plusLong)} h` },
        ].map(k => (
          <div key={k.l} style={{ flex: '1 1 130px', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .4 }}>{k.l}</p>
            <p style={{ ...DF, fontSize: 15, fontWeight: 800, color: TEAL }}>{k.v}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.h}</p>
          </div>
        ))}
      </div>

      <div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Heures prestées, jour par jour
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {releve.jours.map(d => {
            const j = new Date(d.date + 'T12:00:00')
            const weekend = j.getDay() === 0 || j.getDay() === 6
            const vide = d.seconds === 0
            return (
              <div key={d.date}
                   style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                            alignItems: 'center', gap: 12, padding: '6px 0',
                            borderBottom: '1px solid var(--border)', opacity: vide ? .45 : 1 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {j.toLocaleDateString('fr-BE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  {weekend && <span style={{ fontSize: 10 }}> · week-end</span>}
                </span>
                <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: vide ? 'var(--text-muted)' : TEAL,
                               minWidth: 62, textAlign: 'right' }}>
                  {vide ? '—' : fmtSec(d.seconds)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 48, textAlign: 'right' }}>
                  {vide ? '' : `${fmtHeures(d.seconds)} h`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 74, textAlign: 'right' }}>
                  {d.entries_count > 0 && `${d.entries_count} chrono${d.entries_count > 1 ? 's' : ''}`}
                  {d.tasks_done > 0 && <span style={{ color: ORANGE }}> · {d.tasks_done} t.</span>}
                </span>
              </div>
            )
          })}
        </div>
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
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(var(--text-rgb),0.1)', overflow: 'hidden' }}>
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
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(var(--text-rgb),0.04)' }}>
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
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${r.color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color, flexShrink: 0 }}>
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


  const PANELS: Record<NonNullable<PanelType>, { title: string; content: React.ReactNode; width?: number }> = {
    activite:     { title: 'Aperçu de l\'activité',     content: PanelActivite,    width: 500 },
    repartition:  { title: 'Répartition du temps',      content: PanelRepartition, width: 460 },
    tt:           { title: 'Time Trackers — détail',    content: PanelTT,          width: 460 },
    progression:  { title: 'Progression Globale',       content: PanelProgression, width: 500 },
    realisations: { title: 'Réalisations',              content: PanelRealisations, width: 440 },
  }

  const activePanel = panel && PANELS[panel]

  // ════ RENDER ═══════════════════════════════════════════════════════════
  const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
    { key: '7d',   label: '7 JOURS' },
    { key: '30d',  label: '30 JOURS' },
    { key: '3m',   label: '3 MOIS' },
    { key: 'year', label: 'CETTE ANNÉE' },
  ]

  // Empty state for demo mode

  return (
    <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%' }}>

      {/* Drawer */}
      {activePanel && (
        <Drawer title={activePanel.title} open={!!panel} onClose={() => setPanel(null)} width={activePanel.width}>
          {activePanel.content}
        </Drawer>
      )}

      {/* ══ GRID ════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'minmax(280px,auto) auto minmax(480px,auto) minmax(360px,auto) minmax(260px,auto)',
        gap: 12,
      }}>

        {/* ── R1 C1-2 : En-tête + filtres de période ──────────────────── */}
        <div style={{ gridColumn: '1/3', gridRow: '1/2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 4 }}>
          <PageTitle
            title="Rapports"
            sub="Analysez · Progressez · Pas à pas"
            accent="var(--accent-rapports)"
            icon={BarChart2}
            iconInk="var(--ink-light)"
          />
          <div className="toolbar-scroll" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIOD_TABS.map(t => (
              <button key={t.key} onClick={() => setActivePeriod(t.key)} className="nb-press"
                style={{
                  minHeight: 40, padding: '8px 16px', borderRadius: 8,
                  border: activePeriod === t.key ? '2px solid var(--ink)' : '2px solid var(--border)',
                  boxShadow: activePeriod === t.key ? '3px 3px 0 var(--ink)' : 'none',
                  background: activePeriod === t.key ? ORANGE : 'var(--bg-card)',
                  color: activePeriod === t.key ? 'var(--ink-dark)' : 'var(--text-muted)',
                  ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── R1 C3-4 : VUE D'ENSEMBLE ────────────────────────────────── */}
        <SectionCard
          title="Vue d'ensemble" num="01" accent="var(--accent-rapports)"
          titleColor="var(--ink-dark)"
          bg={ORANGE}
          action={<TrendingUp size={14} style={{ color: 'rgba(var(--text-rgb),0.7)' }} />}
          style={{ gridColumn: '3/5', gridRow: '1/2', display: 'flex', flexDirection: 'column', '--text-rgb': '26, 10, 10', '--text': 'var(--ink-dark)', '--text-muted': 'rgba(26, 10, 10, 0.65)' } as React.CSSProperties}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1 }}>
            {[
              { icon: <Zap size={16} />,       label: 'Productivité', value: scoreProductivite, unite: '%',  sous: 'vs objectif' },
              { icon: <Clock size={16} />,     label: 'Heures',       value: heuresPrestees,    unite: 'h',  sous: `${joursPrestes} jours prestés` },
              { icon: <CheckCircle2 size={16} />, label: 'Tâches',    value: data?.tasksDone ?? 0, unite: '', sous: `${data?.tasksLate ?? 0} en retard` },
              { icon: <BarChart2 size={16} />, label: 'Facturable',   value: partFacturable,    unite: '%',  sous: 'du temps suivi' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i % 2 === 0 ? '1px solid rgba(var(--text-rgb),0.2)' : 'none', borderBottom: i < 2 ? '1px solid rgba(var(--text-rgb),0.2)' : 'none' }}>
                <div style={{ color: 'rgba(var(--text-rgb),0.7)', marginBottom: 6 }}>{s.icon}</div>
                <p style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.75)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
                <p style={{ ...DF, fontSize: 30, fontWeight: 900, color: 'var(--ink-dark)', lineHeight: 1 }}>{loading ? '—' : `${s.value}${s.unite}`}</p>
                <p style={{ fontSize: 9, color: 'rgba(var(--text-rgb),0.6)', marginTop: 3 }}>{s.sous}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── R2 : 4 KPI ──────────────────────────────────────────────── */}
        <div style={{ gridColumn: '1/5', gridRow: '2/3' }}>
          <KpiGrid>
            <KpiCard
              label="Temps productif" accent={ORANGE} color={ORANGE}
              value={loading ? '…' : fmtSec(data?.totalSeconds ?? 0)}
              sub={loading ? '' : `Moy. ${fmtSec(Math.round((data?.totalSeconds ?? 0) / days))} / jour`}
            />
            <KpiCard
              label="Tâches accomplies" accent={TEAL} color={TEAL}
              value={loading ? '…' : `${data?.tasksDone ?? 0} / ${data?.tasksTotal ?? 0}`}
              progress={data?.tasksTotal ? data.tasksDone / data.tasksTotal : 0}
            />
            <KpiCard
              label="Courses" accent="var(--accent-rapports)" color="var(--accent-rapports)"
              value={loading ? '…' : `${data?.totalRuns ?? 0} sorties`}
              sub={loading ? '' : `${(data?.totalKm ?? 0).toFixed(1)} km parcourus`}
            />
            <KpiCard
              label="Solde financier" accent={balance >= 0 ? TEAL : ORANGE} color={balance >= 0 ? TEAL : ORANGE}
              value={loading ? '…' : fmtEur(balance)}
              sub={loading ? '' : `Revenus ${fmtEur(data?.totalIncome ?? 0)}`}
            />
          </KpiGrid>
        </div>

        {/* ── R3 C1-2 : Aperçu activité ────────────────────────────────── */}
        <SectionCard
          title="Aperçu de l'activité" num="02" accent="var(--accent-rapports)"
          titleColor="var(--ink-light)"
          bg="var(--azul)"
          action={
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(var(--text-rgb),0.7)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: TEAL, display: 'inline-block' }} /> Temps
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(var(--text-rgb),0.7)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: ORANGE, display: 'inline-block' }} /> Tâches
              </span>
            </div>
          }
          style={{ gridColumn: '1/3', gridRow: '3/4', display: 'flex', flexDirection: 'column', '--text-rgb': '255, 255, 255', '--text': '#ffffff', '--text-muted': 'rgba(255, 255, 255, 0.72)' } as React.CSSProperties}
        >
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading
              ? <p style={{ color: 'rgba(var(--text-rgb),0.4)', fontSize: 12 }}>Chargement…</p>
              : <ActivityChart data={chartData} />
            }
          </div>
          <FooterLink label="Voir l'analyse détaillée" onClick={() => setPanel('activite')} />
        </SectionCard>

        {/* ── R3 C3-4 : Répartition du temps ──────────────────────────── */}
        <SectionCard
          title="Répartition du temps" num="03" accent="var(--accent-rapports)" titleColor={TEAL}
          style={{ gridColumn: '3/5', gridRow: '3/4', display: 'flex', flexDirection: 'column' }}
        >
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
                    <div style={{ height: 3, borderRadius: 99, background: 'rgba(var(--text-rgb),0.1)', overflow: 'hidden' }}>
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
        </SectionCard>

        {/* ── R4 C1 : Time Trackers ────────────────────────────────────── */}
        <SectionCard
          title="Time Trackers" num="04" accent="var(--accent-rapports)" titleColor={TEAL}
          style={{ gridColumn: '1/3', gridRow: '4/5', display: 'flex', flexDirection: 'column' }}
        >
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
        </SectionCard>


        {/* ── R4 C3 : Tâches & Activité ───────────────────────────────── */}
        <SectionCard
          title="Tâches & Activité" num="06" accent="var(--accent-rapports)" titleColor="var(--accent-rapports)"
          style={{ gridColumn: '3/5', gridRow: '4/5', display: 'flex', flexDirection: 'column' }}
        >
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
        </SectionCard>



        {/* ── R5 C2-3 : Progression globale ───────────────────────────── */}
        <SectionCard
          title="Progression globale" num="09" accent="var(--accent-rapports)" titleColor={TEAL}
          action={
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: TEAL, display: 'inline-block' }} /> Revenus
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: ORANGE, display: 'inline-block' }} /> Dépenses
              </span>
            </div>
          }
          style={{ gridColumn: '1/3', gridRow: '5/6', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <ProgressionChart months={multiMonth} />
          </div>
          <FooterLink label="Voir les tendances" onClick={() => setPanel('progression')} />
        </SectionCard>

        {/* ── R5 C4 : Réalisations ────────────────────────────────────── */}
        <SectionCard
          title="Réalisations" num="10" accent="var(--accent-rapports)" titleColor={ORANGE}
          style={{ gridColumn: '3/5', gridRow: '5/6', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {realisations.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Star size={24} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Continuez sur cette lancée !</p>
              </div>
            )}
            {realisations.slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${r.color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color, flexShrink: 0 }}>
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
        </SectionCard>


      </div>
    </div>
  )
}
