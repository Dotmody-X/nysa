'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings, Bell, Palette, Lock, Keyboard, Download,
  ChevronRight, Flame, Star, TrendingUp, Activity,
  CheckSquare, Wallet, Clock, Utensils, Zap, Shield,
  ExternalLink, AlertTriangle, X, Check, User,
} from '@/components/ui/icons'
import { PageTitle, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/hooks/useDashboard'
import { useRapports } from '@/hooks/useRapports'
import { saveTheme, loadTheme, type ThemeMode } from '@/lib/theme'
import { setActiveUser } from '@/lib/userStore'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)', TEAL_BG = 'var(--azul)', ORANGE = 'var(--accent-brand)', WHEAT = 'var(--text)'

function fmtH(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`
}
/** Fond de carte — le contour et l'ombre viennent de la classe `nb-card`. */
function card(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return { background: bg, overflow: 'hidden', ...extra }
}

/* Encres des surfaces d'accent (cobalt = foncé, tangerine = clair) */
const INK_LIGHT_VARS = {
  '--text-rgb': '255, 255, 255', '--text': 'var(--ink-light)', '--text-muted': 'rgba(255, 255, 255, 0.72)',
} as React.CSSProperties
const INK_DARK_VARS = {
  '--text-rgb': '17, 17, 17', '--text': 'var(--ink-dark)', '--text-muted': 'rgba(17, 17, 17, 0.65)',
} as React.CSSProperties

/* Champs de formulaire — label au-dessus, saisie lisible (≥ 13px) */
const FIELD_LABEL: React.CSSProperties = {
  ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: 5,
}
const FIELD_INPUT: React.CSSProperties = {
  width: '100%', minHeight: 40, background: 'var(--bg-input)', border: '2px solid var(--ink)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13,
}

// ─── XP / Level ──────────────────────────────────────────────────────────────
function computeLevel(tasksDone: number, totalSec: number) {
  const xp      = tasksDone * 10 + Math.floor(totalSec / 3600) * 4
  const perLevel = 500
  const level   = Math.floor(xp / perLevel) + 1
  const xpInLvl = xp % perLevel
  const pct     = Math.round((xpInLvl / perLevel) * 100)
  const names   = ['Débutant','Actif','Régulier','Productif','Expert','Maître']
  const name    = names[Math.min(level - 1, names.length - 1)]
  return { xp, level, xpInLvl, perLevel, pct, name }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ComptePage() {
  const router   = useRouter()
  const { data: dash }            = useDashboard()
  const { data: yearly, loading: rLoading } = useRapports('year', new Date())

  // auth
  const [email,    setEmail]    = useState('')
  const [uid,      setUid]      = useState('')
  const [memberSince, setMemberSince] = useState('')

  // profile fields (from user_metadata)
  const [displayName, setDisplayName] = useState('NYSA')
  const [quote,       setQuote]       = useState('')
  const [timezone,    setTimezone]    = useState('Europe/Paris (UTC+1)')
  const [language,    setLanguage]    = useState('Français')
  const [theme,       setThemeState]  = useState<ThemeMode>('dark')
  const [editMode,    setEditMode]    = useState(false)
  const [saveMsg,     setSaveMsg]     = useState<string|null>(null)

  // password change
  const [showPwd,   setShowPwd]   = useState(false)
  const [newPwd,    setNewPwd]    = useState('')
  const [pwdMsg,    setPwdMsg]    = useState<string|null>(null)

  // delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  // integration modal
  const [activeIntegration, setActiveIntegration] = useState<string|null>(null)

  // streak
  const [streak, setStreak] = useState(0)
  const [streakDays, setStreakDays] = useState<boolean[]>([])

  // activity feed
  const [recentActivity, setRecentActivity] = useState<Array<{icon:string;label:string;sub:string;color:string}>>([])

  // period for résumé
  const [period, setPeriod] = useState<'week'|'month'>('week')
  const { data: periodData } = useRapports(period, new Date())

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      setUid(data.user.id)
      const meta = data.user.user_metadata ?? {}
      setDisplayName(meta.display_name ?? 'NYSA')
      setQuote(meta.quote ?? '')
      setTimezone(meta.timezone ?? 'Europe/Paris (UTC+1)')
      setLanguage(meta.language ?? 'Français')
      const created = data.user.created_at
      if (created) setMemberSince(new Date(created).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }))
    })
    const t = (typeof window !== 'undefined' ? localStorage.getItem('nysa-theme') : null) as ThemeMode ?? 'dark'
    setThemeState(t)
  }, [])

  // ── Streak ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from('time_entries')
        .select('started_at')
        .order('started_at', { ascending: false })
        .limit(200)
      if (!data) return
      const days = new Set(data.map(e => e.started_at.slice(0,10)))
      const today = new Date()
      const dots: boolean[] = []
      let s = 0
      for (let i = 0; i < 14; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0,10)
        const active = days.has(key)
        dots.unshift(active)
        if (i === 0 || s > 0) { if (active) s++; else if (i > 0) break }
      }
      setStreak(s)
      setStreakDays(dots)
    })()
  }, [uid])

  // ── Recent activity feed ───────────────────────────────────────────────────
  useEffect(() => {
    const feed: Array<{icon:string;label:string;sub:string;color:string}> = []
    if (dash?.todayTasks?.filter(t=>t.status==='done')[0]) {
      const t = dash.todayTasks.find(t=>t.status==='done')!
      feed.push({ icon:'✅', label:`Tâche "${t.title.slice(0,30)}" terminée`, sub:"Aujourd'hui", color: ORANGE })
    }
    if (dash?.activeProjects?.[0]) feed.push({ icon:'📁', label:`Projet "${dash.activeProjects[0].name}"`, sub:'Actif', color: '#9B72CF' })
    setRecentActivity(feed)
  }, [dash, yearly])

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveProfile = useCallback(async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName, quote, timezone, language },
    })
    setSaveMsg(error ? '❌ ' + error.message : '✅ Profil mis à jour')
    setEditMode(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }, [displayName, quote, timezone, language])

  // ── Change password ────────────────────────────────────────────────────────
  const changePassword = useCallback(async () => {
    if (newPwd.length < 6) { setPwdMsg('❌ Minimum 6 caractères'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdMsg(error ? '❌ ' + error.message : '✅ Mot de passe mis à jour')
    setNewPwd('')
    setTimeout(() => { setPwdMsg(null); setShowPwd(false) }, 3000)
  }, [newPwd])

  // ── Apply theme ────────────────────────────────────────────────────────────
  function applyTheme(t: ThemeMode) { setThemeState(t); saveTheme(t) }

  // ── Export data ────────────────────────────────────────────────────────────
  async function exportData() {
    const supabase = createClient()
    const [tasks, entries, projets] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('time_entries').select('*'),
      supabase.from('projects').select('*'),
    ])
    const blob = new Blob([JSON.stringify({ tasks: tasks.data, time_entries: entries.data, projects: projets.data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `nysa-export-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function handleLogout() {
    const supabase = createClient()
    setActiveUser(null)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function deleteAccount() {
    if (deleteInput !== 'SUPPRIMER') return
    const supabase = createClient()
    // Delete user data
    await Promise.all([
      supabase.from('tasks').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('time_entries').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('transactions').delete().neq('id','00000000-0000-0000-0000-000000000000'),
    ])
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const totalSec     = yearly?.totalSeconds ?? 0
  const tasksDone    = yearly?.tasksDone ?? 0
  const lvl          = computeLevel(tasksDone, totalSec)

  const days         = period === 'week' ? 7 : 30
  const hrs          = periodData ? periodData.totalSeconds / 3600 : 0
  const target       = days * 4 // 4h/day target
  const scoreProductivite = Math.min(100, Math.round((hrs / target) * 100))

  const badges = [
    { icon:'🔥', label:'Régularité',    sub:'7 jours consécutifs',         unlocked: streak >= 7,        color: ORANGE },
    { icon:'⭐', label:'Productivité',  sub:'100 tâches accomplies',       unlocked: tasksDone >= 100,   color: '#E8A838' },
    { icon:'📊', label:'Équilibre',     sub:'Tracker 4 domaines',          unlocked: true,               color: '#9B72CF' },
  ]

  const integrations = [
    { name:'Google Calendar', icon:'📅', connected: false },
    { name:'Apple Health',    icon:'❤️', connected: false },
    { name:'Strava',          icon:'🏃', connected: !!(typeof window!=='undefined' && localStorage.getItem('strava_connected')) },
    { name:'Google Drive',    icon:'💾', connected: false },
    { name:'Notion',          icon:'📝', connected: false },
  ]

  const prefItems = [
    { icon: Settings,  label:'Général',          sub:'Paramètres généraux du compte',  href:'/compte/general' },
    { icon: Bell,      label:'Notifications',    sub:'Gérer vos notifications',         href:'/compte/notifications' },
    { icon: Palette,   label:'Apparence',        sub:'Thème, couleurs, affichage',      href:'/reglages' },
    { icon: Lock,      label:'Confidentialité',  sub:'Données et confidentialité',      href:'/compte/confidentialite' },
    { icon: Keyboard,  label:'Raccourcis',       sub:'Gérer vos raccourcis clavier',    href:'/compte/raccourcis' },
    { icon: Download,  label:'Sauvegarde',       sub:'Exporter ou importer vos données',href:'/compte/sauvegarde' },
  ]

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>

      {/* ── Delete modal ── */}
      {showDelete && (
        <>
          <div onClick={()=>setShowDelete(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, backdropFilter:'blur(4px)' }} />
          <div className="nb-card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201, background:'var(--bg-card)', borderRadius:'var(--radius-xl)', padding:28, width:'calc(100% - 32px)', maxWidth:400 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <AlertTriangle size={20} style={{ color: ORANGE }} />
              <p style={{ ...DF, fontWeight:800, fontSize:15, color:'var(--text)' }}>Supprimer mon compte</p>
              <button onClick={()=>setShowDelete(false)} className="nb-press" title="Fermer"
                style={{ marginLeft:'auto', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, lineHeight:1.6 }}>
              Cette action est <strong style={{color:ORANGE}}>irréversible</strong>. Toutes vos données seront supprimées. Tapez <strong>SUPPRIMER</strong> pour confirmer.
            </p>
            <input value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} placeholder="SUPPRIMER"
              style={{ ...FIELD_INPUT, marginBottom:12 }} />
            <button disabled={deleteInput !== 'SUPPRIMER'} onClick={deleteAccount} className="nb-press"
              style={{ width:'100%', background: deleteInput==='SUPPRIMER' ? ORANGE : 'var(--bg-input)', color: deleteInput==='SUPPRIMER' ? 'var(--ink-dark)' : 'var(--text-muted)', borderRadius:'var(--radius-lg)', padding:'10px 16px', ...DF, fontWeight:700, fontSize:12, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor: deleteInput==='SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
              Supprimer définitivement
            </button>
          </div>
        </>
      )}

      {/* ── Integration modal ── */}
      {activeIntegration && (() => {
        const app = integrations.find(a => a.name === activeIntegration)!
        const steps: Record<string, { title:string; desc:string; action?:string; actionLabel?:string; href?:string }> = {
          'Strava':           { title:'Connecter Strava', desc:'Importez automatiquement vos activités running depuis Strava. Une fois connecté, vos courses apparaîtront dans le module Running.', action:'oauth', actionLabel:'Autoriser Strava', href:'/api/strava/auth' },
          'Google Calendar':  { title:'Google Calendar', desc:'La synchronisation Google Calendar sera disponible dans une prochaine mise à jour. Utilisez Apple Calendar (CalDAV) pour synchroniser dès maintenant.', action:'soon' },
          'Apple Health':     { title:'Apple Health', desc:'La synchronisation Apple Health sera disponible dans une prochaine mise à jour via HealthKit.', action:'soon' },
          'Google Drive':     { title:'Google Drive', desc:'La synchronisation Google Drive sera disponible dans une prochaine mise à jour. Vos fichiers pourront être joints aux projets et recettes.', action:'soon' },
          'Notion':           { title:'Notion', desc:'L\'intégration Notion sera disponible dans une prochaine mise à jour. Vous pourrez synchroniser vos bases de données Notion avec les tâches NYSA.', action:'soon' },
        }
        const info = steps[activeIntegration] ?? { title: activeIntegration, desc:'Intégration disponible prochainement.', action:'soon' }
        return (
          <>
            <div onClick={()=>setActiveIntegration(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:200, backdropFilter:'blur(4px)' }} />
            <div className="nb-card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201, background:'var(--bg-card)', borderRadius:'var(--radius-xl)', padding:28, width:'calc(100% - 32px)', maxWidth:380 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:28 }}>{app.icon}</span>
                  <div>
                    <p style={{ ...DF, fontWeight:800, fontSize:15, color:'var(--text)' }}>{info.title}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: app.connected ? TEAL : 'var(--text-subtle)' }} />
                      <span style={{ fontSize:10, color: app.connected ? TEAL : 'var(--text-muted)' }}>{app.connected ? 'Connecté' : 'Non connecté'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={()=>setActiveIntegration(null)} className="nb-press" title="Fermer"
                  style={{ width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16}/></button>
              </div>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7, marginBottom:20 }}>{info.desc}</p>
              {info.action === 'oauth' && !app.connected && (
                <a href={info.href} className="nb-press" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:ORANGE, color:'var(--ink-dark)', borderRadius:'var(--radius-lg)', padding:'10px 0', ...DF, fontWeight:800, fontSize:12, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor:'pointer', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  {info.actionLabel}
                </a>
              )}
              {info.action === 'oauth' && app.connected && (
                <button className="nb-press" style={{ width:'100%', background:'var(--bg-card)', color:ORANGE, borderRadius:'var(--radius-lg)', padding:'10px 0', ...DF, fontWeight:700, fontSize:12, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor:'pointer' }}>
                  Déconnecter
                </button>
              )}
              {info.action === 'soon' && (
                <div style={{ padding:'12px 16px', borderRadius:'var(--radius-lg)', background:'rgba(14,149,148,0.08)', border:'2px solid var(--ink)', textAlign:'center' }}>
                  <span style={{ fontSize:11, color: TEAL, ...DF, fontWeight:700 }}>Prochainement disponible</span>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <PageTitle
        title="Mon profil"
        sub="Votre espace · Vos données · Vos objectifs"
        accent={ORANGE}
        icon={User}
        iconInk="var(--ink-dark)"
        right={
          /* NIVEAU card */
          <div className="nb-card sticker-r" style={{ ...card(ORANGE), padding:'14px 18px', minWidth:260, flexShrink:0, ...INK_DARK_VARS } as React.CSSProperties}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <p style={{ ...DF, fontSize:10, fontWeight:800, letterSpacing:'0.14em', color:'var(--ink-dark)', textTransform:'uppercase' }}>Niveau</p>
              <ChevronRight size={14} style={{ color:'rgba(26,10,10,0.5)' }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <p style={{ ...DF, fontWeight:900, fontSize:18, color:'var(--ink-dark)', lineHeight:1 }}>{lvl.name}</p>
                <p style={{ fontSize:11, color:'rgba(26,10,10,0.7)', marginTop:2 }}>Niveau {lvl.level}</p>
                <div style={{ marginTop:8, height:4, borderRadius:99, background:'rgba(26,10,10,0.2)', width:140, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:'var(--ink-dark)', width:`${lvl.pct}%` }} />
                </div>
                <p style={{ fontSize:10, color:'rgba(26,10,10,0.6)', marginTop:4 }}>{lvl.xpInLvl} / {lvl.perLevel} XP</p>
              </div>
              <div style={{ width:56, height:56, borderRadius:'50%', border:'3px solid var(--ink-dark)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ ...DF, fontWeight:900, fontSize:16, color:'var(--ink-dark)' }}>{lvl.pct}%</span>
              </div>
            </div>
            <p style={{ fontSize:9, color:'rgba(26,10,10,0.6)', marginTop:6 }}>Vers niveau {lvl.level + 1}</p>
          </div>
        }
      />

      {/* ══ ROW 1 : Profil + Stats ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap:10 }}>

        {/* Profil card */}
        <div className="nb-card" style={{ ...card('var(--bg-card)'), padding:22, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div className="nb-tile sticker-l" style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg,${ORANGE},${TEAL})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ ...DF, fontWeight:900, fontSize:32, color:'var(--ink-light)' }}>{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {editMode ? (
                <input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoFocus
                  style={{ width:'100%', background:'var(--bg-input)', border:'2px solid var(--ink)', borderRadius:8, padding:'6px 10px', color:'var(--text)', fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:4 }} />
              ) : (
                <p style={{ ...DF, fontWeight:900, fontSize:20, color:WHEAT, marginBottom:2 }}>{displayName}</p>
              )}
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{email}</p>
              {editMode ? (
                <input value={quote} onChange={e=>setQuote(e.target.value)} placeholder='"Votre devise personnelle..."'
                  style={{ width:'100%', background:'var(--bg-input)', border:'2px solid var(--ink)', borderRadius:8, padding:'6px 10px', color:'var(--text)', fontSize:11, marginTop:6 }} />
              ) : quote ? (
                <p style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:4 }}>"{quote}"</p>
              ) : null}
            </div>
            <div style={{ flexShrink:0 }}>
              <StickerButton onClick={()=>editMode ? saveProfile() : setEditMode(true)}
                accent={editMode ? TEAL : 'var(--bg-input)'} ink={editMode ? 'var(--ink-light)' : 'var(--text)'}
                title={editMode ? 'Enregistrer le profil' : 'Modifier le profil'}>
                {editMode ? 'Enregistrer' : 'Modifier le profil'}
              </StickerButton>
            </div>
          </div>

          {saveMsg && <p style={{ fontSize:11, color: saveMsg.startsWith('✅') ? TEAL : ORANGE }}>{saveMsg}</p>}

          <div style={{ display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid var(--border)', paddingTop:14 }}>
            {[
              { label:'Membre depuis', value: memberSince || '2026' },
              { label:'Fuseau horaire', value: timezone, edit: editMode, onChange: (v:string)=>setTimezone(v) },
              { label:'Langue', value: language, edit: editMode, options:['Français','English','Español'], onChange: (v:string)=>setLanguage(v) },
              { label:'Thème', value: theme === 'dark' ? 'Sombre' : theme === 'light' ? 'Clair' : 'Système' },
            ].map(r => (
              r.edit ? (
                /* Champ éditable — label au-dessus, saisie ≥ 13px */
                <div key={r.label}>
                  <p style={FIELD_LABEL}>{r.label}</p>
                  {r.options ? (
                    <select value={r.value} onChange={e=>r.onChange!(e.target.value)} style={FIELD_INPUT}>
                      {r.options.map(o=><option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={r.value} onChange={e=>r.onChange!(e.target.value)} style={FIELD_INPUT} />
                  )}
                </div>
              ) : (
                <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)', minWidth:110 }}>{r.label}</p>
                  <p style={{ fontSize:12, color:'var(--text)', fontWeight:600 }}>{r.value}</p>
                </div>
              )
            ))}
            {/* Theme toggle */}
            {!editMode && (
              <div className="toolbar-scroll" style={{ display:'flex', gap:6, marginTop:4 }}>
                {(['dark','light','system'] as ThemeMode[]).map(t => (
                  <button key={t} onClick={()=>applyTheme(t)} className="nb-press"
                    style={{ flex:1, minHeight:40, padding:'8px 12px', borderRadius:7, border:'2px solid var(--ink)', boxShadow: theme===t ? '3px 3px 0 var(--ink)' : 'none', background: theme===t ? ORANGE : 'var(--bg-input)', color: theme===t ? 'var(--ink-dark)' : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:10, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    {t === 'dark' ? 'Sombre' : t === 'light' ? 'Clair' : 'Système'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats globales */}
        <SectionCard title="Vos statistiques globales" num="01" accent={ORANGE}
          titleColor="var(--ink-light)" bg={TEAL_BG}
          style={{ ...INK_LIGHT_VARS } as React.CSSProperties}>
          <div style={{ padding:22 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { icon: Clock,       label:'Temps total tracké',   value: fmtH(totalSec) },
              { icon: CheckSquare, label:'Tâches accomplies',    value: String(tasksDone) },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <Icon size={13} style={{ color:'rgba(var(--text-rgb),0.6)' }} />
                    <p style={{ fontSize:9, color:'rgba(var(--text-rgb),0.6)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{s.label}</p>
                  </div>
                  <p style={{ ...DF, fontWeight:900, fontSize:22, color:WHEAT, lineHeight:1 }}>{s.value}</p>
                </div>
              )
            })}
          </div>
          <button onClick={()=>router.push('/rapports')} className="nb-press"
            style={{ marginTop:16, minHeight:40, display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:'rgba(var(--text-rgb),0.7)', textTransform:'uppercase', letterSpacing:'0.1em', padding:0 }}>
            Voir tous les rapports <ChevronRight size={12} />
          </button>
          </div>
        </SectionCard>
      </div>

      {/* ══ ROW 2 : Succès + Résumé activité ════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap:10 }}>

        {/* Succès */}
        <SectionCard title="Vos succès" num="02" accent={ORANGE}
          action={
            <button className="nb-press"
              style={{ fontSize:10, color:TEAL, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, minHeight:40, padding:'0 4px' }}>
              Voir tous
            </button>
          }>
          <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {badges.map(b => (
              <div key={b.label} style={{ padding:'14px 12px', borderRadius:10, background: b.unlocked ? `color-mix(in srgb, ${b.color} 12%, transparent)` : 'var(--bg-input)', border:'2px solid var(--ink)', boxShadow: b.unlocked ? '3px 3px 0 var(--ink)' : 'none', opacity: b.unlocked ? 1 : 0.4, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div style={{ width:44, height:44, borderRadius:10, background: b.unlocked ? b.color : 'var(--border)', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {b.icon}
                </div>
                <p style={{ ...DF, fontSize:10, fontWeight:800, color: b.unlocked ? b.color : 'var(--text-muted)', textAlign:'center' }}>{b.label}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', textAlign:'center', lineHeight:1.4 }}>{b.sub}</p>
                {b.unlocked && <Check size={12} style={{ color: b.color }} />}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Résumé activité */}
        <SectionCard title="Résumé de votre activité" num="03" accent={ORANGE}
          style={{ display:'flex', flexDirection:'column' }}
          action={
            <div className="toolbar-scroll" style={{ display:'flex', gap:4 }}>
              {(['week','month'] as const).map(p => (
                <button key={p} onClick={()=>setPeriod(p)} className="nb-press"
                  style={{ minHeight:40, padding:'8px 12px', borderRadius:6, border:'2px solid var(--ink)', boxShadow: period===p ? '2px 2px 0 var(--ink)' : 'none', background: period===p ? ORANGE : 'var(--bg-input)', color: period===p ? 'var(--ink-dark)' : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:10, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {p==='week' ? 'Cette semaine' : 'Ce mois'}
                </button>
              ))}
            </div>
          }>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12, flex:1 }}>
          {[
            { label:'Productivité', value: scoreProductivite, color: TEAL },
            { label:'Régularité',   value: Math.min(100, streak * 10), color: ORANGE },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <p style={{ fontSize:12, color:'var(--text)' }}>{s.label}</p>
                <p style={{ ...DF, fontSize:12, fontWeight:700, color: s.color }}>{s.value}%</p>
              </div>
              <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background: s.color, width:`${s.value}%`, transition:'width 0.6s ease' }} />
              </div>
            </div>
          ))}
          {scoreProductivite >= 70 && (
            <div style={{ padding:'10px 14px', borderRadius:'var(--radius-lg)', background:'rgba(14,149,148,0.1)', border:'2px solid var(--ink)', display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
              <Zap size={14} style={{ color: TEAL, flexShrink:0 }} />
              <p style={{ fontSize:11, color:WHEAT, lineHeight:1.4 }}>Vous êtes plus productif le matin — vos pics d'activité sont entre 9h et 11h.</p>
            </div>
          )}
          <button onClick={()=>router.push('/rapports')} className="nb-press"
            style={{ display:'flex', alignItems:'center', gap:4, minHeight:40, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', padding:0, marginTop:'auto' }}>
            Voir l'analyse complète <ChevronRight size={12} />
          </button>
          </div>
        </SectionCard>
      </div>

      {/* ══ ROW 3 : Série + Préférences + Apps ══════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap:10 }}>

        {/* Série actuelle */}
        <SectionCard title="Série actuelle" num="04" accent={ORANGE}>
          <div style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <span style={{ fontSize:28 }}>🔥</span>
            <div>
              <p style={{ ...DF, fontWeight:900, fontSize:28, color:ORANGE, lineHeight:1 }}>{streak} jours</p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Continuez comme ça !</p>
            </div>
          </div>
          {streakDays.length === 0 ? (
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune activité suivie pour l&apos;instant</p>
          ) : (
            <>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {streakDays.map((active, i) => (
                  <div key={i} style={{ width:20, height:20, borderRadius:5, background: active ? ORANGE : 'var(--bg-input)', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {active && <Check size={10} style={{ color:'var(--ink-dark)' }} />}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <p style={{ fontSize:8, color:'var(--text-subtle)' }}>Lun</p>
                <p style={{ fontSize:8, color:'var(--text-subtle)' }}>Dim</p>
              </div>
            </>
          )}
          </div>
        </SectionCard>

        {/* Préférences */}
        <SectionCard title="Préférences" num="05" accent={ORANGE}>
          {prefItems.map(({ icon: Icon, label, sub, href }) => (
            <button key={label} onClick={()=>router.push(href)}
              style={{ width:'100%', minHeight:48, display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-card-hover)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={14} style={{ color:'var(--text-muted)' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{label}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>{sub}</p>
              </div>
              <ChevronRight size={12} style={{ color:'var(--text-subtle)', flexShrink:0 }} />
            </button>
          ))}
        </SectionCard>

        {/* Applications connectées */}
        <SectionCard title="Applications connectées" num="06" accent={ORANGE}>
          {integrations.map(app => (
            <button key={app.name} onClick={()=>setActiveIntegration(app.name)}
              style={{ width:'100%', minHeight:44, display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-card-hover)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <span style={{ fontSize:18, flexShrink:0 }}>{app.icon}</span>
              <p style={{ flex:1, fontSize:12, color:'var(--text)' }}>{app.name}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, color: app.connected ? TEAL : 'var(--text-subtle)', ...DF, fontWeight:600 }}>{app.connected ? 'Connecté' : 'Non connecté'}</span>
                <div style={{ width:7, height:7, borderRadius:'50%', background: app.connected ? TEAL : 'var(--text-subtle)', flexShrink:0 }} />
              </div>
            </button>
          ))}
          <button onClick={()=>router.push('/reglages')} className="nb-press"
            style={{ width:'100%', minHeight:44, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:TEAL, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Gérer les intégrations <ExternalLink size={10} />
          </button>
        </SectionCard>
      </div>

      {/* ══ ROW 4 : Activité récente (full) ════════════════════════════════ */}
      <SectionCard title="Activité récente" num="07" accent={ORANGE}
        action={<p style={{ fontSize:10, color:'var(--text-muted)', ...DF, fontWeight:600 }}>Voir tout</p>}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
          {recentActivity.length === 0 ? (
            <p style={{ fontSize:12, color:'var(--text-muted)', padding:'16px 20px', gridColumn:'1/-1' }}>Aucune activité récente</p>
          ) : recentActivity.slice(0,6).map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--border)', borderRight: i%3!==2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{a.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.label}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ══ ROW 5 : Paramètres + Abonnement ════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr]" style={{ gap:10 }}>

        {/* Paramètres du compte */}
        <SectionCard title="Paramètres du compte" num="08" accent={ORANGE}>
          <div style={{ padding:22 }}>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap:14 }}>
            {[
              { label:'Nom',         value:displayName, setter:setDisplayName, type:'text' },
              { label:'Email',       value:email,       setter:setEmail,       type:'email', readOnly:true },
            ].map(f => (
              <div key={f.label}>
                <p style={FIELD_LABEL}>{f.label}</p>
                <input value={f.value} onChange={e=>!f.readOnly && f.setter(e.target.value)} readOnly={f.readOnly}
                  style={{ ...FIELD_INPUT, color: f.readOnly ? 'var(--text-muted)' : 'var(--text)', cursor: f.readOnly ? 'not-allowed' : 'text' }} />
              </div>
            ))}

            <div>
              <p style={FIELD_LABEL}>Mot de passe</p>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {showPwd ? (
                  <>
                    <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" autoFocus
                      style={{ ...FIELD_INPUT, flex:1 }} />
                    <button onClick={changePassword} className="nb-press" style={{ background:TEAL, color:'var(--ink-light)', borderRadius:'var(--radius-lg)', minHeight:40, padding:'7px 14px', ...DF, fontWeight:700, fontSize:12, border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', cursor:'pointer' }}>OK</button>
                    <button onClick={()=>{setShowPwd(false);setNewPwd('')}} className="nb-press" title="Annuler" style={{ background:'var(--bg-card)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', borderRadius:'var(--radius-lg)', minHeight:40, padding:'7px 12px', color:'var(--text)', cursor:'pointer' }}><X size={12}/></button>
                  </>
                ) : (
                  <>
                    <input type="password" value="••••••••••" readOnly style={{ ...FIELD_INPUT, flex:1, color:'var(--text-muted)', cursor:'not-allowed' }} />
                    <button onClick={()=>setShowPwd(true)} className="nb-press" style={{ background:'var(--bg-card)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', borderRadius:'var(--radius-lg)', minHeight:40, padding:'7px 14px', color:ORANGE, ...DF, fontWeight:800, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>Changer</button>
                  </>
                )}
              </div>
              {pwdMsg && <p style={{ fontSize:12, marginTop:6, color: pwdMsg.startsWith('✅') ? TEAL : ORANGE }}>{pwdMsg}</p>}
            </div>

            <div>
              <p style={FIELD_LABEL}>Fuseau horaire</p>
              <input value={timezone} onChange={e=>setTimezone(e.target.value)} style={FIELD_INPUT} />
            </div>

            <div>
              <p style={FIELD_LABEL}>Devise</p>
              <select defaultValue="EUR" style={FIELD_INPUT}>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GBP">Livre (£)</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <StickerButton onClick={saveProfile} accent={ORANGE} tilt="l">
              <Check size={14} /> Enregistrer les modifications
            </StickerButton>
          </div>
          </div>
        </SectionCard>

        {/* Abonnement + Export + Supprimer */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <SectionCard title="Abonnement" num="09" accent={ORANGE}
            titleColor="var(--ink-light)" bg={TEAL_BG}
            style={{ flex:1, ...INK_LIGHT_VARS } as React.CSSProperties}
            action={<span style={{ padding:'3px 8px', borderRadius:99, background:'rgba(14,149,148,0.3)', color:WHEAT, fontSize:9, ...DF, fontWeight:700 }}>Actif</span>}>
            <div style={{ padding:20 }}>
              <p style={{ ...DF, fontWeight:900, fontSize:18, color:WHEAT, marginBottom:4 }}>Plan Personnel</p>
              <p style={{ fontSize:10, color:'rgba(var(--text-rgb),0.6)', marginBottom:12 }}>Prochain renouvellement — 12 juin 2025</p>
              {['Toutes les fonctionnalités incluses','Accès à l\'agent IA','Intégrations illimitées'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <Check size={11} style={{ color:WHEAT, flexShrink:0 }} />
                  <p style={{ fontSize:11, color:'rgba(var(--text-rgb),0.8)' }}>{f}</p>
                </div>
              ))}
              <button className="nb-press" style={{ marginTop:12, width:'100%', minHeight:40, background:'var(--ink-light)', color:'var(--ink-dark)', borderRadius:'var(--radius-lg)', padding:'8px 0', ...DF, fontWeight:800, fontSize:10, border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Gérer mon abonnement <ChevronRight size={10} style={{ display:'inline' }}/>
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Exporter mes données" num="10" accent={ORANGE}>
            <div style={{ padding:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>Téléchargez une copie de toutes vos données au format JSON.</p>
              <button onClick={exportData} className="nb-press" style={{ width:'100%', minHeight:40, background:'var(--bg-input)', color:'var(--text)', borderRadius:'var(--radius-lg)', padding:'8px 0', ...DF, fontWeight:700, fontSize:11, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Download size={12} /> Exporter
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Session" num="11" accent={ORANGE}>
            <div style={{ padding:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>Se déconnecter de ce compte sur cet appareil. Tes données restent enregistrées.</p>
              <button onClick={handleLogout} className="nb-press" style={{ width:'100%', minHeight:40, background:'var(--bg-input)', color:'var(--text)', borderRadius:'var(--radius-lg)', padding:'9px 0', ...DF, fontWeight:800, fontSize:11, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <ExternalLink size={12} /> Se déconnecter
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Supprimer mon compte" num="12" accent={ORANGE} titleColor={ORANGE}>
            <div style={{ padding:16 }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>Cette action est irréversible. Toutes vos données seront supprimées définitivement.</p>
              <button onClick={()=>setShowDelete(true)} className="nb-press" style={{ width:'100%', minHeight:40, background:ORANGE, color:'var(--ink-dark)', borderRadius:'var(--radius-lg)', padding:'8px 0', ...DF, fontWeight:700, fontSize:11, border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', cursor:'pointer' }}>
                Supprimer mon compte
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Shield size={13} style={{ color:'var(--text-muted)' }} />
          <p style={{ fontSize:10, color:'var(--text-muted)' }}>Vos données sont sécurisées et chiffrées. Nous ne partageons jamais vos informations personnelles.</p>
        </div>
        <Star size={16} style={{ color: TEAL, flexShrink:0 }} />
      </div>
    </div>
  )
}
