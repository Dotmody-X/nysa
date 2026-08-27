'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings, Sun, Moon, Monitor, User,
  Home, BarChart2, Calendar, Clock, FolderKanban, CheckSquare, Activity,
  HeartPulse, UtensilsCrossed, ShoppingCart, Wallet, List, Send, Award, Shield,
  Users, Printer, Package,
} from '@/components/ui/icons'
import { NysaLogo } from '@/components/ui/NysaLogo'
import { useState, useEffect, useRef } from 'react'
import { saveTheme, THEME_KEY } from '@/lib/theme'
import type { ThemeMode } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import { useAppConfig, useIsAdmin } from '@/hooks/useAppConfig'

type NavItem = { href: string; label: string; Icon: typeof Home; accent?: boolean; group?: string }

// Sections courtes (loi de Hick) : regroupement par proximité plutôt
// qu'une liste plate de 14 entrées. Icônes = repérage immédiat.
const navItems: NavItem[] = [
  { href: '/',             label: 'Accueil',       Icon: Home },
  { href: '/brief',        label: 'Brief',         Icon: List },
  { href: '/calendrier',   label: 'Calendrier',    Icon: Calendar,     group: 'Organiser' },
  { href: '/time-tracker', label: 'Time Trackers', Icon: Clock,        group: 'Organiser' },
  { href: '/projets',      label: 'Projets',       Icon: FolderKanban, group: 'Organiser' },
  { href: '/todo',         label: 'To Do List',    Icon: CheckSquare,  group: 'Organiser' },
  { href: '/clients',      label: 'Clients',       Icon: Users,        group: 'Organiser' },
  { href: '/demandes',     label: 'Demandes',      Icon: Package,      group: 'Organiser' },
  { href: '/imprimantes',  label: 'Imprimantes',   Icon: Printer,      group: 'Organiser' },
  { href: '/publications', label: 'Publications',  Icon: Send,         group: 'Organiser' },
  { href: '/directeur-marketing', label: 'Marketing', Icon: Award,     group: 'Organiser' },
  { href: '/sport',        label: 'Running',       Icon: Activity,     group: 'Quotidien' },
  { href: '/health',       label: 'Health',        Icon: HeartPulse,   group: 'Quotidien' },
  { href: '/recettes',     label: 'Recettes',      Icon: UtensilsCrossed, group: 'Quotidien' },
  { href: '/courses',      label: 'Courses',       Icon: ShoppingCart, group: 'Quotidien' },
  { href: '/budget',       label: 'Budget',        Icon: Wallet,       group: 'Analyser' },
  { href: '/rapports',     label: 'Rapports',      Icon: BarChart2,    group: 'Analyser' },
  // Agent IA masqué tant qu'il n'est pas opérationnel
]

const themeOptions: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light',  label: 'Clair',   Icon: Sun     },
  { mode: 'dark',   label: 'Foncé',   Icon: Moon    },
  { mode: 'system', label: 'Système', Icon: Monitor },
]

