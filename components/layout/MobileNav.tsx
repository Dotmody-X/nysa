'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Timer, CheckSquare,
  Heart, Wallet, BarChart2,
} from 'lucide-react'

const mobileItems = [
  { href: '/',             label: 'Accueil',   icon: LayoutDashboard },
  { href: '/calendrier',   label: 'Agenda',    icon: Calendar },
  { href: '/time-tracker', label: 'Timer',     icon: Timer },
  { href: '/todo',         label: 'Tâches',    icon: CheckSquare },
  { href: '/health',       label: 'Health',    icon: Heart },
  { href: '/budget',       label: 'Budget',    icon: Wallet },
  { href: '/rapports',     label: 'Rapports',  icon: BarChart2 },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
      style={{
        background: 'var(--bg-sidebar)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      {mobileItems.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
            style={{ minWidth: 44 }}
          >
            <Icon
              size={18}
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
            />
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-display)',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
