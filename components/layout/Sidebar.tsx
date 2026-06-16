'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Sun, Moon, Monitor, User } from '@/components/ui/icons'
import { NysaLogo } from '@/components/ui/NysaLogo'
import { useState, useEffect, useRef } from 'react'
import { saveTheme, THEME_KEY } from '@/lib/theme'
import type { ThemeMode } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'

type NavItem = { href: string; label: string; color?: string; accent?: boolean }

const navItems: NavItem[] = [
  { href: '/',             label: 'Accueil',       color: 'var(--accent-budget)' },
  { href: '/calendrier',   label: 'Calendrier',    color: 'var(--accent-time)' },
  { href: '/time-tracker', label: 'Time Trackers', color: 'var(--accent-time)' },
  { href: '/projets',      label: 'Projets',       color: 'var(--accent-time)' },
  { href: '/todo',         label: 'To Do List',    color: 'var(--accent-time)' },
  { href: '/sport',        label: 'Running',       color: 'var(--accent-time)' },
  { href: '/health',       label: 'Health',        color: 'var(--accent-time)' },
  { href: '/recettes',     label: 'Recettes',      color: 'var(--accent-time)' },
  { href: '/courses',      label: 'Courses',       color: 'var(--accent-time)' },
  { href: '/budget',       label: 'Budget',        color: 'var(--accent-time)' },
  { href: '/rapports',     label: 'Rapports',      color: 'var(--accent-time)' },
  // Agent IA masqué tant qu'il n'est pas opérationnel
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
        <NysaLogo size={52} color="var(--accent-budget)" />
        <p
          style={{
            color: 'var(--text)',
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
        {navItems.map((item, idx) => {
          const active = isActive(item.href)
          const prevItem = navItems[idx - 1]
          const showSep = item.accent && prevItem && !prevItem.accent
          return (
            <div key={item.href}>
              {showSep && (
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              )}
              <Link
                href={item.href}
                className="flex items-center gap-3 px-2 py-2 rounded-[10px] group transition-all duration-100"
                style={{
                  background: active ? 'var(--accent-budget)' : 'transparent',
                  border: active ? '2px solid var(--ink)' : '2px solid transparent',
                  boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                  marginTop: item.accent ? 2 : 0,
                }}
              >
                {/* Square bullet */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 1,
                    flexShrink: 0,
                    background: active ? 'var(--chocolate)' : item.color ?? 'var(--accent-time)',
                    opacity: active ? 1 : item.accent ? 0.85 : 0.6,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: active ? 800 : item.accent ? 600 : 500,
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    color: active ? 'var(--chocolate)' : item.accent ? 'var(--accent-budget)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
                {item.accent && !active && (
                  <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-budget)', opacity: 0.7, flexShrink: 0 }} />
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {/* Profile */}
        <Link
          href="/compte"
          className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] transition-all"
          style={{
            background: isActive('/compte') ? 'var(--accent-budget)' : 'var(--bg-card)',
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0 var(--ink)',
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-budget)', border: '2px solid var(--ink)' }}
          >
            <User size={12} style={{ color: 'var(--chocolate)' }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', color: isActive('/compte') ? 'var(--chocolate)' : 'var(--text)', letterSpacing: '0.05em', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
            <p style={{ fontSize: '9px', color: isActive('/compte') ? 'var(--chocolate)' : 'var(--text-muted)', opacity: isActive('/compte') ? 0.7 : 1 }}>Voir profil</p>
          </div>
        </Link>

        {/* Icon buttons */}
        <div className="flex gap-1 px-1">
          <Link
            href="/reglages"
            className="flex-1 flex items-center justify-center py-2 rounded-[10px] transition-all"
            style={{
              color: isActive('/reglages') ? 'var(--chocolate)' : 'var(--text-muted)',
              background: isActive('/reglages') ? 'var(--accent-budget)' : 'var(--bg-card)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)',
            }}
          >
            <Settings size={13} />
          </Link>

          {/* Theme picker */}
          <div className="flex-1 relative" ref={popoverRef}>
            <button
              onClick={() => setThemeOpen(o => !o)}
              className="w-full flex items-center justify-center py-2 rounded-[10px] transition-all"
              style={{
                color: themeOpen ? 'var(--chocolate)' : 'var(--text-muted)',
                background: themeOpen ? 'var(--accent-budget)' : 'var(--bg-card)',
                border: '2px solid var(--ink)',
                boxShadow: '2px 2px 0 var(--ink)',
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
                  border: '2px solid var(--ink)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  display: 'flex',
                  gap: 6,
                  boxShadow: '4px 4px 0 var(--ink)',
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
                        borderRadius: 'var(--radius-sm)',
                        border: '2px solid var(--ink)',
                        background: active ? 'var(--accent-budget)' : 'var(--bg-input)',
                        boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        minWidth: 42,
                      }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--chocolate)' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', color: active ? 'var(--chocolate)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
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
