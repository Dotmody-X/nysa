'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Sun, Moon, Monitor, User } from 'lucide-react'
import { NysaLogo } from '@/components/ui/NysaLogo'
import { useState, useEffect, useRef } from 'react'
import { saveTheme, THEME_KEY } from '@/lib/theme'
import type { ThemeMode } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'

type NavItem = { href: string; label: string; color?: string }

const navItems: NavItem[] = [
  { href: '/',             label: 'Accueil',       color: 'var(--accent)' },
  { href: '/calendrier',   label: 'Calendrier',    color: 'var(--dark-cyan)' },
  { href: '/time-tracker', label: 'Time Trackers', color: 'var(--dark-cyan)' },
  { href: '/projets',      label: 'Projets',       color: 'var(--dark-cyan)' },
  { href: '/todo',         label: 'To Do List',    color: 'var(--dark-cyan)' },
  { href: '/sport',        label: 'Running',       color: 'var(--dark-cyan)' },
  { href: '/health',       label: 'Health',        color: 'var(--dark-cyan)' },
  { href: '/recettes',     label: 'Recettes',      color: 'var(--dark-cyan)' },
  { href: '/courses',      label: 'Courses',       color: 'var(--dark-cyan)' },
  { href: '/budget',       label: 'Budget',        color: 'var(--dark-cyan)' },
  { href: '/rapports',     label: 'Rapports',      color: 'var(--dark-cyan)' },
]

const themeOptions: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light',  label: 'Clair',   Icon: Sun     },
  { mode: 'dark',   label: 'Foncé',   Icon: Moon    },
  { mode: 'system', label: 'Système', Icon: Monitor },
]

export function Sidebar() {
  const pathname = usePathname()
  const [themeOpen, setThemeOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system')
  const [displayName, setDisplayName] = useState('NYSA')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Read stored theme on mount + load display name
  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeMode) ?? 'system'
    setCurrentTheme(stored)

    const supabase = createClient()
    // Load initial name
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.display_name
      if (name) setDisplayName(name)
    })
    // Live-sync: re-renders immediately after profile save
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const name = session?.user?.user_metadata?.display_name
      if (name) setDisplayName(name)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close popover on outside click
  useEffect(() => {
    if (!themeOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [themeOpen])

  function selectTheme(mode: ThemeMode) {
    saveTheme(mode)
    setCurrentTheme(mode)
    setThemeOpen(false)
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const ActiveThemeIcon = themeOptions.find(t => t.mode === currentTheme)?.Icon ?? Monitor

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
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', color: 'var(--wheat)', letterSpacing: '0.05em', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
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

          {/* Theme picker */}
          <div className="flex-1 relative" ref={popoverRef}>
            <button
              onClick={() => setThemeOpen(o => !o)}
              className="w-full flex items-center justify-center py-2 rounded-[6px] transition-all"
              style={{
                color: themeOpen ? 'var(--accent)' : 'var(--text-muted)',
                background: themeOpen ? 'rgba(242,84,45,0.08)' : 'transparent',
              }}
            >
              <ActiveThemeIcon size={13} />
            </button>

            {/* Popover */}
            {themeOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '8px',
                  display: 'flex',
                  gap: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 100,
                  whiteSpace: 'nowrap',
                }}
              >
                {themeOptions.map(({ mode, label, Icon }) => {
                  const active = currentTheme === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => selectTheme(mode)}
                      title={label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '7px 8px',
                        borderRadius: 8,
                        border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: active ? 'rgba(242,84,45,0.1)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        minWidth: 42,
                      }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', color: active ? 'var(--wheat)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
