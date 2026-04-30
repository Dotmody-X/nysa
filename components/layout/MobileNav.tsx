'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BarChart2, User, Plus } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/',           label: 'Accueil',    Icon: Home      },
  { href: '/calendrier', label: 'Calendrier', Icon: Calendar  },
  { href: '/rapports',   label: 'Rapports',   Icon: BarChart2 },
  { href: '/compte',     label: 'Profil',     Icon: User      },
]

const QUICK_LINKS = [
  { href: '/todo',         label: 'Tâche',  color: '#F2542D' },
  { href: '/time-tracker', label: 'Timer',  color: '#0E9594' },
  { href: '/budget',       label: 'Budget', color: '#9B72CF' },
  { href: '/projets',      label: 'Projet', color: '#E8A838' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Quick-add overlay */}
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:59, backdropFilter:'blur(4px)' }}
          />
          <div style={{
            position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, zIndex:60, width:240,
          }}>
            {QUICK_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                style={{
                  background:l.color, borderRadius:14, padding:'14px 16px',
                  display:'flex', flexDirection:'column', gap:2, textDecoration:'none',
                }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:800, color:'#fff', letterSpacing:'0.06em' }}>{l.label}</span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.75)' }}>Ouvrir →</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Nav bar */}
      <nav className="md:hidden bottom-nav"
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:50,
          background:'var(--bg-sidebar)', borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-around',
          padding:'8px 12px',
        }}>

        {NAV_ITEMS.slice(0, 2).map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:52, textDecoration:'none', padding:'4px 0' }}>
              <Icon size={21} style={{ color: active ? '#F2542D' : 'var(--text-muted)' }} />
              <span style={{ fontSize:9, fontFamily:'var(--font-display)', fontWeight: active ? 700 : 500, color: active ? '#F2542D' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Centre : bouton + */}
        <button onClick={() => setOpen(o => !o)}
          style={{
            width:54, height:54, borderRadius:99, background:'#F2542D', border:'none',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 18px rgba(242,84,45,0.45)', flexShrink:0,
            transform: open ? 'rotate(45deg)' : 'none',
            transition:'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}>
          <Plus size={24} style={{ color:'#fff' }} />
        </button>

        {NAV_ITEMS.slice(2).map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:52, textDecoration:'none', padding:'4px 0' }}>
              <Icon size={21} style={{ color: active ? '#F2542D' : 'var(--text-muted)' }} />
              <span style={{ fontSize:9, fontFamily:'var(--font-display)', fontWeight: active ? 700 : 500, color: active ? '#F2542D' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