export function Sidebar() {
  const pathname = usePathname()
  const { config } = useAppConfig()
  const isAdmin = useIsAdmin()
  const visibleNav: NavItem[] = [
    ...navItems.filter(i => !config.hiddenSections.includes(i.href)),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', Icon: Shield, accent: true } as NavItem] : []),
  ]
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
      className="hidden md:flex flex-col h-full shrink-0 on-dark"
      style={{
        width: '200px',
        // Zone marque : encre noire dans les DEUX thèmes (signature NYSA)
        background: '#111111',
        borderRight: '2px solid rgba(245, 245, 245, 0.18)',
        '--ink': '#f5f5f5',
        '--bg-card-hover': 'rgba(245, 245, 245, 0.08)',
      } as React.CSSProperties}
    >
      {/* ── Logo : sticker tangerine incliné ─────────────────── */}
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <div
          className="sticker-l nb-tile flex items-center justify-center"
          style={{ width: 64, height: 64, background: 'var(--accent-brand)', boxShadow: '3px 3px 0 var(--ink)' }}
        >
          <NysaLogo size={44} color="#111111" />
        </div>
        <p
          style={{
            color: '#f5f5f5',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '14px',
            letterSpacing: '0.32em',
            marginLeft: '0.32em',
          }}
        >
          NYSA
        </p>
        <div className="rule-thick" style={{ width: 44, background: 'var(--accent-brand)' }} />
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col px-4 py-4 gap-0.5 overflow-y-auto">
        {visibleNav.map((item, idx) => {
          const active = isActive(item.href)
          const prevItem = visibleNav[idx - 1]
          const showSep = item.accent && prevItem && !prevItem.accent
          const showGroup = item.group && item.group !== prevItem?.group
          return (
            <div key={item.href}>
              {showSep && (
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              )}
              {showGroup && <p className="nav-group-label">{item.group}</p>}
              <Link
                href={item.href}
                className="nav-item flex items-center gap-3 px-2 py-2 rounded-[10px] group transition-all duration-100"
                style={{
                  // Pas de background inline à l'état inactif : le survol
                  // est géré par .nav-item:hover dans globals.css.
                  background: active ? 'var(--accent-brand)' : undefined,
                  border: active ? '2px solid var(--ink)' : '2px solid transparent',
                  boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                  transform: active ? 'rotate(-1.2deg)' : undefined,
                  marginTop: item.accent ? 2 : 0,
                }}
              >
                <item.Icon
                  size={15}
                  style={{
                    flexShrink: 0,
                    color: active ? 'var(--ink-dark)' : item.accent ? 'var(--accent-brand)' : 'var(--text-muted)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: active ? 800 : item.accent ? 600 : 500,
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    color: active ? 'var(--ink-dark)' : item.accent ? 'var(--accent-brand)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
                {item.accent && !active && (
                  <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-brand)', opacity: 0.7, flexShrink: 0 }} />
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {/* Profile — chips fantômes sombres : la sidebar est TOUJOURS noire,
            on n'utilise donc jamais --bg-card (blanc en thème clair) ici. */}
        <Link
          href="/compte"
          className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] transition-all"
          style={{
            background: isActive('/compte') ? 'var(--accent-brand)' : 'rgba(245, 245, 245, 0.07)',
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0 rgba(245, 245, 245, 0.35)',
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isActive('/compte') ? '#111111' : 'var(--accent-brand)', border: '2px solid var(--ink)' }}
          >
            <User size={12} style={{ color: isActive('/compte') ? '#f5f5f5' : 'var(--ink-dark)' }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', color: isActive('/compte') ? 'var(--ink-dark)' : '#f5f5f5', letterSpacing: '0.05em', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
            <p style={{ fontSize: '9px', color: isActive('/compte') ? 'var(--ink-dark)' : 'rgba(245, 245, 245, 0.6)', opacity: isActive('/compte') ? 0.7 : 1 }}>Voir profil</p>
          </div>
        </Link>

        {/* Icon buttons */}
        <div className="flex gap-1 px-1">
          <Link
            href="/reglages"
            className="flex-1 flex items-center justify-center py-2 rounded-[10px] transition-all"
            style={{
              color: isActive('/reglages') ? 'var(--ink-dark)' : 'rgba(245, 245, 245, 0.75)',
              background: isActive('/reglages') ? 'var(--accent-brand)' : 'rgba(245, 245, 245, 0.07)',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 rgba(245, 245, 245, 0.35)',
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
                color: themeOpen ? 'var(--ink-dark)' : 'rgba(245, 245, 245, 0.75)',
                background: themeOpen ? 'var(--accent-brand)' : 'rgba(245, 245, 245, 0.07)',
                border: '2px solid var(--ink)',
                boxShadow: '2px 2px 0 rgba(245, 245, 245, 0.35)',
              }}
            >
              <ActiveThemeIcon size={13} />
            </button>

            {/* Popover — sombre lui aussi */}
            {themeOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#111111',
                  border: '2px solid var(--ink)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  display: 'flex',
                  gap: 6,
                  boxShadow: '4px 4px 0 rgba(245, 245, 245, 0.35)',
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
                        background: active ? 'var(--accent-brand)' : 'rgba(245, 245, 245, 0.07)',
                        boxShadow: active ? '2px 2px 0 rgba(245, 245, 245, 0.35)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        minWidth: 42,
                      }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--ink-dark)' : 'rgba(245, 245, 245, 0.75)' }} />
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', color: active ? 'var(--ink-dark)' : 'rgba(245, 245, 245, 0.75)', textTransform: 'uppercase' }}>
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
