'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckSquare, Wallet, Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { useRapports, RapportPeriod } from '@/hooks/useRapports'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function addPeriod(ref: Date, period: RapportPeriod, n: number): Date {
  const d = new Date(ref)
  if (period === 'week') d.setDate(d.getDate() + n * 7)
  else d.setMonth(d.getMonth() + n)
  return d
}

function periodLabel(ref: Date, period: RapportPeriod): string {
  if (period === 'week') {
    const day  = ref.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon  = new Date(ref); mon.setDate(ref.getDate() + diff)
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6)
    return `${mon.getDate()} ${MONTH_NAMES[mon.getMonth()]} — ${sun.getDate()} ${MONTH_NAMES[sun.getMonth()]} ${sun.getFullYear()}`
  }
  return `${MONTH_NAMES[ref.getMonth()]} ${ref.getFullYear()}`
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function TimeTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-2.5 py-2 rounded-[8px] text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-semibold mt-0.5" style={{ color: 'var(--wheat)' }}>{fmtHours(payload[0].value)}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RapportsPage() {
  const [period, setPeriod] = useState<RapportPeriod>('week')
  const [ref, setRef]       = useState(new Date())

  const { data, loading, range } = useRapports(period, ref)

  function prev() { setRef(r => addPeriod(r, period, -1)) }
  function next() { setRef(r => addPeriod(r, period, +1)) }
  function goNow() { setRef(new Date()) }

  const billablePct = data && data.totalSeconds > 0
    ? Math.round((data.billableSeconds / data.totalSeconds) * 100)
    : 0

  const taskPct = data && data.tasksTotal > 0
    ? Math.round((data.tasksDone / data.tasksTotal) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <PageHeader title="Rapports" sub="KPIs globaux · Activité · Facturation" />

      {/* Period nav */}
      <div className="flex items-center gap-3">
        {/* Toggle semaine/mois */}
        <div className="flex rounded-[8px] overflow-hidden p-0.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {(['week', 'month'] as const).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setRef(new Date()) }}
              className="px-3 py-1.5 text-xs font-medium rounded-[6px] transition-all"
              style={{ background: period === p ? 'var(--bg)' : 'transparent', color: period === p ? 'var(--wheat)' : 'var(--text-muted)' }}>
              {p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>

        <button onClick={prev} className="p-1.5 rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronLeft size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--wheat)' }}>{periodLabel(ref, period)}</span>
        <button onClick={next} className="p-1.5 rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button onClick={goNow} className="px-3 py-1 text-xs rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Aujourd'hui
        </button>

        {loading && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Chargement…</span>}
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} style={{ color: '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Temps total</span>
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--wheat)' }}>{data ? fmtHours(data.totalSeconds) : '—'}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {data ? `${fmtHours(data.billableSeconds)} facturable (${billablePct}%)` : ''}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={13} style={{ color: '#0E9594' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Tâches</span>
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--wheat)' }}>
            {data ? `${data.tasksDone}/${data.tasksTotal}` : '—'}
          </p>
          {data && data.tasksLate > 0 && (
            <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#F2542D' }}>
              <AlertTriangle size={10} /> {data.tasksLate} en retard
            </p>
          )}
          {data && data.tasksLate === 0 && data.tasksTotal > 0 && (
            <p className="text-[10px] mt-1" style={{ color: '#0E9594' }}>{taskPct}% complété</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={13} style={{ color: '#F5DFBB' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Solde</span>
          </div>
          {data ? (
            <>
              <p className="text-2xl font-black" style={{ color: (data.totalIncome - data.totalExpense) >= 0 ? '#0E9594' : '#F2542D' }}>
                {(data.totalIncome - data.totalExpense) >= 0 ? '+' : ''}{fmtEur(data.totalIncome - data.totalExpense)}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: '#0E9594' }}>+{fmtEur(data.totalIncome)}</span>
                {' / '}
                <span style={{ color: '#F2542D' }}>-{fmtEur(data.totalExpense)}</span>
              </p>
            </>
          ) : <p className="text-2xl font-black" style={{ color: 'var(--wheat)' }}>—</p>}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} style={{ color: '#11686A' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Running</span>
          </div>
          <p className="text-2xl font-black" style={{ color: 'var(--wheat)' }}>
            {data ? `${data.totalKm.toFixed(1)} km` : '—'}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {data ? `${data.totalRuns} sortie${data.totalRuns !== 1 ? 's' : ''}${data.latestWeight ? ` · ${data.latestWeight} kg` : ''}` : ''}
          </p>
        </Card>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-[1fr_300px] gap-5">

        {/* Daily time chart */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Temps par jour</p>
          {data && data.dailyStats.some(d => d.seconds > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.dailyStats} barSize={period === 'week' ? 28 : 10}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<TimeTooltip />} cursor={{ fill: 'var(--bg)', opacity: 0.5 }} />
                <Bar dataKey="seconds" radius={[4, 4, 0, 0]} name="Temps">
                  {data.dailyStats.map((d, i) => (
                    <Cell key={i} fill={d.seconds > 0 ? '#F2542D' : 'var(--border)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40" style={{ color: 'var(--text-muted)' }}>
              <p className="text-xs">Aucune entrée de temps sur cette période.</p>
            </div>
          )}
        </Card>

        {/* Projects breakdown */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Temps par projet</p>
          {data && data.projectStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={data.projectStats}
                    dataKey="total_seconds"
                    nameKey="project_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {data.projectStats.map((p, i) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtHours(v)}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {data.projectStats.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--wheat)' }}>{p.project_name}</span>
                    <span className="text-[10px] font-semibold" style={{ color: p.color }}>{fmtHours(p.total_seconds)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
              <p className="text-xs">Aucun projet loggué.</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Budget + Tasks row ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Budget bar */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Budget</p>
          {data && (data.totalIncome > 0 || data.totalExpense > 0) ? (
            <>
              <div className="flex items-end gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={11} style={{ color: '#0E9594' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Revenus</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#0E9594' }}>{fmtEur(data.totalIncome)}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown size={11} style={{ color: '#F2542D' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dépenses</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#F2542D' }}>{fmtEur(data.totalExpense)}</p>
                </div>
              </div>
              {/* Visual ratio bar */}
              {data.totalIncome > 0 && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F2542D' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.totalIncome / (data.totalIncome + data.totalExpense)) * 100)}%`, background: '#0E9594' }} />
                </div>
              )}
              <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Taux d'épargne : {data.totalIncome > 0 ? `${Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)}%` : '—'}
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune transaction sur cette période.</p>
          )}
        </Card>

        {/* Tasks breakdown */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Avancement des tâches</p>
          {data && data.tasksTotal > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={taskPct === 100 ? '#0E9594' : '#F2542D'}
                      strokeWidth="2.5"
                      strokeDasharray={`${taskPct} ${100 - taskPct}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black" style={{ color: 'var(--wheat)' }}>{taskPct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#0E9594' }} />
                    <span className="text-xs" style={{ color: 'var(--wheat)' }}>{data.tasksDone} terminée{data.tasksDone !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.tasksTotal - data.tasksDone} restante{data.tasksTotal - data.tasksDone !== 1 ? 's' : ''}</span>
                  </div>
                  {data.tasksLate > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={10} style={{ color: '#F2542D' }} />
                      <span className="text-xs" style={{ color: '#F2542D' }}>{data.tasksLate} en retard</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Daily tasks done bar */}
              {data.dailyStats.some(d => d.tasks_done > 0) && (
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={data.dailyStats} barSize={period === 'week' ? 22 : 6}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Bar dataKey="tasks_done" radius={[3,3,0,0]} fill="#0E9594" name="Tâches" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune tâche créée sur cette période.</p>
          )}
        </Card>
      </div>

      {/* ── Footer note ── */}
      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--text-muted)' }}>
        Données du {range.start} au {range.end} · NYSA Life OS
      </p>
    </div>
  )
}
