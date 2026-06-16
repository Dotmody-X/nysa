'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BarChart2, User, Plus, LayoutGrid, X,
  Calendar, Clock, FolderKanban, CheckSquare, Activity, HeartPulse,
  UtensilsCrossed, ShoppingCart, Wallet,
} from '@/components/ui/icons'
import { useState } from 'react'
import { useAppConfig } from '@/hooks/useAppConfig'

const ALL_SECTIONS = [
  { href: '/',             label: 'Accueil',      Icon: Home },
  { href: '/calendrier',   label: 'Calendrier',   Icon: Calendar },
  { href: '/time-tracker', label: 'Time Tracker', Icon: Clock },
  { href: '/projets',      label: 'Projets',      Icon: FolderKanban },
  { href: '/todo',         label: 'To Do',        Icon: CheckSquare },
  { href: '/sport',        label: 'Running',      Icon: Activity },
  { href: '/health',       label: 'Health',       Icon: HeartPulse },
  { href: '/recettes',     label: 'Recettes',     Icon: UtensilsCrossed },
  { href: '/courses',      label: 'Courses',      Icon: ShoppingCart },
  { href: '/budget',       label: 'Budget',       Icon: Wallet },
  { href: '/rapports',     label: 'Rapports',     Icon: BarChart2 },
  // Agent IA masqué tant qu'il n'est pas opérationnel
]

const QUICK_LINKS = [
  { href: '/todo',         label: 'Tâche',  color: 'var(--accent-budget)' },
  { href: '/time-tracker', label: 'Timer',  color: 'var(--azul)' },
  { href: '/budget',       label: 'Budget', color: '#9B72CF' },
  { href: '/projets',      label: 'Projet', color: '#E8A838' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { config } = useAppConfig()
  const visibleSections = ALL_SECTIONS.filter(s => !config.hiddenSections.includes(s.href))
  const [quickOpen, setQuickOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const tab = (href: string, label: string, Icon: typeof Home, onClick?: () => void) => {
    const active = !onClick && isActive(href)
    const inner = (
      <>
        <Icon size={21} style={{ color: active ? 'var(--accent-budget)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: active ? 700 : 500, color: active ? 'var(--accent-budget)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </>
    )
    const style: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 52, textDecoration: 'none', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }
    return onClick
      ? <button key={label} onClick={onClick} style={style}>{inner}</button>
      : <Link key={label} href={href} style={style}>{inner}</Link>
  }

  return (
    <>
      {/* Menu complet (toutes les sections) */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} className="md:hidden"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div className="md:hidden" style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
            background: 'var(--bg-card)', borderTop: '2px solid var(--ink)',
            borderRadius: '20px 20px 0 0', padding: '20px 16px calc(96px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)' }}>Navigation</p>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {visibleSections.map(({ href, label, Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={label} href={href} onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '16px 8px', borderRadius: 14, textDecoration: 'none',
                      background: active ? 'var(--accent-budget)' : 'var(--bg-input)',
                      border: '2px solid var(--ink)',
                      boxShadow: '3px 3px 0 var(--ink)',
                    }}>
                    <Icon size={22} style={{ color: active ? 'var(--chocolate)' : 'var(--text)' }} />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'center', color: active ? 'var(--chocolate)' : 'var(--text-muted)' }}>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Quick-add */}
      {quickOpen && (
        <>
          <div onClick={() => setQuickOpen(false)} className="md:hidden"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 59, backdropFilter: 'blur(4px)' }} />
          <div className="md:hidden" style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, zIndex: 60, width: 240 }}>
            {QUICK_LINKS.map(l => {
              // Tangerine is a light accent → ink text; the rest are dark → cream.
              const isLight = l.color === 'var(--accent-budget)'
              const txt = isLight ? 'var(--chocolate)' : 'var(--creamy-ivory)'
              return (
                <Link key={l.href} href={l.href} onClick={() => setQuickOpen(false)}
                  style={{ background: l.color, borderRadius: 14, border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 800, color: txt, letterSpacing: '0.06em' }}>{l.label}</span>
                  <span style={{ fontSize: 10, color: txt, opacity: 0.8 }}>Ouvrir →</span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Barre de navigation */}
      <nav className="md:hidden bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 62,
          background: 'var(--bg-sidebar)', borderTop: '2px solid var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 12px',
        }}>
        {tab('/', 'Accueil', Home)}
        {tab('', 'Menu', LayoutGrid, () => { setMenuOpen(o => !o); setQuickOpen(false) })}

        <button onClick={() => { setQuickOpen(o => !o); setMenuOpen(false) }}
          aria-label="Ajout rapide"
          style={{
            width: 54, height: 54, borderRadius: 99, background: 'var(--accent-budget)', border: '2px solid var(--ink)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '3px 3px 0 var(--ink)', flexShrink: 0,
            transform: quickOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}>
          <Plus size={24} style={{ color: 'var(--chocolate)' }} />
        </button>

        {tab('/rapports', 'Rapports', BarChart2)}
        {tab('/compte', 'Profil', User)}
      </nav>
    </>
  )
}
