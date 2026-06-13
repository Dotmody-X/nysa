'use client'
import { useState, useEffect } from 'react'
import { User, Palette, Bell, Database, Keyboard, Info, Puzzle, RotateCcw } from '@/components/ui/icons'
import { saveTheme, loadTheme, type ThemeMode } from '@/lib/theme'
import { isDemoModeEnabled, toggleDemoMode } from '@/lib/demo-mode'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const ACCENT_PRESETS = [
  { label: 'Fiery',    color: 'var(--accent-budget)' },
  { label: 'Cyan',     color: 'var(--azul)' },
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
  const [accent, setAccent] = useState('var(--accent-budget)')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('nysa-theme') as ThemeMode : 'dark'
    const storedAccent = typeof window !== 'undefined' ? localStorage.getItem('nysa-accent') ?? 'var(--accent-budget)' : 'var(--accent-budget)'
    setTheme(stored ?? 'dark')
    setAccent(storedAccent)
  }, [])

  function applyTheme(mode: ThemeMode) { setTheme(mode); saveTheme(mode, accent) }
  function applyAccent(color: string)  { setAccent(color); saveTheme(theme, color) }

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle title="Réglages" sub="Personnalise · Intégrations · Données · Abonnement" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[12px]">
        {/* Sidebar nav */}
        <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:8, height:'fit-content', display:'flex', flexDirection:'column', gap:6 }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all nb-press"
                style={{ background: tab===t.key ? 'var(--accent-budget)' : 'var(--bg-input)', border:'2px solid var(--ink)', boxShadow: tab===t.key ? '3px 3px 0 var(--ink)' : 'none' }}>
                <Icon size={14} style={{ color: tab===t.key ? 'var(--chocolate)' : 'var(--text-muted)' }} />
                <span style={{ ...DF, fontSize:11, fontWeight: tab===t.key ? 800 : 500, color: tab===t.key ? 'var(--chocolate)' : 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t.label}</span>
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
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>Profil</p>
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
              style={{ width:'100%', background:'var(--bg-input)', border:'2px solid var(--ink)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:13 }} />
          </div>
        ))}
        <button className="nb-press" style={{ background:'var(--accent-budget)', color:'var(--chocolate)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:'10px 24px', fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, width:'fit-content', marginTop:8 }}>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}

function ThemeTab({ theme, accent, onTheme, onAccent }: { theme: ThemeMode; accent: string; onTheme:(t:ThemeMode)=>void; onAccent:(c:string)=>void }) {
  const themes: { key: ThemeMode; label: string; bg: string; preview: string }[] = [
    { key:'dark',   label:'Sombre',  bg:'#0C0C0C', preview:'var(--text)' },
    { key:'light',  label:'Clair',   bg:'#F5F4F0', preview:'#FFFFFF' },
    { key:'system', label:'Système', bg:'linear-gradient(135deg,#0C0C0C 50%,#F5F4F0 50%)', preview:'#888' },
  ]
  return (
    <div className="flex flex-col gap-[10px]">
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:16 }}>Thème</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button key={t.key} onClick={() => onTheme(t.key)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all nb-press"
              style={{ border:'2px solid var(--ink)', boxShadow: theme===t.key ? '4px 4px 0 var(--ink)' : 'none', background: theme===t.key ? 'var(--accent-budget)' : 'var(--bg-input)' }}>
              <div style={{ width:48, height:32, borderRadius:6, background:t.bg, border:'2px solid var(--ink)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color: theme===t.key ? 'var(--chocolate)' : 'var(--text-muted)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--azul)', textTransform:'uppercase', marginBottom:16 }}>Couleur accent</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ACCENT_PRESETS.map(p => (
            <button key={p.color} onClick={() => onAccent(p.color)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl nb-press"
              style={{ border:'2px solid var(--ink)', boxShadow: accent===p.color ? '4px 4px 0 var(--ink)' : 'none', background:'var(--bg-input)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:p.color, border:'2px solid var(--ink)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:9, fontWeight:700, color: accent===p.color ? p.color : 'var(--text-muted)', textTransform:'uppercase' }}>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={accent} onChange={e => onAccent(e.target.value)}
            style={{ width:40, height:40, borderRadius:8, border:'2px solid var(--ink)', padding:3, cursor:'pointer', background:'var(--bg-input)' }} />
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Couleur personnalisée</span>
          <code style={{ fontSize:11, color:accent, fontWeight:700 }}>{accent}</code>
        </div>
      </div>
    </div>
  )
}

function NotifsTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>Notifications</p>
      {[
        { label:'Rappels de tâches',     desc:'Notif avant deadline' },
        { label:'Résumé quotidien',       desc:'Chaque matin à 9h' },
        { label:'Objectifs atteints',     desc:'Célébration automatique' },
        { label:'Alertes budget',         desc:'Dépassement de seuil' },
        { label:'Météo courses à pied',   desc:'Avant tes runs prévus' },
      ].map(n => (
        <div key={n.label} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text)' }}>{n.label}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{n.desc}</p>
          </div>
          <div className="nb-press" style={{ width:42, height:24, borderRadius:99, background:'var(--azul)', border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)', cursor:'pointer', position:'relative' }}>
            <div style={{ width:16, height:16, borderRadius:'50%', background:'var(--creamy-ivory)', position:'absolute', top:2, right:2, transition:'all 0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonneesTab() {
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDemoEnabled(isDemoModeEnabled())
    setHydrated(true)
  }, [])

  function handleToggleDemo() {
    toggleDemoMode()
    setDemoEnabled(!demoEnabled)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>Données & Sauvegardes</p>
      
      {/* Demo Mode Toggle */}
      {hydrated && (
        <div className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text)' }}>Mode démo</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{demoEnabled ? 'Données d\'exemple visibles' : 'Pages vides'}</p>
          </div>
          <button
            onClick={handleToggleDemo}
            className="nb-press"
            style={{
              width:50,
              height:28,
              borderRadius:14,
              border:'2px solid var(--ink)',
              boxShadow:'2px 2px 0 var(--ink)',
              background: demoEnabled ? 'var(--accent-budget)' : 'var(--bg-input)',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              padding:demoEnabled ? '2px 2px 2px 22px' : '2px 22px 2px 2px',
              transition:'all 0.2s ease',
            }}
            title="Toggle demo mode"
          >
            <div style={{
              width:20,
              height:20,
              borderRadius:10,
              background:'var(--ink)',
              transition:'all 0.2s ease',
            }} />
          </button>
        </div>
      )}

      {/* Export actions */}
      {[
        { label:'Exporter toutes les données', desc:'Export JSON complet', color:'var(--accent-time)' },
        { label:'Exporter les tâches',         desc:'Format CSV',          color:'var(--accent-time)' },
        { label:'Exporter les finances',       desc:'Format Excel/CSV',    color:'var(--accent-time)' },
        { label:'Supprimer toutes les données', desc:'Action irréversible', color:'var(--accent-budget)' },
      ].map(a => (
        <div key={a.label} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text)' }}>{a.label}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.desc}</p>
          </div>
          <button className="nb-press" style={{ fontSize:11, color:a.color, fontFamily:'var(--font-display)', fontWeight:800, padding:'6px 14px', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', background:'var(--bg-card)' }}>
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
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>Raccourcis clavier</p>
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map(s => (
          <div key={s.action} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background:'var(--bg-input)', border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{s.action}</span>
            <kbd style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, color:'var(--text)', background:'var(--bg-card)', padding:'2px 8px', borderRadius:4, border:'2px solid var(--ink)' }}>{s.keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>À propos</p>
      <div className="flex flex-col gap-4">
        <div>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color:'var(--text)' }}>NYSA</p>
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
            <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'var(--text)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
