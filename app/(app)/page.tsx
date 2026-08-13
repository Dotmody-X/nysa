'use client'

import Link from 'next/link'
import {
  ArrowRight, ChevronRight, Clock, Play, CheckSquare, Send,
  Award, Plus, Wallet, Activity, Sparkles, Link2,
} from '@/components/ui/icons'
import { useDashboard } from '@/hooks/useDashboard'
import { useDigests } from '@/hooks/useDigests'
import { useMktPrinciples } from '@/hooks/useMktPrinciples'
import { useFormationMilestones } from '@/hooks/useFormationMilestones'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSeconds(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`
}
function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}
function ago(iso?: string | null) {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}
function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  if (h >= 18 && h < 22) return 'Bonsoir'
  return 'Bonne nuit'
}
const PRIO: Record<string, string> = { urgent: 'var(--danger)', high: 'var(--warning)', medium: 'var(--info)', low: 'var(--text-muted)' }

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
  boxShadow: 'var(--elev-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...extra,
})

// ── Panneau générique ─────────────────────────────────────────────────────────
function Panel({ label, color, href, badge, children, style }: {
  label: string; color: string; href?: string; badge?: React.ReactNode
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <section style={card(style)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{label}</span>
        {badge}
        <div style={{ flex: 1 }} />
        {href && <Link href={href} aria-label={`Ouvrir ${label}`} style={{ display: 'flex', color: 'var(--text-muted)' }}><ChevronRight size={16} /></Link>}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>{children}</div>
    </section>
  )
}

const badgePill = (text: string, color = 'var(--text-muted)'): React.ReactNode => (
  <span style={{ ...DF, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color, background: 'var(--bg-input)' }}>{text}</span>
)

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, loading } = useDashboard()
  const { latestBrief } = useDigests()
  const { doneCount: mktDone } = useMktPrinciples()
  const { doneCount: formDone } = useFormationMilestones()

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1)

  const tasks       = data?.todayTasks ?? []
  const doneTasks   = tasks.filter(t => t.status === 'done').length
  const openTasks   = tasks.filter(t => t.status !== 'done')
  const events      = data?.todayEvents ?? []
  const entries     = data?.todayEntries ?? []
  const running     = entries.find(e => !e.ended_at) ?? null
  const balance     = data ? data.monthIncome - data.monthExpense : 0

  const briefTitle = latestBrief?.payload?.title || 'Brief du jour'
  const briefLine  = latestBrief?.payload?.headline
    || latestBrief?.content?.replace(/^#+\s*/, '').split('\n').find(Boolean)
    || null

  // Capture rapide
  const quick = [
    { href: '/todo',          label: 'Tâche',       Icon: Plus,       color: 'var(--accent-todo)' },
    { href: '/time-tracker',  label: 'Timer',       Icon: Play,       color: 'var(--accent-time)' },
    { href: '/publications',  label: 'Publication', Icon: Send,       color: 'var(--accent-recettes)' },
    { href: '/brief',         label: 'Note',        Icon: Sparkles,   color: 'var(--accent-budget)' },
  ]
  // Lanceur de sections
  const sections = [
    { href: '/calendrier', label: 'Calendrier', color: 'var(--accent-calendar)' },
    { href: '/publications', label: 'Publications', color: 'var(--accent-recettes)' },
    { href: '/directeur-marketing', label: 'Marketing', color: 'var(--accent-rapports)' },
    { href: '/projets', label: 'Projets', color: 'var(--accent-projets)' },
    { href: '/budget', label: 'Budget', color: 'var(--accent-budget)' },
    { href: '/sport', label: 'Running', color: 'var(--accent-sport)' },
    { href: '/health', label: 'Health', color: 'var(--accent-health)' },
    { href: '/rapports', label: 'Rapports', color: 'var(--accent-time)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, padding: 24, alignContent: 'start', minHeight: '100%' }}>

      {/* ── En-tête ── */}
      <header style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{todayCap}</p>
          <h1 style={{ ...DF, fontWeight: 800, fontSize: 'clamp(24px,3.2vw,34px)', color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.05, marginTop: 2 }}>
            {greeting()}<span style={{ color: 'var(--accent-budget)' }}>.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {quick.map(q => (
            <Link key={q.href} href={q.href} className="nb-press"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--elev-1)', color: 'var(--text)', ...DF, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: q.color }} /><q.Icon size={13} /> {q.label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Aujourd'hui (tâches) ── */}
      <div style={{ gridColumn: 'span 5' }}>
        <Panel label="Aujourd'hui" color="var(--accent-todo)" href="/todo"
          badge={badgePill(`${doneTasks}/${tasks.length}`, 'var(--text)')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data && data.urgentTasks > 0 && badgePill(`${data.urgentTasks} urgent${data.urgentTasks > 1 ? 's' : ''}`, 'var(--danger)')}
            {data && data.lateTasks > 0 && badgePill(`${data.lateTasks} en retard`, 'var(--warning)')}
            {!loading && tasks.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Journée libre.</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(loading ? [] : openTasks.slice(0, 5)).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIO[t.priority] ?? 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                {t.project_name && <span style={{ width: 7, height: 7, borderRadius: 2, background: t.project_color ?? 'var(--text-muted)', flexShrink: 0 }} title={t.project_name} />}
                {t.due_time && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{t.due_time.slice(0, 5)}</span>}
              </div>
            ))}
            {loading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</span>}
            {!loading && openTasks.length > 5 && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>+ {openTasks.length - 5} autres</span>}
          </div>
        </Panel>
      </div>

      {/* ── Focus / Temps ── */}
      <div style={{ gridColumn: 'span 4' }}>
        <Panel label="Focus" color="var(--accent-time)" href="/time-tracker"
          badge={badgePill(fmtSeconds(data?.todaySeconds ?? 0), 'var(--text)')}>
          {running ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--accent-sport) 12%, transparent)', border: '1px solid var(--border)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent-sport)', flexShrink: 0, boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-sport) 25%, transparent)' }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{running.description || running.project_name || 'Session'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>En cours depuis {fmtTime(running.started_at)}</p>
              </div>
            </div>
          ) : (
            <Link href="/time-tracker" className="nb-press" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', ...DF, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <Play size={13} /> Démarrer un timer
            </Link>
          )}
          <div style={{ display: 'flex', gap: 18 }}>
            <div><p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', ...DF, fontWeight: 700 }}>Aujourd'hui</p><p style={{ ...DF, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{fmtSeconds(data?.todaySeconds ?? 0)}</p></div>
            <div><p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', ...DF, fontWeight: 700 }}>Cette semaine</p><p style={{ ...DF, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{fmtSeconds(data?.weekSeconds ?? 0)}</p></div>
          </div>
        </Panel>
      </div>

      {/* ── Brief ── */}
      <div style={{ gridColumn: 'span 3' }}>
        <Panel label="Brief" color="var(--accent-time)" href="/brief">
          {latestBrief ? (
            <>
              <p style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{briefTitle}</p>
              {briefLine && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{briefLine}</p>}
              <span style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 'auto' }}>Généré {ago(latestBrief.generated_at)}</span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loading ? 'Chargement…' : 'Aucun brief pour l’instant.'}</span>
          )}
        </Panel>
      </div>

      {/* ── Agenda ── */}
      <div style={{ gridColumn: 'span 4' }}>
        <Panel label="Agenda" color="var(--accent-calendar)" href="/calendrier"
          badge={badgePill(`${events.length}`, 'var(--text)')}>
          {!loading && events.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rien de prévu aujourd'hui.</span>}
          {events.slice(0, 5).map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 40, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtTime(e.start_at)}</span>
              <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: e.color || 'var(--accent-calendar)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
            </div>
          ))}
        </Panel>
      </div>

      {/* ── Automations & progression (interconnecté) ── */}
      <div style={{ gridColumn: 'span 5' }}>
        <Panel label="Automations & progression" color="var(--accent-rapports)" href="/reglages"
          badge={badgePill('auto', 'var(--accent-rapports)')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <AutoTile icon={<Sparkles size={13} />} label="Brief auto" value={latestBrief ? ago(latestBrief.generated_at) : '—'} />
            <AutoTile icon={<Award size={13} />} label="Marketing" value={`${mktDone}/24`} />
            <AutoTile icon={<CheckSquare size={13} />} label="Formation" value={`${formDone}/6`} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
            <Link2 size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connecté à Claude, Notion et aux tâches programmées</span>
            <Link href="/reglages" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-time)', textDecoration: 'none', marginLeft: 'auto', ...DF }}>Gérer →</Link>
          </div>
        </Panel>
      </div>

      {/* ── Vie (secondaire) ── */}
      <div style={{ gridColumn: 'span 3' }}>
        <Panel label="Vie" color="var(--accent-sport)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Wallet size={15} style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>Solde du mois</span>
            <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtEur(balance)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Activity size={15} style={{ color: 'var(--accent-sport)' }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>Dernière course</span>
            <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{data?.lastRun ? `${data.lastRun.distance_km} km` : '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Clock size={15} style={{ color: 'var(--accent-health)' }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>Poids</span>
            <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{data?.latestWeight != null ? `${data.latestWeight} kg` : '—'}</span>
          </div>
        </Panel>
      </div>

      {/* ── Lanceur de sections ── */}
      <nav style={{ gridColumn: 'span 12', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <Link key={s.href} href={s.href} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--elev-1)', color: 'var(--text)', ...DF, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} /> {s.label}
            <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </nav>

    </div>
  )
}

function AutoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-input)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>{icon}
        <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', ...DF }}>{label}</span>
      </div>
      <p style={{ ...DF, fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 5 }}>{value}</p>
    </div>
  )
}
