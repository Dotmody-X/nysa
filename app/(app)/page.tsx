'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Sparkles } from '@/components/ui/icons'
import { NysaLogo } from '@/components/ui/NysaLogo'
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

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  if (h >= 18 && h < 22) return 'Bonsoir'
  return 'Bonne nuit'
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FONT_DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display)' }

export default function DashboardPage() {
  const { data, loading } = useDashboard()

  const greeting  = getGreeting()
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  const balance     = data ? data.monthIncome - data.monthExpense : 0
  const doneTasks   = data?.todayTasks.filter(t => t.status === 'done').length ?? 0
  const totalTasks  = data?.todayTasks.length ?? 0

  const INK = '#18130e'
  const CREAM = '#f6efe0'

  return (
    <div className="bento-grid md:grid md:grid-cols-4 gap-4 p-4 md:p-7 min-h-full">

      {/* ═══════════════════════════════════════════════════════════ ROW 1 */}

      {/* Hero — col-span-2 */}
      <div className="col-span-2 flex flex-col justify-between p-2 md:p-4">
        <div>
          <span className="font-display inline-block text-xs font-extrabold tracking-wider uppercase mb-3 nb-tile" style={{ background: 'var(--accent-budget)', color: INK, padding: '4px 12px' }}>
            {greeting}
          </span>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-7xl leading-[0.95]" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Focus.<br />Plan.<br />Progress.
          </h1>
        </div>
        <p className="text-sm font-semibold mt-4" style={{ color: 'var(--text-muted)' }}>
          {todayCapitalized}
        </p>
      </div>

      {/* Agent IA — col-span-2, tangerine sticker */}
      <div className="nb-tile col-span-2 flex flex-col justify-between p-5 md:p-6" style={{ background: 'var(--accent-budget)' }}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: INK }} />
            <p className="font-display text-sm font-extrabold tracking-wide uppercase" style={{ color: INK }}>
              Agent IA
            </p>
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: INK }}>
            Bonjour !<br />
            {totalTasks > 0
              ? `Tu as ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} aujourd'hui.`
              : "Ta journée est libre."}<br />
            Veux-tu que je t'aide à planifier ?
          </p>
        </div>
        <Link href="/agent" className="nb-tile nb-press flex items-center justify-between px-4 py-2.5 mt-4" style={{ background: INK, color: CREAM }}>
          <span className="font-display text-sm font-bold">Discuter</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════ ROW 2 — 4 nav cards */}

      <NavCard href="/calendrier"   bg="var(--accent-calendar)" label="Calendrier"    value={loading ? '…' : `${data?.todayEvents.length ?? 0} événement${(data?.todayEvents.length ?? 0) !== 1 ? 's' : ''}`} sub="aujourd'hui" ink={INK} />
      <NavCard href="/time-tracker" bg="var(--accent-time)"     label="Time Trackers" value={loading ? '…' : fmtSeconds(data?.todaySeconds ?? 0)} sub="aujourd'hui" ink={CREAM} />
      <NavCard href="/projets"      bg="var(--accent-projets)"  label="Projets"       value={loading ? '…' : `${data?.activeProjects.length ?? 0} actif${(data?.activeProjects.length ?? 0) !== 1 ? 's' : ''}`} sub="en cours" ink={CREAM} />
      <NavCard href="/todo"         bg="var(--accent-todo)"     label="To Do List"    value={loading ? '…' : `${totalTasks} tâche${totalTasks !== 1 ? 's' : ''}`} sub={`${doneTasks} terminée${doneTasks !== 1 ? 's' : ''}`} ink={INK} />

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavCard({ href, bg, label, value, sub, ink }: { href: string; bg: string; label: string; value: string; sub: string; ink: string }) {
  return (
    <Link href={href} className="nb-tile nb-press flex flex-col justify-between p-5" style={{ background: bg, minHeight: 240 }}>
      <div className="flex items-start justify-between">
        <NysaLogo size={52} color={ink} />
        <ArrowRight size={18} style={{ color: ink }} />
      </div>
      <div>
        <p className="font-display text-xs font-extrabold tracking-wide uppercase mb-1" style={{ color: ink, opacity: 0.85 }}>
          {label}
        </p>
        <p className="font-display font-extrabold text-3xl leading-none" style={{ color: ink }}>{value}</p>
        <p className="text-xs font-medium mt-1.5" style={{ color: ink, opacity: 0.7 }}>{sub}</p>
      </div>
    </Link>
  )
}
