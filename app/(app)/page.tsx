'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Sparkles } from 'lucide-react'
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

  return (
    <div className="bento-grid md:grid md:grid-cols-4 gap-2.5 p-4 md:p-6 min-h-full">

      {/* ═══════════════════════════════════════════════════════════ ROW 1 */}

      {/* Hero — col-span-2 */}
      <div className="col-span-2 flex flex-col justify-between p-4 md:p-6">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: 'var(--accent-budget)' }}>
            {greeting}
          </p>
          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            FOCUS.<br />PLAN.<br />PROGRESS.
          </h1>
        </div>
        <p className="text-xs font-medium mt-3" style={{ color: 'var(--accent-time)' }}>
          {todayCapitalized}
        </p>
      </div>

      {/* Agent IA — col-span-2, orange */}
      <div className="col-span-2 flex flex-col justify-between p-5 md:p-6 rounded-lg md:rounded-xl" style={{ background: 'var(--accent-budget)' }}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: 'var(--creamy-ivory)' }} />
            <p className="font-display text-xs font-black tracking-widest uppercase" style={{ color: 'var(--creamy-ivory)' }}>
              Agent IA
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--creamy-ivory)', opacity: 0.9 }}>
            Bonjour !<br />
            {totalTasks > 0
              ? `Tu as ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} aujourd'hui.`
              : "Ta journée est libre."}<br />
            Veux-tu que je t'aide à planifier ?
          </p>
        </div>
        <Link href="/agent" className="flex items-center justify-between px-4 py-2.5 rounded-md mt-4 transition-opacity hover:opacity-80" style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--creamy-ivory)' }}>
          <span className="font-display text-xs font-semibold">Discuter</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════ ROW 2 — 4 nav cards */}

      {/* Calendrier — accent rosewood → texte clair */}
      <NavCard href="/calendrier" bg="var(--accent-calendar)" logoColor="var(--creamy-ivory)" label="CALENDRIER" value={loading ? '…' : `${data?.todayEvents.length ?? 0} événement${(data?.todayEvents.length ?? 0) !== 1 ? 's' : ''}`} sub="aujourd'hui" textColor="var(--creamy-ivory)" />

      {/* Time Trackers — fond teal foncé → texte clair */}
      <NavCard href="/time-tracker" bg="var(--accent-time)" logoColor="var(--creamy-ivory)" label="TIME TRACKERS" value={loading ? '…' : fmtSeconds(data?.todaySeconds ?? 0)} sub="aujourd'hui" textColor="var(--creamy-ivory)" />

      {/* Projets — fond teal foncé → texte clair */}
      <NavCard href="/projets" bg="var(--accent-time)" logoColor="var(--creamy-ivory)" label="PROJETS" value={loading ? '…' : `${data?.activeProjects.length ?? 0} actif${(data?.activeProjects.length ?? 0) !== 1 ? 's' : ''}`} sub="en cours" textColor="var(--creamy-ivory)" />

      {/* To Do List — fond orange → texte clair */}
      <NavCard href="/todo" bg="var(--accent-budget)" logoColor="var(--creamy-ivory)" label="TO DO LIST" value={loading ? '…' : `${totalTasks} tâche${totalTasks !== 1 ? 's' : ''}`} sub={`${doneTasks} terminée${doneTasks !== 1 ? 's' : ''}`} textColor="var(--creamy-ivory)" />

      {/* ═══════════════════════════════════════════════════════════ CONTENT — Simplified for brevity */}
      {/* TODO: Implement remaining cards with same refactoring pattern */}

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavCard({ href, bg, logoColor, label, value, sub, textColor }: { href: string; bg: string; logoColor: string; label: string; value: string; sub: string; textColor: string }) {
  return (
    <Link href={href} className="flex flex-col justify-between p-5 rounded-lg md:rounded-xl transition-opacity hover:opacity-80" style={{ background: bg, minHeight: 260, border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <NysaLogo size={56} color={logoColor} />
        <ArrowRight size={16} style={{ color: textColor, opacity: 0.5 }} />
      </div>
      <div>
        <p className="font-display text-xs font-black tracking-widest uppercase mb-1" style={{ color: textColor }}>
          {label}
        </p>
        <p className="font-display font-black text-2xl leading-none" style={{ color: textColor }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: textColor, opacity: 0.6 }}>{sub}</p>
      </div>
    </Link>
  )
}
