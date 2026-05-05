'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings, Bell, Palette, Lock, Keyboard, Download,
  ChevronRight, Flame, Star, TrendingUp, Activity,
  CheckSquare, Wallet, Clock, Utensils, Zap, Shield,
  ExternalLink, AlertTriangle, X, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useHealth } from '@/hooks/useHealth'
import { useDashboard } from '@/hooks/useDashboard'
import { useRapports } from '@/hooks/useRapports'
import { saveTheme, loadTheme, type ThemeMode } from '@/lib/theme'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = '#0E9594', TEAL_BG = '#11686A', ORANGE = '#F2542D', WHEAT = '#F5DFBB'

function fmtH(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`
}
function card(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return { background: bg, borderRadius: 12, overflow: 'hidden', ...extra }
}

// ─── XP / Level ──────────────────────────────────────────────────────────────
function computeLevel(tasksDone: number, totalKm: number, totalSec: number) {
  const xp      = tasksDone * 10 + Math.round(totalKm * 5) + Math.floor(totalSec / 3600) * 2
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
  const { activities, metrics }   = useHealth()
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
    if (activities[0]) feed.push({ icon:'🏃', label:`Course ${activities[0].distance_km?.toFixed(1)} km`, sub: activities[0].date ? new Date(activities[0].date+'T12:00').toLocaleDateString('fr-FR',{weekday:'long'}) : 'Récemment', color: TEAL })
    if (dash?.todayTasks?.filter(t=>t.status==='done')[0]) {
      const t = dash.todayTasks.find(t=>t.status==='done')!
      feed.push({ icon:'✅', label:`Tâche "${t.title.slice(0,30)}" terminée`, sub:"Aujourd'hui", color: ORANGE })
    }
    if ((dash?.monthExpense ?? 0) > 0) feed.push({ icon:'💳', label:`Dépense — ${Math.round(dash!.monthExpense)} €`, sub: "Ce mois", color: '#E8A838' })
    if (dash?.activeProjects?.[0]) feed.push({ icon:'📁', label:`Projet "${dash.activeProjects[0].name}"`, sub:'Actif', color: '#9B72CF' })
    if ((yearly?.totalKm ?? 0) > 0) feed.push({ icon:'📍', label:`${yearly!.totalKm.toFixed(0)} km cette année`, sub:'Running total', color: TEAL })
    setRecentActivity(feed)
  }, [activities, dash, yearly])

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
    const [tasks, entries, txs, runs, weights] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('time_entries').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('running_activities').select('*'),
      supabase.from('health_metrics').select('*'),
    ])
    const blob = new Blob([JSON.stringify({ tasks: tasks.data, time_entries: entries.data, transactions: txs.data, running: runs.data, health: weights.data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `nysa-export-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
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
  const totalKm      = activities.reduce((s,a) => s+(a.distance_km??0), 0)
  const totalSec     = yearly?.totalSeconds ?? 0
  const tasksDone    = yearly?.tasksDone ?? 0
  const latestW      = metrics[0]?.weight_kg ?? null
  const balance      = (dash?.monthIncome??0) - (dash?.monthExpense??0)
  const lvl          = computeLevel(tasksDone, totalKm, totalSec)

  const days         = period === 'week' ? 7 : 30
  const hrs          = periodData ? periodData.totalSeconds / 3600 : 0
  const target       = days * 4 // 4h/day target
  const scoreProductivite = Math.min(100, Math.round((hrs / target) * 100))
  const scoreHealth  = Math.min(100, Math.round(((periodData?.totalRuns??0) / (days/7 * 3)) * 100))
  const scoreFinances = periodData?.totalIncome ? Math.min(100, Math.max(0, Math.round(50 + ((periodData.totalIncome - periodData.totalExpense) / periodData.totalIncome) * 50))) : 50
  const scoreEquilibre = Math.round((scoreProductivite + scoreHealth + scoreFinances) / 3)

  const badges = [
    { icon:'🏃', label:'Premiers pas',  sub:'Courir 10 km au total',      unlocked: totalKm >= 10,      color: TEAL },
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
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201, background:'var(--bg-card)', borderRadius:16, padding:28, width:400, border:'1px solid rgba(242,84,45,0.3)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <AlertTriangle size={20} style={{ color: ORANGE }} />
              <p style={{ ...DF, fontWeight:800, fontSize:15, color:'var(--wheat)' }}>Supprimer mon compte</p>
              <button onClick={()=>setShowDelete(false)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, lineHeight:1.6 }}>
              Cette action est <strong style={{color:ORANGE}}>irréversible</strong>. Toutes vos données seront supprimées. Tapez <strong>SUPPRIMER</strong> pour confirmer.
            </p>
            <input value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} placeholder="SUPPRIMER"
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13, marginBottom:12 }} />
            <button disabled={deleteInput !== 'SUPPRIMER'} onClick={deleteAccount}
              style={{ width:'100%', background: deleteInput==='SUPPRIMER' ? ORANGE : 'var(--bg-input)', color: deleteInput==='SUPPRIMER' ? '#fff' : 'var(--text-muted)', borderRadius:8, padding:'10px 16px', ...DF, fontWeight:700, fontSize:12, border:'none', cursor: deleteInput==='SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
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
            <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201, background:'var(--bg-card)', borderRadius:16, padding:28, width:380, border:'1px solid var(--border)', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:28 }}>{app.icon}</span>
                  <div>
                    <p style={{ ...DF, fontWeight:800, fontSize:15, color:'var(--wheat)' }}>{info.title}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: app.connected ? TEAL : 'var(--text-subtle)' }} />
                      <span style={{ fontSize:10, color: app.connected ? TEAL : 'var(--text-muted)' }}>{app.connected ? 'Connecté' : 'Non connecté'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={()=>setActiveIntegration(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16}/></button>
              </div>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.7, marginBottom:20 }}>{info.desc}</p>
              {info.action === 'oauth' && !app.connected && (
                <a href={info.href} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:ORANGE, color:'#fff', borderRadius:8, padding:'10px 0', ...DF, fontWeight:800, fontSize:12, border:'none', cursor:'pointer', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  {info.actionLabel}
                </a>
              )}
              {info.action === 'oauth' && app.connected && (
                <button style={{ width:'100%', background:'transparent', color:ORANGE, borderRadius:8, padding:'10px 0', ...DF, fontWeight:700, fontSize:12, border:`1px solid ${ORANGE}`, cursor:'pointer' }}>
                  Déconnecter
                </button>
              )}
              {info.action === 'soon' && (
                <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(14,149,148,0.08)', border:'1px solid rgba(14,149,148,0.2)', textAlign:'center' }}>
                  <span style={{ fontSize:11, color: TEAL, ...DF, fontWeight:700 }}>Prochainement disponible</span>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
        <div>
          <h1 style={{ ...DF, fontWeight:900, fontSize:52, color:WHEAT, letterSpacing:'-0.02em', lineHeight:1, marginBottom:4 }}>MON PROFIL.</h1>
          <p style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.16em', textTransform:'uppercase' }}>VOTRE ESPACE · VOS DONNÉES · VOS OBJECTIFS</p>
        </div>

        {/* NIVEAU card */}
        <div style={{ ...card(ORANGE), padding:'14px 18px', minWidth:260, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ ...DF, fontSize:10, fontWeight:800, letterSpacing:'0.14em', color:'#1A0A0A', textTransform:'uppercase' }}>Niveau</p>
            <ChevronRight size={14} style={{ color:'rgba(26,10,10,0.5)' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <p style={{ ...DF, fontWeight:900, fontSize:18, color:'#1A0A0A', lineHeight:1 }}>{lvl.name}</p>
              <p style={{ fontSize:11, color:'rgba(26,10,10,0.7)', marginTop:2 }}>Niveau {lvl.level}</p>
              <div style={{ marginTop:8, height:4, borderRadius:99, background:'rgba(26,10,10,0.2)', width:140, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${lvl.pct}%` }} />
              </div>
              <p style={{ fontSize:10, color:'rgba(26,10,10,0.6)', marginTop:4 }}>{lvl.xpInLvl} / {lvl.perLevel} XP</p>
            </div>
            <div style={{ width:56, height:56, borderRadius:'50%', border:'3px solid #1A0A0A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ ...DF, fontWeight:900, fontSize:16, color:'#1A0A0A' }}>{lvl.pct}%</span>
            </div>
          </div>
          <p style={{ fontSize:9, color:'rgba(26,10,10,0.6)', marginTop:6 }}>Vers niveau {lvl.level + 1}</p>
        </div>
      </div>

      {/* ══ ROW 1 : Profil + Stats ════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>

        {/* Profil card */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:22, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg,${ORANGE},${TEAL})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ ...DF, fontWeight:900, fontSize:32, color:'#fff' }}>{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {editMode ? (
                <input value={displayName} onChange={e=>setDisplayName(e.target.value)} autoFocus
                  style={{ width:'100%', background:'var(--bg-input)', border:`1px solid ${ORANGE}`, borderRadius:8, padding:'6px 10px', color:'var(--wheat)', fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:4 }} />
              ) : (
                <p style={{ ...DF, fontWeight:900, fontSize:20, color:WHEAT, marginBottom:2 }}>{displayName}</p>
              )}
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{email}</p>
              {editMode ? (
                <input value={quote} onChange={e=>setQuote(e.target.value)} placeholder='"Votre devise personnelle..."'
                  style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', color:'var(--text)', fontSize:11, marginTop:6 }} />
              ) : quote ? (
                <p style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:4 }}>"{quote}"</p>
              ) : null}
            </div>
            <button onClick={()=>editMode ? saveProfile() : setEditMode(true)}
              style={{ background: editMode ? TEAL : 'var(--bg-input)', color: editMode ? '#fff' : 'var(--text-muted)', borderRadius:8, padding:'6px 12px', ...DF, fontWeight:700, fontSize:10, border:`1px solid ${editMode ? TEAL : 'var(--border)'}`, cursor:'pointer', flexShrink:0 }}>
              {editMode ? 'Enregistrer' : 'Modifier le profil'}
            </button>
          </div>

          {saveMsg && <p style={{ fontSize:11, color: saveMsg.startsWith('✅') ? TEAL : ORANGE }}>{saveMsg}</p>}

          <div style={{ display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid var(--border)', paddingTop:14 }}>
            {[
              { label:'Membre depuis', value: memberSince || '2026' },
              { label:'Fuseau horaire', value: timezone, edit: editMode, onChange: (v:string)=>setTimezone(v) },
              { label:'Langue', value: language, edit: editMode, options:['Français','English','Español'], onChange: (v:string)=>setLanguage(v) },
              { label:'Thème', value: theme === 'dark' ? 'Sombre' : theme === 'light' ? 'Clair' : 'Système' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <p style={{ fontSize:11, color:'var(--text-muted)', minWidth:110 }}>{r.label}</p>
                {r.edit && r.options ? (
                  <select value={r.value} onChange={e=>r.onChange!(e.target.value)}
                    style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', color:'var(--text)', fontSize:11 }}>
                    {r.options.map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : r.edit && r.onChange ? (
                  <input value={r.value} onChange={e=>r.onChange!(e.target.value)}
                    style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', color:'var(--text)', fontSize:11, flex:1 }} />
                ) : (
                  <p style={{ fontSize:11, color:'var(--text)', fontWeight:600 }}>{r.value}</p>
                )}
              </div>
            ))}
            {/* Theme toggle */}
            {!editMode && (
              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                {(['dark','light','system'] as ThemeMode[]).map(t => (
                  <button key={t} onClick={()=>applyTheme(t)}
                    style={{ flex:1, padding:'5px 0', borderRadius:7, border:`1px solid ${theme===t ? ORANGE : 'var(--border)'}`, background: theme===t ? 'rgba(242,84,45,0.1)' : 'var(--bg-input)', color: theme===t ? ORANGE : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:9, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    {t === 'dark' ? 'Sombre' : t === 'light' ? 'Clair' : 'Système'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats globales */}
        <div style={{ ...card(TEAL_BG), padding:22 }}>
          <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase', marginBottom:18 }}>Vos statistiques globales</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { icon: Clock,       label:'Temps total tracké',   value: fmtH(totalSec) },
              { icon: CheckSquare, label:'Tâches accomplies',    value: String(tasksDone) },
              { icon: Activity,    label:'Distance courue',      value: `${totalKm.toFixed(1)} km` },
              { icon: Flame,       label:'Calories brûlées',     value: `${(totalKm * 65).toFixed(0)} kcal` },
              { icon: Utensils,    label:'Recettes créées',      value: '—' },
              { icon: Wallet,      label:'Épargné cette année',  value: `${Math.max(0, Math.round((yearly?.totalIncome??0)-(yearly?.totalExpense??0)))} €` },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <Icon size={13} style={{ color:'rgba(240,228,204,0.6)' }} />
                    <p style={{ fontSize:9, color:'rgba(240,228,204,0.6)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{s.label}</p>
                  </div>
                  <p style={{ ...DF, fontWeight:900, fontSize:22, color:WHEAT, lineHeight:1 }}>{s.value}</p>
                </div>
              )
            })}
          </div>
          <button onClick={()=>router.push('/rapports')}
            style={{ marginTop:20, display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:'rgba(240,228,204,0.7)', textTransform:'uppercase', letterSpacing:'0.1em', padding:0 }}>
            Voir tous les rapports <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ══ ROW 2 : Succès + Résumé activité ════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>

        {/* Succès */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase' }}>Vos succès</p>
            <button style={{ fontSize:10, color:TEAL, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700 }}>Voir tous</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {badges.map(b => (
              <div key={b.label} style={{ padding:'14px 12px', borderRadius:10, background: b.unlocked ? b.color+'18' : 'var(--bg-input)', border:`1px solid ${b.unlocked ? b.color+'44' : 'var(--border)'}`, opacity: b.unlocked ? 1 : 0.4, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <div style={{ width:44, height:44, borderRadius:10, background: b.unlocked ? b.color : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {b.icon}
                </div>
                <p style={{ ...DF, fontSize:10, fontWeight:800, color: b.unlocked ? b.color : 'var(--text-muted)', textAlign:'center' }}>{b.label}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', textAlign:'center', lineHeight:1.4 }}>{b.sub}</p>
                {b.unlocked && <Check size={12} style={{ color: b.color }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Résumé activité */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:20, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase' }}>Résumé de votre activité</p>
            <div style={{ display:'flex', gap:4 }}>
              {(['week','month'] as const).map(p => (
                <button key={p} onClick={()=>setPeriod(p)}
                  style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${period===p ? ORANGE : 'var(--border)'}`, background: period===p ? 'rgba(242,84,45,0.1)' : 'transparent', color: period===p ? ORANGE : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:9, cursor:'pointer' }}>
                  {p==='week' ? 'Cette semaine' : 'Ce mois'}
                </button>
              ))}
            </div>
          </div>
          {[
            { label:'Productivité', value: scoreProductivite, color: TEAL },
            { label:'Santé',        value: scoreHealth,       color: '#9B72CF' },
            { label:'Finances',     value: scoreFinances,     color: ORANGE },
            { label:'Équilibre',    value: scoreEquilibre,    color: '#E8A838' },
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
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(14,149,148,0.1)', border:'1px solid rgba(14,149,148,0.25)', display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
              <Zap size={14} style={{ color: TEAL, flexShrink:0 }} />
              <p style={{ fontSize:11, color:WHEAT, lineHeight:1.4 }}>Vous êtes plus productif le matin — vos pics d'activité sont entre 9h et 11h.</p>
            </div>
          )}
          <button onClick={()=>router.push('/rapports')}
            style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', padding:0, marginTop:'auto' }}>
            Voir l'analyse complète <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ══ ROW 3 : Série + Préférences + Apps ══════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>

        {/* Série actuelle */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:20 }}>
          <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase', marginBottom:14 }}>Série actuelle</p>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <span style={{ fontSize:28 }}>🔥</span>
            <div>
              <p style={{ ...DF, fontWeight:900, fontSize:28, color:ORANGE, lineHeight:1 }}>{streak} jours</p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Continuez comme ça !</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {streakDays.map((active, i) => (
              <div key={i} style={{ width:20, height:20, borderRadius:5, background: active ? ORANGE : 'var(--bg-input)', border:`1px solid ${active ? ORANGE : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {active && <Check size={10} style={{ color:'#fff' }} />}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            <p style={{ fontSize:8, color:'var(--text-subtle)' }}>Lun</p>
            <p style={{ fontSize:8, color:'var(--text-subtle)' }}>Dim</p>
          </div>
        </div>

        {/* Préférences */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase' }}>Préférences</p>
          </div>
          {prefItems.map(({ icon: Icon, label, sub, href }) => (
            <button key={label} onClick={()=>router.push(href)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-card-hover)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={14} style={{ color:'var(--text-muted)' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, color:'var(--wheat)', fontWeight:500 }}>{label}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>{sub}</p>
              </div>
              <ChevronRight size={12} style={{ color:'var(--text-subtle)', flexShrink:0 }} />
            </button>
          ))}
        </div>

        {/* Applications connectées */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase' }}>Applications connectées</p>
          </div>
          {integrations.map(app => (
            <button key={app.name} onClick={()=>setActiveIntegration(app.name)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-card-hover)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <span style={{ fontSize:18, flexShrink:0 }}>{app.icon}</span>
              <p style={{ flex:1, fontSize:12, color:'var(--wheat)' }}>{app.name}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, color: app.connected ? TEAL : 'var(--text-subtle)', ...DF, fontWeight:600 }}>{app.connected ? 'Connecté' : 'Non connecté'}</span>
                <div style={{ width:7, height:7, borderRadius:'50%', background: app.connected ? TEAL : 'var(--text-subtle)', flexShrink:0 }} />
              </div>
            </button>
          ))}
          <button onClick={()=>router.push('/reglages')}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', ...DF, fontWeight:700, fontSize:10, color:TEAL, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Gérer les intégrations <ExternalLink size={10} />
          </button>
        </div>
      </div>

      {/* ══ ROW 4 : Activité récente (full) ════════════════════════════════ */}
      <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
          <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:ORANGE, textTransform:'uppercase' }}>Activité récente</p>
          <p style={{ fontSize:10, color:'var(--text-muted)', ...DF, fontWeight:600 }}>Voir tout</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
          {recentActivity.length === 0 ? (
            <p style={{ fontSize:12, color:'var(--text-muted)', padding:'16px 20px', gridColumn:'1/-1' }}>Aucune activité récente</p>
          ) : recentActivity.slice(0,6).map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--border)', borderRight: i%3!==2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{a.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, color:'var(--wheat)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.label}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ROW 5 : Paramètres + Abonnement ════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:10 }}>

        {/* Paramètres du compte */}
        <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:22 }}>
          <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase', marginBottom:16 }}>Paramètres du compte</p>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:'10px 16px', alignItems:'center' }}>
            {[
              { label:'Nom',         value:displayName, setter:setDisplayName, type:'text' },
              { label:'Email',       value:email,       setter:setEmail,       type:'email', readOnly:true },
            ].map(f => (
              <>
                <p key={f.label+'l'} style={{ fontSize:12, color:'var(--text-muted)' }}>{f.label}</p>
                <input key={f.label+'i'} value={f.value} onChange={e=>!f.readOnly && f.setter(e.target.value)} readOnly={f.readOnly}
                  style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color: f.readOnly ? 'var(--text-muted)' : 'var(--text)', fontSize:12, cursor: f.readOnly ? 'not-allowed' : 'text' }} />
              </>
            ))}
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Mot de passe</p>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {showPwd ? (
                <>
                  <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" autoFocus
                    style={{ flex:1, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color:'var(--text)', fontSize:12 }} />
                  <button onClick={changePassword} style={{ background:TEAL, color:'#fff', borderRadius:8, padding:'7px 12px', ...DF, fontWeight:700, fontSize:11, border:'none', cursor:'pointer' }}>OK</button>
                  <button onClick={()=>{setShowPwd(false);setNewPwd('')}} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 10px', color:'var(--text-muted)', cursor:'pointer' }}><X size={12}/></button>
                </>
              ) : (
                <>
                  <input type="password" value="••••••••••" readOnly style={{ flex:1, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color:'var(--text-muted)', fontSize:12, cursor:'not-allowed' }} />
                  <button onClick={()=>setShowPwd(true)} style={{ background:'none', border:`1px solid ${ORANGE}`, borderRadius:8, padding:'7px 12px', color:ORANGE, ...DF, fontWeight:700, fontSize:10, cursor:'pointer' }}>Changer</button>
                </>
              )}
            </div>
            {pwdMsg && <><span/><p style={{ fontSize:11, color: pwdMsg.startsWith('✅') ? TEAL : ORANGE }}>{pwdMsg}</p></>}
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Fuseau horaire</p>
            <input value={timezone} onChange={e=>setTimezone(e.target.value)}
              style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color:'var(--text)', fontSize:12 }} />
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>Devise</p>
            <select defaultValue="EUR" style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color:'var(--text)', fontSize:12 }}>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar ($)</option>
              <option value="GBP">Livre (£)</option>
            </select>
          </div>
          <button onClick={saveProfile} style={{ marginTop:16, width:'100%', background:ORANGE, color:'#fff', borderRadius:8, padding:'10px 0', ...DF, fontWeight:800, fontSize:12, border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Enregistrer les modifications
          </button>
        </div>

        {/* Abonnement + Export + Supprimer */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ ...card(TEAL_BG), padding:20, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.14em', color:WHEAT, textTransform:'uppercase' }}>Abonnement</p>
              <span style={{ padding:'3px 8px', borderRadius:99, background:'rgba(14,149,148,0.3)', color:WHEAT, fontSize:9, ...DF, fontWeight:700 }}>Actif</span>
            </div>
            <p style={{ ...DF, fontWeight:900, fontSize:18, color:WHEAT, marginBottom:4 }}>Plan Personnel</p>
            <p style={{ fontSize:10, color:'rgba(240,228,204,0.6)', marginBottom:12 }}>Prochain renouvellement — 12 juin 2025</p>
            {['Toutes les fonctionnalités incluses','Accès à l\'agent IA','Intégrations illimitées'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <Check size={11} style={{ color:WHEAT, flexShrink:0 }} />
                <p style={{ fontSize:11, color:'rgba(240,228,204,0.8)' }}>{f}</p>
              </div>
            ))}
            <button style={{ marginTop:12, width:'100%', background:'rgba(240,228,204,0.15)', color:WHEAT, borderRadius:8, padding:'8px 0', ...DF, fontWeight:700, fontSize:10, border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Gérer mon abonnement <ChevronRight size={10} style={{ display:'inline' }}/>
            </button>
          </div>

          <div style={{ ...card('var(--bg-card)'), border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:WHEAT, textTransform:'uppercase', marginBottom:8 }}>Exporter mes données</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>Téléchargez une copie de toutes vos données au format JSON.</p>
            <button onClick={exportData} style={{ width:'100%', background:'var(--bg-input)', color:'var(--wheat)', borderRadius:8, padding:'8px 0', ...DF, fontWeight:700, fontSize:11, border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Download size={12} /> Exporter
            </button>
          </div>

          <div style={{ ...card('var(--bg-card)'), border:'1px solid rgba(242,84,45,0.25)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:ORANGE, textTransform:'uppercase', marginBottom:6 }}>Supprimer mon compte</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>Cette action est irréversible. Toutes vos données seront supprimées définitivement.</p>
            <button onClick={()=>setShowDelete(true)} style={{ width:'100%', background:'transparent', color:ORANGE, borderRadius:8, padding:'8px 0', ...DF, fontWeight:700, fontSize:11, border:`1px solid ${ORANGE}`, cursor:'pointer' }}>
              Supprimer mon compte
            </button>
          </div>
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
