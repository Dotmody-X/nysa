'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Moon, User } from 'lucide-react'
import { NysaLogo } from '@/components/ui/NysaLogo'

type NavItem = { href: string; label: string; color?: string }

const navItems: NavItem[] = [
  { href: '/',             label: 'Accueil',       color: 'var(--accent)' },
  { href: '/calendrier',   label: 'Calendrier',    color: 'var(--dark-cyan)' },
  { href: '/time-tracker', label: 'Time Trackers', color: 'var(--dark-cyan)' },
  { href: '/projets',      label: 'Projets',       color: 'var(--dark-cyan)' },
  { href: '/todo',         label: 'To Do List',    color: 'var(--dark-cyan)' },
  { href: '/health',       label: 'Health',        color: 'var(--dark-cyan)' },
  { href: '/recettes',     label: 'Recettes',      color: 'var(--dark-cyan)' },
  { href: '/courses',      label: 'Courses',       color: 'var(--dark-cyan)' },
  { href: '/budget',       label: 'Budget',        color: 'var(--dark-cyan)' },
  { href: '/rapports',     label: 'Rapports',      color: 'var(--dark-cyan)' },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="hidden md:flex flex-col h-full shrink-0"
      style={{ width: '190px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center gap-2 py-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <NysaLogo size={52} color="var(--accent)" />
        <p
          style={{
            color: 'var(--wheat)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0.3em',
          }}
        >
          NYSA
        </p>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col px-4 py-4 gap-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-2 py-2 rounded-[6px] group transition-all duration-100"
              style={{
                background: active ? 'rgba(242,84,45,0.1)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {/* Square bullet */}
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 1,
                  flexShrink: 0,
                  background: active ? 'var(--accent)' : item.color ?? 'var(--dark-cyan)',
                  opacity: active ? 1 : 0.6,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  color: active ? 'var(--wheat)' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {/* Profile */}
        <Link
          href="/compte"
          className="flex items-center gap-2.5 px-2 py-2 rounded-[6px] transition-all"
          style={{ background: isActive('/compte') ? 'rgba(242,84,45,0.08)' : 'transparent' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--dark-cyan))' }}
          >
            <User size={12} style={{ color: '#fff' }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', color: 'var(--wheat)', letterSpacing: '0.05em' }}>NYSA</p>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Voir profil</p>
          </div>
        </Link>

        {/* Icon buttons */}
        <div className="flex gap-1 px-1">
          <Link
            href="/reglages"
            className="flex-1 flex items-center justify-center py-2 rounded-[6px] transition-all"
            style={{
              color: isActive('/reglages') ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive('/reglages') ? 'rgba(242,84,45,0.08)' : 'transparent',
            }}
          >
            <Settings size={13} />
          </Link>
          <button
            className="flex-1 flex items-center justify-center py-2 rounded-[6px] transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <Moon size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
