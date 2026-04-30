'use client'
import { useState, useEffect } from 'react'
import { User, Palette, Bell, Database, Keyboard, Info, Puzzle } from 'lucide-react'
import { saveTheme, loadTheme, type ThemeMode } from '@/lib/theme'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const ACCENT_PRESETS = [
  { label: 'Fiery',    color: '#F2542D' },
  { label: 'Cyan',     color: '#0E9594' },
  { label: 'Violet',   color: '#7C3AED' },
  { label: 'Rose',     color: '#EC4899' },
  { label: 'Amber',    color: '#F59E0B' },
  { label: 'Emerald',  color: '#10B981' },
  { label: 'Sky',      color: '#0EA5E9' },
  { label: 'Slate',    color: '#64748B' },
]

const TABS = [
  { key:'profil',    label:'Profil',          icon: User },
  { key:'theme',     label:'Thème & Apparen.', icon: Palette },
  { key:'notifs',    label:'Notifications',   icon: Bell },
  { key:'donnees',   label:'Données',         icon: Database },
  { key:'raccourcis',label:'Raccourcis',      icon: Keyboard },
  { key:'about',     label:'À propos',        icon: Info },
]

export default function ReglagesPage() {
  const [tab, setTab] = useState('profil')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [accent, setAccent] = useState('#F2542D')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('nysa-theme') as ThemeMode : 'dark'
    const storedAccent = typeof window !== 'undefined' ? localStorage.getItem('nysa-accent') ?? '#F2542D' : '#F2542D'
    setTheme(stored ?? 'dark')
    setAccent(storedAccent)
  }, [])

  function applyTheme(mode: ThemeMode) { setTheme(mode); saveTheme(mode, accent) }
  function applyAccent(color: string)  { setAccent(color); saveTheme(theme, color) }

  return (
    <div className="page-wrap" style={{ display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle title="Réglages" sub="Personnalise · Intégrations · Données · Abonnement" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]">
        {/* Sidebar nav */}
        <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:8, height:'fit-content' }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                style={{ background: tab===t.key ? 'rgba(242,84,45,0.1)' : 'transparent', borderLeft: tab===t.key ? '2px solid #F2542D' : '2px solid transparent' }}>
                <Icon size={14} style={{ color: tab===t.key ? '#F2542D' : 'var(--text-muted)' }} />
                <span style={{ ...DF, fontSize:11, fontWeight: tab===t.key ? 700 : 500, color: tab===t.key ? 'var(--wheat)' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="md:col-span-3 flex flex-col gap-[10px]">
          {tab === 'profil' && <ProfilTab />}
          {tab === 'theme'  && <ThemeTab theme={theme} accent={accent} onTheme={applyTheme} onAccent={applyAccent} />}
          {tab === 'notifs' && <NotifsTab />}
          {tab === 'donnees' && <DonneesTab />}
          {tab === 'raccourcis' && <RaccourcisTab />}
          {tab === 'about'  && <AboutTab />}
        </div>
      </div>
    </div>
  )
}

function ProfilTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:20 }}>Profil</p>
      <div className="flex flex-col gap-4">
        {[
          { label:'Nom', placeholder:'Ton prénom', type:'text' },
          { label:'Email', placeholder:'email@exemple.com', type:'email' },
          { label:'Fuseau horaire', placeholder:'Europe/Brussels', type:'text' },
          { label:'Format de date', placeholder:'JJ/MM/AAAA', type:'text' },
        ].map(f => (
          <div key={f.label}>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{f.label}</p>
            <input type={f.type} placeholder={f.placeholder}
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:13 }} />
          </div>
        ))}
        <button style={{ background:'#F2542D', color:'#fff', borderRadius:10, padding:'10px 24px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, width:'fit-content', marginTop:8 }}>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}

function ThemeTab({ theme, accent, onTheme, onAccent }: { theme: ThemeMode; accent: string; onTheme:(t:ThemeMode)=>void; onAccent:(c:string)=>void }) {
  const themes: { key: ThemeMode; label: string; bg: string; preview: string }[] = [
    { key:'dark',   label:'Sombre',  bg:'#0C0C0C', preview:'#1A1A1A' },
    { key:'light',  label:'Clair',   bg:'#F5F4F0', preview:'#FFFFFF' },
    { key:'system', label:'Système', bg:'linear-gradient(135deg,#0C0C0C 50%,#F5F4F0 50%)', preview:'#888' },
  ]
  return (
    <div className="flex flex-col gap-[10px]">
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:16 }}>Thème</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button key={t.key} onClick={() => onTheme(t.key)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
              style={{ border:`2px solid ${theme===t.key ? '#F2542D' : 'var(--border)'}`, background:'var(--bg-input)' }}>
              <div style={{ width:48, height:32, borderRadius:6, background:t.bg, border:'1px solid var(--border)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color: theme===t.key ? '#F2542D' : 'var(--text-muted)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#0E9594', textTransform:'uppercase', marginBottom:16 }}>Couleur accent</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ACCENT_PRESETS.map(p => (
            <button key={p.color} onClick={() => onAccent(p.color)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
              style={{ border:`2px solid ${accent===p.color ? p.color : 'var(--border)'}`, background:'var(--bg-input)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:p.color }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:9, fontWeight:700, color: accent===p.color ? p.color : 'var(--text-muted)', textTransform:'uppercase' }}>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={accent} onChange={e => onAccent(e.target.value)}
            style={{ width:40, height:40, borderRadius:8, border:'1px solid var(--border)', padding:3, cursor:'pointer', background:'var(--bg-input)' }} />
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Couleur personnalisée</span>
          <code style={{ fontSize:11, color:accent, fontWeight:700 }}>{accent}</code>
        </div>
      </div>
    </div>
  )
}

function NotifsTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:20 }}>Notifications</p>
      {[
        { label:'Rappels de tâches',     desc:'Notif avant deadline' },
        { label:'Résumé quotidien',       desc:'Chaque matin à 9h' },
        { label:'Objectifs atteints',     desc:'Célébration automatique' },
        { label:'Alertes budget',         desc:'Dépassement de seuil' },
        { label:'Météo courses à pied',   desc:'Avant tes runs prévus' },
      ].map(n => (
        <div key={n.label} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--wheat)' }}>{n.label}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{n.desc}</p>
          </div>
          <div style={{ width:40, height:22, borderRadius:99, background:'rgba(14,149,148,0.3)', cursor:'pointer', position:'relative' }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:'#0E9594', position:'absolute', top:2, right:2, transition:'all 0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonneesTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:20 }}>Données & Sauvegardes</p>
      {[
        { label:'Exporter toutes les données', desc:'Export JSON complet', color:'#0E9594' },
        { label:'Exporter les tâches',         desc:'Format CSV',          color:'#0E9594' },
        { label:'Exporter les finances',       desc:'Format Excel/CSV',    color:'#0E9594' },
        { label:'Supprimer toutes les données', desc:'Action irréversible', color:'#F2542D' },
      ].map(a => (
        <div key={a.label} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--wheat)' }}>{a.label}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.desc}</p>
          </div>
          <button style={{ fontSize:11, color:a.color, fontFamily:'var(--font-display)', fontWeight:700, padding:'6px 14px', borderRadius:8, border:`1px solid ${a.color}`, background:'transparent' }}>
            Exporter
          </button>
        </div>
      ))}
    </div>
  )
}

function RaccourcisTab() {
  const shortcuts = [
    { keys:'⌘ K', action:'Recherche globale' },
    { keys:'⌘ N', action:'Nouvelle tâche' },
    { keys:'⌘ T', action:'Démarrer timer' },
    { keys:'⌘ /', action:'Aide & commandes' },
    { keys:'G H', action:'Accueil' },
    { keys:'G C', action:'Calendrier' },
    { keys:'G P', action:'Projets' },
    { keys:'G B', action:'Budget' },
  ]
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:20 }}>Raccourcis clavier</p>
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map(s => (
          <div key={s.action} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background:'var(--bg-input)', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{s.action}</span>
            <kbd style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, color:'var(--wheat)', background:'var(--bg-card)', padding:'2px 8px', borderRadius:4, border:'1px solid var(--border)' }}>{s.keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'#F2542D', textTransform:'uppercase', marginBottom:20 }}>À propos</p>
      <div className="flex flex-col gap-4">
        <div>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color:'var(--wheat)' }}>NYSA</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Life OS — Version 1.0.0</p>
        </div>
        <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>
          NYSA est ton espace de vie numérique tout-en-un. Conçu pour centraliser, planifier et progresser.
        </p>
        {[
          { label:'Version', value:'1.0.0' },
          { label:'Framework', value:'Next.js 15' },
          { label:'Base de données', value:'Supabase' },
          { label:'Déployé sur', value:'Vercel' },
        ].map(item => (
          <div key={item.label} className="flex justify-between py-2" style={{ borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{item.label}</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'var(--wheat)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
