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

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD_RADIUS = '12px'

function card(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return { background: bg, borderRadius: CARD_RADIUS, overflow: 'hidden', ...extra }
}

const FONT_DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Page ──────────────────────────────────────────────────────────────────────

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

  // ── Bento grid ────────────────────────────────────────────────────────────

  return (
    <div
      className="bento-grid md:grid md:grid-cols-4"
      style={{ gap: 10, padding: 'clamp(14px,3vw,30px)', minHeight: '100%' }}
    >

      {/* ═══════════════════════════════════════════════════════════ ROW 1 */}

      {/* Hero — col-span-2 */}
      <div
        className="col-span-2 flex flex-col justify-between"
        style={card('transparent', { border: 'none', padding: '10px 0 20px 0', minHeight: 220 })}
      >
        <div>
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8 }}>
            {greeting}
          </p>
          <h1 style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1, color: 'var(--wheat)', letterSpacing: '-0.01em' }}>
            FOCUS.<br />PLAN.<br />PROGRESS.
          </h1>
        </div>
        <p style={{ ...FONT_DISPLAY, fontSize: 12, fontWeight: 500, color: 'var(--dark-cyan)', marginTop: 12 }}>
          {todayCapitalized}
        </p>
      </div>

      {/* Agent IA — col-span-2, orange */}
      <div
        className="col-span-2 flex flex-col justify-between p-6"
        style={card('#F2542D', { minHeight: 220 })}
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: '#1A0A0A' }} />
            <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: '#1A0A0A', textTransform: 'uppercase' }}>
              Agent IA
            </p>
          </div>
          <p style={{ fontSize: 13, color: '#1A0A0A', lineHeight: 1.6, opacity: 0.85 }}>
            Bonjour !<br />
            {totalTasks > 0
              ? `Tu as ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} aujourd'hui.`
              : "Ta journée est libre."}<br />
            Veux-tu que je t'aide à planifier ?
          </p>
        </div>
        <Link
          href="/agent"
          className="flex items-center justify-between px-4 py-2.5 rounded-lg mt-4"
          style={{ background: 'rgba(0,0,0,0.2)', color: '#1A0A0A' }}
        >
          <span style={{ ...FONT_DISPLAY, fontSize: 12, fontWeight: 600 }}>Discuter</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════ ROW 2 — 4 nav cards */}

      {/* Calendrier — cream */}
      <NavCard
        href="/calendrier"
        bg="#F0E4CC"
        logoColor="#F2542D"
        label="CALENDRIER"
        value={loading ? '…' : `${data?.todayEvents.length ?? 0} événement${(data?.todayEvents.length ?? 0) !== 1 ? 's' : ''}`}
        sub="aujourd'hui"
        textColor="#1A0A0A"
      />

      {/* Time Trackers — stormy teal */}
      <NavCard
        href="/time-tracker"
        bg="#11686A"
        logoColor="#F0E4CC"
        label="TIME TRACKERS"
        value={loading ? '…' : fmtSeconds(data?.todaySeconds ?? 0)}
        sub="aujourd'hui"
        textColor="#F0E4CC"
      />

      {/* Projets — dark cyan */}
      <NavCard
        href="/projets"
        bg="#0E9594"
        logoColor="#1A0A0A"
        label="PROJETS"
        value={loading ? '…' : `${data?.activeProjects.length ?? 0} actif${(data?.activeProjects.length ?? 0) !== 1 ? 's' : ''}`}
        sub="en cours"
        textColor="#1A0A0A"
      />

      {/* To Do List — orange */}
      <NavCard
        href="/todo"
        bg="#F2542D"
        logoColor="#1A0A0A"
        label="TO DO LIST"
        value={loading ? '…' : `${totalTasks} tâche${totalTasks !== 1 ? 's' : ''}`}
        sub={`${doneTasks} terminée${doneTasks !== 1 ? 's' : ''}`}
        textColor="#1A0A0A"
      />

      {/* ═══════════════════════════════════════════════════════════ ROW 3 — 2 big cards */}

      {/* Aujourd'hui — dark */}
      <div
        className="col-span-2 flex flex-col"
        style={card('var(--bg-card)', { border: '1px solid var(--border)', minHeight: 460 })}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            Aujourd'hui
          </p>
          <Link href="/todo" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ArrowRight size={10} />
          </Link>
        </div>

        <div className="flex-1 flex flex-col">
          {loading ? (
            <p className="text-xs p-5" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
          ) : data?.todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
              <NysaLogo size={40} color="var(--border)" />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucune tâche prévue aujourd'hui</p>
              <Link href="/todo" style={{ fontSize: 11, color: 'var(--accent)', ...FONT_DISPLAY, fontWeight: 600 }}>+ Ajouter une tâche</Link>
            </div>
          ) : (
            <ul>
              {data!.todayTasks.slice(0, 7).map(t => {
                const done  = t.status === 'done'
                const color = t.project_color ?? '#0E9594'
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Color dot */}
                    <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: done ? 'var(--text-subtle)' : color }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12, color: done ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: done ? 'line-through' : 'none' }}>
                        {t.title}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {t.project_name ?? 'Sans projet'}
                      </p>
                    </div>
                    {t.due_time && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {t.due_time.slice(0, 5)}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/todo"
            className="flex items-center gap-1"
            style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Voir toutes les tâches <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* Time Tracker — stormy teal */}
      <div
        className="col-span-2 flex flex-col"
        style={card('#11686A', { minHeight: 460 })}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(240,228,204,0.15)' }}>
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#F0E4CC', textTransform: 'uppercase' }}>
            Time Trackers — Aujourd'hui
          </p>
          <Link href="/time-tracker" style={{ fontSize: 10, color: 'rgba(240,228,204,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> Ouvrir
          </Link>
        </div>

        {/* Big time display */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(240,228,204,0.15)' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(240,228,204,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>Aujourd'hui</p>
          <p style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', color: '#F0E4CC', lineHeight: 1 }}>
            {loading ? '…' : fmtSeconds(data?.todaySeconds ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(240,228,204,0.6)', marginTop: 6 }}>
            {loading ? '' : `${fmtSeconds(data?.weekSeconds ?? 0)} cette semaine`}
          </p>
        </div>

        {/* Entries */}
        <div className="flex-1 flex flex-col px-5 py-3 gap-2 overflow-hidden">
          {loading ? (
            <p style={{ fontSize: 12, color: 'rgba(240,228,204,0.5)' }}>Chargement…</p>
          ) : (data?.todayEntries.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2">
              <p style={{ fontSize: 12, color: 'rgba(240,228,204,0.5)', textAlign: 'center' }}>Aucune entrée aujourd'hui</p>
              <Link href="/time-tracker" style={{ fontSize: 11, color: '#F0E4CC', ...FONT_DISPLAY, fontWeight: 600 }}>Démarrer un timer →</Link>
            </div>
          ) : (
            data!.todayEntries.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: e.project_color ?? '#F0E4CC' }} />
                <p style={{ flex: 1, fontSize: 12, color: '#F0E4CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.project_name ?? 'Sans projet'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(240,228,204,0.6)', flexShrink: 0 }}>
                  {e.duration_seconds ? fmtSeconds(e.duration_seconds) : '—'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ ROW 4 — 4 cards */}

      {/* Health — teal */}
      <div className="flex flex-col p-5" style={card('#11686A', { minHeight: 360 })}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#F0E4CC', textTransform: 'uppercase' }}>Health</p>
          <Link href="/health"><ArrowRight size={14} style={{ color: 'rgba(240,228,204,0.5)' }} /></Link>
        </div>
        {loading ? (
          <p style={{ fontSize: 12, color: 'rgba(240,228,204,0.5)' }}>…</p>
        ) : data?.latestWeight ? (
          <>
            <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'rgba(240,228,204,0.6)', textTransform: 'uppercase', marginBottom: 2 }}>Poids</p>
            <p style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 40, color: '#F0E4CC', lineHeight: 1 }}>
              {data.latestWeight} <span style={{ fontSize: 16, fontWeight: 500 }}>kg</span>
            </p>
            {data.lastRun && (
              <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(240,228,204,0.15)', marginTop: 'auto' }}>
                <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'rgba(240,228,204,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>Dernier run</p>
                <p style={{ ...FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: '#F0E4CC' }}>
                  {data.lastRun.distance_km} km
                </p>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'rgba(240,228,204,0.5)' }}>Aucune donnée</p>
        )}
        <Link href="/health" className="flex items-center gap-1 mt-4"
          style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 600, color: 'rgba(240,228,204,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Voir plus <ArrowRight size={10} />
        </Link>
      </div>

      {/* Recette du jour — orange */}
      <div className="flex flex-col p-5" style={card('#F2542D', { minHeight: 360 })}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#1A0A0A', textTransform: 'uppercase' }}>Recette du jour</p>
          <span style={{ fontSize: 16 }}>🍴</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center gap-2">
          <NysaLogo size={36} color="rgba(26,10,10,0.2)" />
          <p style={{ fontSize: 12, color: 'rgba(26,10,10,0.7)', textAlign: 'center' }}>Bientôt disponible</p>
        </div>
        <Link href="/recettes" className="flex items-center gap-1 mt-4"
          style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 600, color: 'rgba(26,10,10,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Voir les recettes <ArrowRight size={10} />
        </Link>
      </div>

      {/* Liste de courses — cream */}
      <div className="flex flex-col p-5" style={card('#F0E4CC', { minHeight: 360 })}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#1A0A0A', textTransform: 'uppercase' }}>Courses</p>
          <span style={{ fontSize: 16 }}>🛒</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center gap-2">
          <NysaLogo size={36} color="rgba(26,10,10,0.15)" />
          <p style={{ fontSize: 12, color: 'rgba(26,10,10,0.6)', textAlign: 'center' }}>Ouvre ta liste</p>
        </div>
        <Link href="/courses" className="flex items-center gap-1 mt-4"
          style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 600, color: 'rgba(26,10,10,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Voir la liste <ArrowRight size={10} />
        </Link>
      </div>

      {/* Budget — dark */}
      <div className="flex flex-col p-5" style={card('var(--bg-card)', { border: '1px solid var(--border)', minHeight: 360 })}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</p>
          <Link href="/budget"><ArrowRight size={14} style={{ color: 'var(--text-muted)' }} /></Link>
        </div>
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>…</p>
        ) : (
          <>
            <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Solde du mois</p>
            <p style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 32, color: balance >= 0 ? '#0E9594' : '#F2542D', lineHeight: 1 }}>
              {balance >= 0 ? '+' : ''}{fmtEur(balance)}
            </p>
            <div className="mt-4 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <div className="flex justify-between">
                <p style={{ fontSize: 10, color: '#0E9594' }}>Revenus</p>
                <p style={{ fontSize: 10, color: '#0E9594', ...FONT_DISPLAY, fontWeight: 600 }}>{fmtEur(data?.monthIncome ?? 0)}</p>
              </div>
              <div className="flex justify-between">
                <p style={{ fontSize: 10, color: '#F2542D' }}>Dépenses</p>
                <p style={{ fontSize: 10, color: '#F2542D', ...FONT_DISPLAY, fontWeight: 600 }}>{fmtEur(data?.monthExpense ?? 0)}</p>
              </div>
              {/* Progress bar */}
              {(data?.monthIncome ?? 0) > 0 && (
                <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 99,
                    background: '#F2542D',
                    width: `${Math.min(100, ((data?.monthExpense ?? 0) / (data?.monthIncome ?? 1)) * 100)}%`,
                  }} />
                </div>
              )}
            </div>
          </>
        )}
        <Link href="/budget" className="flex items-center gap-1 mt-auto pt-4"
          style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Voir le budget <ArrowRight size={10} />
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════ ROW 5 — Rapport Global */}

      <div
        className="col-span-2 md:col-span-4 flex flex-col p-6"
        style={card('#0E9594', { minHeight: 220 })}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#1A0A0A', textTransform: 'uppercase' }}>
              Rapport Global
            </p>
            <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.6)', marginTop: 2 }}>Vue d'ensemble de ta progression</p>
          </div>
          <Link href="/rapports" className="flex items-center gap-1"
            style={{ ...FONT_DISPLAY, fontSize: 10, fontWeight: 700, color: '#1A0A0A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Voir le rapport complet <ArrowRight size={10} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-4">
          <Stat label="Projets actifs"   value={loading ? '…' : String(data?.activeProjects.length ?? 0)} textColor="#1A0A0A" />
          <Stat label="Tâches complétées" value={loading ? '…' : String(doneTasks)}                        sub="aujourd'hui"     textColor="#1A0A0A" />
          <Stat label="Temps moyen / jour" value={loading ? '…' : fmtSeconds(Math.round((data?.weekSeconds ?? 0) / 7))} textColor="#1A0A0A" />
          <Stat label="Courses"           value="—"                                                          textColor="#1A0A0A" />
          <Stat label="Solde du mois"     value={loading ? '…' : fmtEur(balance)}                           textColor="#1A0A0A" />
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavCard({
  href, bg, logoColor, label, value, sub, textColor,
}: {
  href: string; bg: string; logoColor: string; label: string
  value: string; sub: string; textColor: string
}) {
  const FONT_DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display)' }
  return (
    <Link
      href={href}
      className="flex flex-col justify-between p-5 group transition-all"
      style={{ background: bg, borderRadius: 12, minHeight: 260, overflow: 'hidden' }}
    >
      <div className="flex items-start justify-between">
        <NysaLogo size={56} color={logoColor} />
        <ArrowRight size={16} style={{ color: textColor, opacity: 0.5 }} />
      </div>
      <div>
        <p style={{ ...FONT_DISPLAY, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: textColor, textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 22, color: textColor, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 10, color: textColor, opacity: 0.6, marginTop: 2 }}>{sub}</p>
      </div>
    </Link>
  )
}

function Stat({ label, value, sub, textColor }: { label: string; value: string; sub?: string; textColor: string }) {
  const FONT_DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display)' }
  return (
    <div>
      <p style={{ ...FONT_DISPLAY, fontWeight: 900, fontSize: 28, color: textColor, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.6)', marginTop: 1 }}>{sub}</p>}
      <p style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(26,10,10,0.55)', textTransform: 'uppercase', marginTop: 4 }}>{label}</p>
    </div>
  )
}
