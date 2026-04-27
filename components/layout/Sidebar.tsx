'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Timer,
  FolderKanban,
  Heart,
  CheckSquare,
  ShoppingCart,
  Wallet,
  BarChart2,
  Sparkles,
  Star,
} from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Accueil',      icon: LayoutDashboard },
  { href: '/calendrier',   label: 'Calendrier',   icon: Calendar },
  { href: '/time-tracker', label: 'Time Tracker', icon: Timer },
  { href: '/projets',      label: 'Projets',      icon: FolderKanban },
  { href: '/health',       label: 'Health',       icon: Heart },
  { href: '/todo',         label: 'To-Do List',   icon: CheckSquare },
  { href: '/courses',      label: 'Courses',      icon: ShoppingCart },
  { href: '/budget',       label: 'Budget',       icon: Wallet },
  { href: '/rapports',     label: 'Rapports',     icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Star
          size={22}
          fill="currentColor"
          style={{ color: '#F2542D' }}
        />
        <div>
          <p className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--wheat)' }}>
            NYSA
          </p>
          <p className="text-[9px] tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            Life OS
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium transition-all duration-150 group"
              style={{
                color:      active ? 'var(--wheat)'      : 'var(--text-muted)',
                background: active ? 'rgba(242,84,45,0.1)' : 'transparent',
                borderLeft: active ? '2px solid #F2542D'   : '2px solid transparent',
              }}
            >
              <Icon
                size={15}
                style={{ color: active ? '#F2542D' : 'var(--text-muted)' }}
                className="shrink-0 transition-colors duration-150 group-hover:text-[var(--wheat)]"
              />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Agent IA */}
      <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-3 rounded-[8px] text-xs font-medium transition-all duration-150 hover:opacity-80"
          style={{
            background:  'rgba(14,149,148,0.15)',
            border:      '1px solid rgba(14,149,148,0.3)',
            color:       '#0E9594',
          }}
        >
          <Sparkles size={14} />
          Agent IA NYSA
        </button>
      </div>
    </aside>
  )
}
