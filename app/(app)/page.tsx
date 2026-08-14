'use client'

import Link from 'next/link'
import {
  ArrowRight, Clock, Calendar, CheckSquare, Wallet, FolderKanban, Activity,
} from '@/components/ui/icons'
import { useDashboard } from '@/hooks/useDashboard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSeconds(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}min`
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  if (h >= 18 && h < 22) return 'Bonsoir'
  return 'Bonne nuit'
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'var(--danger)',
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--text-subtle)',
}

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, loading } = useDashboard()

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  const balance    = data ? data.monthIncome - data.monthExpense : 0
  const tasks      = data?.todayTasks ?? []
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const openTasks  = tasks.filter(t => t.status !== 'done')
  const events     = data?.todayEvents ?? []
  const projects   = data?.activeProjects ?? []

  // Échéances : on distingue les dépassées (à signaler) de la prochaine à venir.
  const todayISO = new Date().toISOString().slice(0, 10)
  const dated    = projects.filter(p => p.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
  const overdue  = dated.filter(p => p.deadline! < todayISO)
  const upcoming = dated.find(p => p.deadline! >= todayISO)
  const hasProgress = projects.some(p => p.progress > 0)
  const deadlineLabel = overdue.length > 0
    ? `${overdue.length} échéance${overdue.length > 1 ? 's' : ''} dépassée${overdue.length > 1 ? 's' : ''}`
    : upcoming
      ? `Échéance : ${new Date(upcoming.deadline!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      : 'aucune échéance'

  return (
    <div className="page-wrap" style={{ gap: 16 }}>

      {/* ── En-tête : salutation géante + alertes stickers ────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase" style={{ ...DF, color: 'var(--accent-brand)', letterSpacing: '0.14em' }}>
            {todayCapitalized}
          </p>
          <h1 className="font-display font-extrabold" style={{ fontSize: 'clamp(34px, 5.5vw, 56px)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span className="text-outline">{getGreeting()}</span> 👋
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (data?.lateTasks ?? 0) > 0 && (
            <span className="sticker-l nb-tile px-3 py-1.5 text-xs font-extrabold uppercase" style={{ ...DF, background: 'var(--danger)', color: 'var(--ink-light)', letterSpacing: '0.06em' }}>
              {data!.lateTasks} en retard
            </span>
          )}
          {!loading && (data?.urgentTasks ?? 0) > 0 && (
            <span className="sticker-r nb-tile px-3 py-1.5 text-xs font-extrabold uppercase" style={{ ...DF, background: 'var(--warning)', color: 'var(--ink-dark)', letterSpacing: '0.06em' }}>
              {data!.urgentTasks} urgente{data!.urgentTasks > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* ── Bande défilante : le pouls de la journée ──────────────────── */}
      {!loading && (() => {
        const items = [
          `${tasks.length - doneTasks} tâche${tasks.length - doneTasks > 1 ? 's' : ''} à faire`,
          `${events.length} événement${events.length > 1 ? 's' : ''}`,
          `${fmtSeconds(data?.todaySeconds ?? 0)} tracké aujourd'hui`,
          `solde ${fmtEur(balance)}`,
          `${projects.length} projet${projects.length > 1 ? 's' : ''} en cours`,
        ]
        // Chaque piste contient 3× les items : elle dépasse toujours la
        // largeur de l'écran, la boucle est continue sans trou.
        const track = [...items, ...items, ...items]
        return (
          <div className="marquee nb-tile" style={{ background: 'var(--accent-brand)', padding: '7px 0' }}>
            {[0, 1].map(i => (
              <div key={i} className="marquee-track" aria-hidden={i === 1}>
                {track.map((txt, j) => (
                  <span key={j} className="flex items-center gap-10">
                    <span className="text-xs font-extrabold uppercase" style={{ ...DF, color: 'var(--ink-dark)', letterSpacing: '0.08em' }}>{txt}</span>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--ink-dark)', transform: 'rotate(45deg)', flexShrink: 0 }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── KPI compacts : l'essentiel en un scan ─────────────────────── */}
      <div className="kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Clock}       label="Temps aujourd'hui" value={loading ? '…' : fmtSeconds(data?.todaySeconds ?? 0)} sub={loading ? '' : `${fmtSeconds(data?.weekSeconds ?? 0)} cette semaine`} accent="var(--accent-time)" href="/time-tracker" iconInk="var(--ink-light)" />
        <Kpi icon={CheckSquare} label="Tâches du jour"    value={loading ? '…' : `${doneTasks}/${tasks.length}`}       sub={loading ? '' : tasks.length === 0 ? 'journée libre' : `${tasks.length - doneTasks} restante${tasks.length - doneTasks > 1 ? 's' : ''}`} accent="var(--accent-todo)" href="/todo"
             progress={tasks.length > 0 ? doneTasks / tasks.length : undefined} />
        <Kpi icon={FolderKanban} label="Projets actifs"   value={loading ? '…' : String(projects.length)}              sub={loading ? '' : deadlineLabel} accent="var(--accent-projets)" href="/projets" iconInk="var(--ink-light)"
             subColor={overdue.length > 0 ? 'var(--danger)' : undefined} />
        <Kpi icon={Wallet}      label="Solde du mois"     value={loading ? '…' : fmtEur(balance)}                      sub={loading ? '' : `${fmtEur(data?.monthIncome ?? 0)} in · ${fmtEur(data?.monthExpense ?? 0)} out`} accent="var(--accent-budget)" href="/budget"
             valueColor={balance < 0 ? 'var(--danger)' : undefined} />
      </div>

      {/* ── Aujourd'hui : tâches + agenda côte à côte ─────────────────── */}
      <div className="bento-grid md:grid md:grid-cols-2 gap-4">

        {/* Tâches */}
        <section className="nb-card p-5 flex flex-col" style={{ minHeight: 220 }}>
          <SectionHead num="01" icon={CheckSquare} title="À faire aujourd'hui" accent="var(--accent-todo)" href="/todo" />
          {loading ? <Placeholder /> : openTasks.length === 0 ? (
            <Empty text={tasks.length > 0 ? 'Tout est fait. Bien joué ✔' : "Rien de prévu aujourd'hui."} />
          ) : (
            <ul className="flex flex-col gap-1 mt-3">
              {openTasks.slice(0, 6).map(t => (
                <li key={t.id} className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: PRIORITY_COLOR[t.priority] ?? 'var(--text-subtle)' }} />
                  <span className="text-sm font-medium truncate" style={{ flex: 1 }}>{t.title}</span>
                  {t.due_time && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.due_time.slice(0, 5)}</span>}
                  {t.project_name && (
                    <span className="text-xs px-2 py-0.5 rounded-[6px] font-semibold" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.project_name}
                    </span>
                  )}
                </li>
              ))}
              {openTasks.length > 6 && (
                <li className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>+ {openTasks.length - 6} autres…</li>
              )}
            </ul>
          )}
        </section>

        {/* Agenda */}
        <section className="nb-card p-5 flex flex-col" style={{ minHeight: 220 }}>
          <SectionHead num="02" icon={Calendar} title="Agenda du jour" accent="var(--accent-calendar)" href="/calendrier" />
          {loading ? <Placeholder /> : events.length === 0 ? (
            <Empty text="Aucun événement aujourd'hui." />
          ) : (
            <ul className="flex flex-col gap-1 mt-3">
              {events.slice(0, 6).map(e => (
                <li key={e.id} className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-bold" style={{ ...DF, color: 'var(--azul)', width: 76, flexShrink: 0 }}>
                    {fmtTime(e.start_at)}–{fmtTime(e.end_at)}
                  </span>
                  <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: e.color ?? 'var(--accent-calendar)', flexShrink: 0 }} />
                  <span className="text-sm font-medium truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Projets en cours (progression) ────────────────────────────── */}
      {!loading && projects.length > 0 && (
        <section className="nb-card p-5">
          <SectionHead num="03" icon={FolderKanban} title="Projets en cours" accent="var(--accent-projets)" href="/projets" iconInk="var(--ink-light)" />
          {/* Si aucune progression n'est renseignée, une colonne de barres
              vides n'apprend rien : on affiche l'échéance à la place. */}
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 mt-3">
            {projects.slice(0, 6).map(p => {
              const late = p.deadline && p.deadline < todayISO
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: p.color || 'var(--accent-projets)' }} />
                  <span className="text-sm font-semibold truncate" style={{ flex: 1 }}>{p.name}</span>
                  {hasProgress ? (
                    <>
                      <div style={{ width: 120, height: 8, borderRadius: 99, background: 'var(--bg-input)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, p.progress))}%`, height: '100%', background: p.color || 'var(--accent-projets)' }} />
                      </div>
                      <span className="text-xs font-bold" style={{ ...DF, width: 34, textAlign: 'right', color: 'var(--text-muted)' }}>{Math.round(p.progress)}%</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: late ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {p.deadline
                        ? `${late ? 'En retard · ' : ''}${new Date(p.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                        : 'sans échéance'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Signal santé/sport discret ────────────────────────────────── */}
      {!loading && data?.lastRun && (
        <Link href="/sport" className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Activity size={13} style={{ color: 'var(--accent-sport)' }} />
          Dernière sortie : {data.lastRun.distance_km.toFixed(1)} km
          {data.lastRun.duration_seconds ? ` · ${fmtSeconds(data.lastRun.duration_seconds)}` : ''}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ num, icon: Icon, title, accent, href, iconInk = 'var(--ink-dark)' }: { num: string; icon: typeof Clock; title: string; accent: string; href: string; iconInk?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="font-display font-extrabold text-outline" style={{ fontSize: 24, lineHeight: 1, WebkitTextStrokeWidth: '1.5px' }}>
          {num}
        </span>
        <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 6, background: accent, border: '1.5px solid var(--ink)' }}>
          <Icon size={12} style={{ color: iconInk }} />
        </span>
        <h2 className="font-display text-xs font-extrabold uppercase" style={{ letterSpacing: '0.1em' }}>{title}</h2>
      </div>
      <Link href={href} className="flex items-center gap-1 text-xs font-bold" style={{ ...DF, color: 'var(--text-muted)' }}>
        Ouvrir <ArrowRight size={12} />
      </Link>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent, href, progress, valueColor, iconInk = 'var(--ink-dark)', subColor }: {
  icon: typeof Clock; label: string; value: string; sub: string; accent: string; href: string;
  progress?: number; valueColor?: string; iconInk?: string; subColor?: string
}) {
  return (
    <Link href={href} className="nb-card nb-press p-4 flex flex-col gap-1.5" style={{ minHeight: 104 }}>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: 7, background: accent, border: '1.5px solid var(--ink)' }}>
          <Icon size={13} style={{ color: iconInk }} />
        </span>
        <span className="text-[10px] font-bold uppercase" style={{ ...DF, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span className="font-display font-extrabold" style={{ fontSize: 26, lineHeight: 1, color: valueColor ?? 'var(--text)' }}>{value}</span>
      {progress !== undefined ? (
        <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-input)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: accent }} />
        </div>
      ) : (
        <span className="text-xs font-semibold" style={{ color: subColor ?? 'var(--text-muted)' }}>{sub}</span>
      )}
    </Link>
  )
}

function Placeholder() {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {[0, 1, 2].map(i => (
        <div key={i} style={{ height: 14, borderRadius: 6, background: 'var(--bg-input)', width: `${80 - i * 15}%` }} />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>{text}</p>
  )
}
