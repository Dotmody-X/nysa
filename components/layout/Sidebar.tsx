'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Calendar, Timer, FolderKanban,
  CheckSquare, Heart, UtensilsCrossed, ShoppingCart,
  Footprints, Wallet, BarChart2, Sparkles,
  ChevronDown, Settings, User,
} from 'lucide-react'
import { NysaLogo } from '@/components/ui/NysaLogo'

type NavItem = {
  href:     string
  label:    string
  icon:     React.ElementType
  children?: { href: string; label: string; icon: React.ElementType }[]
}

const navItems: NavItem[] = [
  { href: '/',             label: 'Accueil',       icon: LayoutDashboard },
  { href: '/calendrier',   label: 'Calendrier',    icon: Calendar },
  { href: '/time-tracker', label: 'Time Trackers', icon: Timer },
  { href: '/projets',      label: 'Projets',       icon: FolderKanban },
  { href: '/todo',         label: 'To Do List',    icon: CheckSquare },
  { href: '/health',       label: 'Health',        icon: Heart },
  {
    href:  '/recettes',
    label: 'Recettes',
    icon:  UtensilsCrossed,
    children: [
      { href: '/courses', label: 'Courses alim.', icon: ShoppingCart },
    ],
  },
  { href: '/sport',   label: 'Course à pied', icon: Footprints },
  { href: '/budget',  label: 'Budget',        icon: Wallet },
  { href: '/rapports',label: 'Rapports',      icon: BarChart2 },
  { href: '/agent',   label: 'Agent IA',      icon: Sparkles },
]

export function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ '/recettes': true })

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function toggleMenu(href: string) {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }))
  }

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{ width: 'var(--sidebar-width)', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex flex-col items-center justify-center gap-2 py-6 px-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <NysaLogo size={64} color="var(--accent)" />
        <div className="flex flex-col items-center gap-0.5">
          <p
            className="tracking-[0.2em] uppercase leading-none"
            style={{
              color: 'var(--wheat)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.25em',
            }}
          >
            NYSA
          </p>
          <p
            className="tracking-widest uppercase"
            style={{ color: 'var(--text-subtle)', fontSize: '8px', letterSpacing: '0.2em' }}
          >
            Life OS
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(item => {
          const active    = isActive(item.href)
          const hasKids   = !!item.children?.length
          const isOpen    = openMenus[item.href] ?? false
          const Icon      = item.icon

          return (
            <div key={item.href}>
              {/* Main item */}
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className="flex-1 flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium transition-all duration-150 group"
                  style={{
                    color:      active ? 'var(--wheat)'        : 'var(--text-muted)',
                    background: active ? 'rgba(242,84,45,0.1)' : 'transparent',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <Icon
                    size={15}
                    className="shrink-0"
                    style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                </Link>

                {/* Chevron pour sous-menus */}
                {hasKids && (
                  <button
                    onClick={() => toggleMenu(item.href)}
                    className="px-1.5 py-2 rounded-[6px] transition-all"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ChevronDown
                      size={12}
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    />
                  </button>
                )}
              </div>

              {/* Sous-items */}
              {hasKids && isOpen && (
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
                  {item.children!.map(child => {
                    const childActive = isActive(child.href)
                    const ChildIcon   = child.icon
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[11px] font-medium transition-all"
                        style={{
                          color:      childActive ? 'var(--wheat)'         : 'var(--text-muted)',
                          background: childActive ? 'rgba(242,84,45,0.08)' : 'transparent',
                        }}
                      >
                        <ChildIcon size={12} style={{ color: childActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom — profil + réglages */}
      <div className="px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <Link
          href="/compte"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs transition-all"
          style={{ color: isActive('/compte') ? 'var(--wheat)' : 'var(--text-muted)', background: isActive('/compte') ? 'rgba(242,84,45,0.08)' : 'transparent' }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(242,84,45,0.15)' }}>
            <User size={11} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--wheat)' }}>NYSA</p>
            <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>Voir profil</p>
          </div>
        </Link>

        <div className="flex gap-1 px-1">
          <Link href="/reglages"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-[10px] transition-all"
            style={{ color: isActive('/reglages') ? 'var(--accent)' : 'var(--text-muted)', background: isActive('/reglages') ? 'rgba(242,84,45,0.08)' : 'transparent' }}>
            <Settings size={12} /> Réglages
          </Link>
        </div>
      </div>
    </aside>
  )
}
