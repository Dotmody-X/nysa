'use client'
import { useState, useEffect } from 'react'
import { User, Palette, Bell, Database, Keyboard, Info } from '@/components/ui/icons'
import { saveTheme, type ThemeMode } from '@/lib/theme'
import { isDemoModeEnabled, toggleDemoMode } from '@/lib/demo-mode'
import { PageTitle } from '@/components/ui/PageTitle'
import { createClient } from '@/lib/supabase/client'
import { loadNotifPrefs, saveNotifPrefs, NOTIF_DEFS, type NotifPrefs } from '@/lib/notifPrefs'
import { exportAllJson, exportTasksCsv, exportFinancesCsv, deleteAllData } from '@/lib/dataExport'
import { userKey } from '@/lib/userStore'

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

const LBL_F: React.CSSProperties = { fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }
const INP_F: React.CSSProperties = { width:'100%', boxSizing:'border-box', background:'var(--bg-input)', border:'2px solid var(--ink)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:13 }

function ProfilTab() {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [tz, setTz]       = useState('')
  const [df, setDf]       = useState('JJ/MM/AAAA')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]     = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) return
      const m = data.user.user_metadata ?? {}
      setEmail(data.user.email ?? '')
      setName(m.display_name ?? '')
      setTz(m.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Brussels')
      setDf(m.date_format ?? 'JJ/MM/AAAA')
    })
  }, [])

  async function save() {
    setSaving(true)
    const { error } = await createClient().auth.updateUser({ data: { display_name: name, timezone: tz, date_format: df } })
    try { localStorage.setItem(userKey('nysa_date_format'), df) } catch { /* ignore */ }
    setMsg(error ? '❌ ' + error.message : '✅ Profil enregistré')
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:20 }}>Profil</p>
      <div className="flex flex-col gap-4">
        <div>
          <p style={LBL_F}>Nom</p>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton prénom" style={INP_F} />
        </div>
        <div>
          <p style={LBL_F}>Email</p>
          <input value={email} readOnly title="L'email se modifie depuis la sécurité du compte"
            style={{ ...INP_F, color:'var(--text-muted)', cursor:'not-allowed' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p style={LBL_F}>Fuseau horaire</p>
            <input value={tz} onChange={e=>setTz(e.target.value)} placeholder="Europe/Brussels" style={INP_F} />
          </div>
          <div>
            <p style={LBL_F}>Format de date</p>
            <select value={df} onChange={e=>setDf(e.target.value)} style={INP_F}>
              <option>JJ/MM/AAAA</option><option>MM/JJ/AAAA</option><option>AAAA-MM-JJ</option>
            </select>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8 }}>
          <button onClick={save} disabled={saving} className="nb-press" style={{ background:'var(--accent-budget)', color:'var(--chocolate)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:'10px 24px', fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
          {msg && <span style={{ fontSize:12, color: msg.startsWith('✅') ? 'var(--azul)' : 'var(--accent-budget)' }}>{msg}</span>}
        </div>
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

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="nb-press" role="switch" aria-checked={on}
      style={{ width:46, height:26, borderRadius:99, background: on ? 'var(--azul)' : 'var(--bg-input)', border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s' }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background: on ? 'var(--creamy-ivory)' : 'var(--text-muted)', position:'absolute', top:3, left: on ? 24 : 3, transition:'left 0.2s' }} />
    </button>
  )
}

function NotifsTab() {
  const [prefs, setPrefs] = useState<NotifPrefs>({})
  const [perm, setPerm]   = useState<string>('default')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPrefs(loadNotifPrefs())
    if (typeof Notification !== 'undefined') setPerm(Notification.permission)
    setHydrated(true)
  }, [])

  function toggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)            // autosave immédiat (best practice toggles)
    saveNotifPrefs(next)
  }

  async function enableBrowser() {
    if (typeof Notification === 'undefined') return
    const r = await Notification.requestPermission()
    setPerm(r)
    if (r === 'granted') new Notification('NYSA', { body: 'Notifications activées ✅' })
  }

  if (!hydrated) return null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Permission navigateur */}
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <p style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>Notifications du navigateur</p>
          <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
            {perm === 'granted' ? 'Autorisées ✅' : perm === 'denied' ? 'Bloquées dans le navigateur' : 'Non activées'}
          </p>
        </div>
        {perm !== 'granted' && (
          <button onClick={enableBrowser} className="nb-press" disabled={perm === 'denied'}
            style={{ background: perm==='denied' ? 'var(--bg-input)' : 'var(--accent-budget)', color: perm==='denied' ? 'var(--text-muted)' : 'var(--chocolate)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', padding:'8px 16px', fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, cursor: perm==='denied' ? 'not-allowed' : 'pointer' }}>
            Activer
          </button>
        )}
      </div>

      {/* Préférences (sauvegarde immédiate) */}
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:'8px 24px 16px' }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', margin:'14px 0 4px' }}>Préférences</p>
        {NOTIF_DEFS.map(n => (
          <div key={n.key} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize:13, color:'var(--text)' }}>{n.label}</p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{n.desc}</p>
            </div>
            <Toggle on={!!prefs[n.key]} onClick={() => toggle(n.key)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function DonneesTab() {
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delInput, setDelInput] = useState('')

  useEffect(() => {
    setDemoEnabled(isDemoModeEnabled())
    setHydrated(true)
  }, [])

  function handleToggleDemo() {
    toggleDemoMode()
    setDemoEnabled(!demoEnabled)
  }

  async function runExport(kind: 'json' | 'tasks' | 'finances') {
    setBusy(kind); setMsg(null)
    try {
      if (kind === 'json') await exportAllJson()
      else if (kind === 'tasks') await exportTasksCsv()
      else await exportFinancesCsv()
      setMsg('✅ Export téléchargé')
    } catch { setMsg('❌ Échec de l\'export') }
    finally { setBusy(null); setTimeout(() => setMsg(null), 3000) }
  }

  async function runDelete() {
    if (delInput !== 'SUPPRIMER') return
    setBusy('delete'); setMsg(null)
    try { await deleteAllData(); setMsg('✅ Données supprimées'); setConfirmDel(false); setDelInput('') }
    catch { setMsg('❌ Échec de la suppression') }
    finally { setBusy(null); setTimeout(() => setMsg(null), 4000) }
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

      {/* Export actions (fonctionnels) */}
      {([
        { label:'Exporter toutes les données', desc:'Export JSON complet', action:'json'    as const, btn:'Exporter' },
        { label:'Exporter les tâches',         desc:'Format CSV',          action:'tasks'   as const, btn:'Exporter' },
        { label:'Exporter les finances',       desc:'Format CSV (Excel)',  action:'finances'as const, btn:'Exporter' },
      ]).map(a => (
        <div key={a.label} className="flex items-center justify-between py-3" style={{ borderBottom:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text)' }}>{a.label}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.desc}</p>
          </div>
          <button onClick={() => runExport(a.action)} disabled={busy===a.action} className="nb-press"
            style={{ fontSize:11, color:'var(--azul)', fontFamily:'var(--font-display)', fontWeight:800, padding:'6px 14px', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', background:'var(--bg-card)', cursor: busy===a.action ? 'default':'pointer', opacity: busy===a.action ? 0.6:1 }}>
            {busy===a.action ? '…' : a.btn}
          </button>
        </div>
      ))}

      {/* Zone dangereuse (en bas, avec confirmation) */}
      <div style={{ marginTop:18, padding:'14px 16px', borderRadius:'var(--radius-lg)', border:'2px solid var(--accent-budget)', background:'rgba(242,84,45,0.06)' }}>
        <p style={{ fontSize:12, color:'var(--accent-budget)', ...({fontFamily:'var(--font-display)'} as React.CSSProperties), fontWeight:800 }}>Zone dangereuse</p>
        <div className="flex items-center justify-between" style={{ marginTop:8, gap:12, flexWrap:'wrap' }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', flex:1, minWidth:180 }}>Supprimer toutes tes données (tâches, finances, runs, recettes, courses…). Irréversible.</p>
          {!confirmDel ? (
            <button onClick={()=>setConfirmDel(true)} className="nb-press"
              style={{ fontSize:11, color:'var(--accent-budget)', fontFamily:'var(--font-display)', fontWeight:800, padding:'6px 14px', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', background:'var(--bg-card)', cursor:'pointer' }}>
              Tout supprimer
            </button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder="SUPPRIMER" autoFocus
                style={{ width:120, background:'var(--bg-input)', border:'2px solid var(--ink)', borderRadius:8, padding:'6px 10px', color:'var(--text)', fontSize:12 }} />
              <button disabled={delInput!=='SUPPRIMER' || busy==='delete'} onClick={runDelete} className="nb-press"
                style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:800, padding:'6px 12px', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', background: delInput==='SUPPRIMER' ? 'var(--accent-budget)':'var(--bg-input)', color: delInput==='SUPPRIMER' ? 'var(--chocolate)':'var(--text-muted)', cursor: delInput==='SUPPRIMER' ? 'pointer':'not-allowed' }}>
                {busy==='delete' ? '…' : 'Confirmer'}
              </button>
              <button onClick={()=>{setConfirmDel(false);setDelInput('')}} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>Annuler</button>
            </div>
          )}
        </div>
      </div>
      {msg && <p style={{ fontSize:12, marginTop:10, color: msg.startsWith('✅') ? 'var(--azul)':'var(--accent-budget)' }}>{msg}</p>}
    </div>
  )
}

function RaccourcisTab() {
  const shortcuts = [
    { keys:'⌘ K', action:'Palette de commandes' },
    { keys:'G H', action:'Accueil' },
    { keys:'G C', action:'Calendrier' },
    { keys:'G T', action:'Time Tracker' },
    { keys:'G P', action:'Projets' },
    { keys:'G D', action:'To-Do' },
    { keys:'G U', action:'Running' },
    { keys:'G E', action:'Health' },
    { keys:'G R', action:'Recettes' },
    { keys:'G O', action:'Courses' },
    { keys:'G B', action:'Budget' },
    { keys:'G A', action:'Agent IA' },
    { keys:'G S', action:'Réglages' },
  ]
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:24 }}>
      <p style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:800, letterSpacing:'0.15em', color:'var(--accent-budget)', textTransform:'uppercase', marginBottom:8 }}>Raccourcis clavier</p>
      <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>Ouvre la palette avec ⌘K (ou Ctrl+K), ou tape « G » puis la touche pour naviguer.</p>
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
          { label:'Framework', value:'Next.js 16' },
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
