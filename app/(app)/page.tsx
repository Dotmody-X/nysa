'use client'

import Link from 'next/link'
import {
  Calendar, Timer, FolderKanban, CheckSquare,
  Heart, Wallet, TrendingUp, Clock, ArrowRight,
  AlertTriangle, Activity, Check,
} from 'lucide-react'
import { Card }         from '@/components/ui/Card'
import { Badge }        from '@/components/ui/Badge'
import { StatCard }     from '@/components/ui/StatCard'
import { useDashboard } from '@/hooks/useDashboard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSeconds(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}`
  return `${m}min`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#F2542D', high: '#F5DFBB', medium: '#0E9594', low: '#888',
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, loading } = useDashboard()

  const todayLabel = new Date().toLocaleDateString('fr-BE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const hasAlert = data && (data.lateTasks > 0 || data.urgentTasks > 0)
  const balance  = data ? data.monthIncome - data.monthExpense : 0

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none nysa-gradient-text">
            Focus.<br />Plan.<br />Progress.
          </h1>
          <p className="text-xs mt-3 capitalize" style={{ color: 'var(--text-muted)' }}>{todayLabel}</p>
        </div>

        {/* Alert card — tâches urgentes / en retard */}
        {!loading && hasAlert ? (
          <Card className="max-w-[240px] text-xs" style={{ background: 'rgba(242,84,45,0.08)', borderColor: 'rgba(242,84,45,0.25)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={12} style={{ color: '#F2542D' }} />
              <p className="font-semibold" style={{ color: '#F2542D' }}>Attention requise</p>
            </div>
            {data!.lateTasks > 0 && (
              <p style={{ color: 'var(--text-muted)' }}>{data!.lateTasks} tâche{data!.lateTasks > 1 ? 's' : ''} en retard aujourd'hui.</p>
            )}
            {data!.urgentTasks > 0 && (
              <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{data!.urgentTasks} tâche{data!.urgentTasks > 1 ? 's urgentes' : ' urgente'}.</p>
            )}
            <Link href="/todo" className="mt-2 flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#F2542D' }}>
              Voir les tâches <ArrowRight size={10} />
            </Link>
          </Card>
        ) : !loading && data?.todayTasks.length === 0 ? (
          <Card className="max-w-[240px] text-xs" style={{ background: 'rgba(14,149,148,0.06)', borderColor: 'rgba(14,149,148,0.2)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Check size={12} style={{ color: '#0E9594' }} />
              <p className="font-semibold" style={{ color: '#0E9594' }}>Agenda libre</p>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Aucune tâche prévue aujourd'hui.</p>
          </Card>
        ) : null}
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Calendrier"
          value={loading ? '…' : String(data?.todayEvents.length ?? 0)}
          unit={data?.todayEvents.length === 1 ? 'évt' : 'évts'}
          sub="Aujourd'hui"
          icon={<Calendar size={16} />}
          accent="cyan"
        />
        <StatCard
          label="Time Tracker"
          value={loading ? '…' : (data?.todaySeconds ? fmtSeconds(data.todaySeconds) : '0min')}
          sub={loading ? '' : `${fmtSeconds(data?.weekSeconds ?? 0)} cette semaine`}
          icon={<Timer size={16} />}
          accent="fiery"
        />
        <StatCard
          label="Projets"
          value={loading ? '…' : String(data?.activeProjects.length ?? 0)}
          unit="actifs"
          sub={
            !loading && data?.activeProjects.some(p => p.deadline)
              ? `Deadline : ${new Date(data!.activeProjects.find(p => p.deadline)!.deadline! + 'T12:00:00').toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}`
              : 'En cours'
          }
          icon={<FolderKanban size={16} />}
          accent="teal"
        />
        <StatCard
          label="To-Do"
          value={loading ? '…' : String(data?.todayTasks.length ?? 0)}
          unit="tâches"
          sub={
            !loading
              ? `${data?.todayTasks.filter(t => t.status === 'done').length ?? 0} terminée${(data?.todayTasks.filter(t => t.status === 'done').length ?? 0) > 1 ? 's' : ''}`
              : ''
          }
          icon={<CheckSquare size={16} />}
          accent="wheat"
        />
      </div>

      {/* ── ROW 2 : TÂCHES DU JOUR + TIME ENTRIES ───────────────────── */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4">

        {/* Tâches du jour */}
        <Card padding="none">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Aujourd'hui</p>
            <Link href="/todo" className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Voir tout →</Link>
          </div>

          {loading ? (
            <p className="text-xs p-4" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
          ) : data?.todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckSquare size={24} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune tâche prévue aujourd'hui</p>
              <Link href="/todo" className="text-[10px] mt-1" style={{ color: '#F2542D' }}>+ Ajouter une tâche</Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
              {data!.todayTasks.slice(0, 6).map(t => {
                const done  = t.status === 'done'
                const color = t.project_color ?? PRIORITY_COLOR[t.priority] ?? '#888'
                return (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="text-[10px] w-10 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t.due_time ? t.due_time.slice(0,5) : '—'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: done ? '#0E9594' : color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug" style={{ color: done ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: done ? 'line-through' : 'none' }}>
                        {t.title}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {t.project_name ?? 'Sans projet'}
                        {t.estimated_minutes ? ` · ${t.estimated_minutes}min` : ''}
                      </p>
                    </div>
                    {t.priority === 'urgent' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(242,84,45,0.15)', color: '#F2542D' }}>urgent</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Time Tracker du jour */}
        <Card padding="none">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              Time Tracker — Aujourd'hui
            </p>
            <Link href="/time-tracker" className="text-[10px] flex items-center gap-1" style={{ color: '#0E9594' }}>
              <Clock size={10} /> Ouvrir
            </Link>
          </div>

          {/* Totaux */}
          <div className="flex items-end gap-6 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Aujourd'hui</p>
              <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>
                {loading ? '…' : (data?.todaySeconds ? fmtSeconds(data.todaySeconds) : '0min')}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cette semaine</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
                {loading ? '…' : fmtSeconds(data?.weekSeconds ?? 0)}
              </p>
            </div>
          </div>

          {/* Entrées */}
          {loading ? (
            <p className="text-xs p-4" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
          ) : data?.todayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Timer size={22} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune entrée aujourd'hui</p>
              <Link href="/time-tracker" className="text-[10px]" style={{ color: '#F2542D' }}>Démarrer un timer →</Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              {data!.todayEntries.slice(0, 5).map(e => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.project_color ?? '#F5DFBB' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--wheat)' }}>{e.description || 'Sans description'}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {e.project_name ?? 'Sans projet'} · {fmtTime(e.started_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.is_billable && <Badge variant="cyan" className="text-[9px]">Fact.</Badge>}
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {e.duration_seconds ? fmtSeconds(e.duration_seconds) : '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── ROW 3 : HEALTH + BUDGET + RÉSUMÉ ────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Health */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart size={14} style={{ color: '#F2542D' }} />
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Health</p>
            </div>
            <Link href="/health"><ArrowRight size={12} style={{ color: 'var(--text-muted)' }} /></Link>
          </div>
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>…</p>
          ) : data?.latestWeight ? (
            <>
              <p className="text-2xl font-bold" style={{ color: 'var(--wheat)' }}>
                {data.latestWeight} <span className="text-sm font-normal">kg</span>
              </p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                {data.lastRun ? (
                  <div className="flex items-center gap-1.5">
                    <Activity size={10} style={{ color: '#0E9594' }} />
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {data.lastRun.distance_km} km
                      {data.lastRun.duration_seconds ? ` · ${fmtSeconds(data.lastRun.duration_seconds)}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Aucun run enregistré</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune donnée</p>
          )}
        </Card>

        {/* Budget */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={14} style={{ color: '#0E9594' }} />
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Budget</p>
            </div>
            <Link href="/budget"><ArrowRight size={12} style={{ color: 'var(--text-muted)' }} /></Link>
          </div>
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>…</p>
          ) : (
            <>
              <p className="text-2xl font-bold" style={{ color: balance >= 0 ? '#0E9594' : '#F2542D' }}>
                {balance >= 0 ? '+' : ''}{fmtEur(balance)}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Solde ce mois</p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-[10px]" style={{ color: '#0E9594' }}>+{fmtEur(data!.monthIncome)} revenus</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#F2542D' }}>-{fmtEur(data!.monthExpense)} dépenses</p>
              </div>
            </>
          )}
        </Card>

        {/* Résumé global */}
        <Card className="col-span-2" style={{ background: 'rgba(14,149,148,0.06)', borderColor: 'rgba(14,149,148,0.2)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: '#0E9594' }} />
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#0E9594' }}>Cette semaine</p>
            </div>
            <Link href="/rapports" className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#0E9594' }}>
              Rapport complet <ArrowRight size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-black" style={{ color: 'var(--wheat)' }}>
                {loading ? '…' : fmtSeconds(data?.weekSeconds ?? 0)}
              </p>
              <p className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Temps logué</p>
            </div>
            <div>
              <p className="text-xl font-black" style={{ color: 'var(--wheat)' }}>
                {loading ? '…' : String(data?.todayTasks.filter(t => t.status === 'done').length ?? 0)}
              </p>
              <p className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tâches faites</p>
            </div>
            <div>
              <p className="text-xl font-black" style={{ color: 'var(--wheat)' }}>
                {loading ? '…' : String(data?.todayEvents.length ?? 0)}
              </p>
              <p className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Événements</p>
            </div>
            <div>
              <p className="text-xl font-black" style={{ color: 'var(--wheat)' }}>
                {loading ? '…' : fmtEur(data?.monthIncome ?? 0)}
              </p>
              <p className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Revenus</p>
            </div>
          </div>

          {/* Active projects quick view */}
          {!loading && (data?.activeProjects.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 flex gap-3 flex-wrap" style={{ borderTop: '1px solid rgba(14,149,148,0.2)' }}>
              {data!.activeProjects.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                  <span className="text-[10px] font-semibold" style={{ color: p.color }}>{p.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
