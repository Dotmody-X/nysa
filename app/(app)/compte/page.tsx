'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Activity, Trophy, TrendingUp, Wallet, Clock, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useHealth } from '@/hooks/useHealth'
import { useDashboard } from '@/hooks/useDashboard'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

export default function ComptePage() {
  const router = useRouter()
  const { data: dash } = useDashboard()
  const { activities, metrics } = useHealth()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('NYSA')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalKm    = activities.reduce((s,a) => s+(a.distance_km??0), 0)
  const totalHours = Math.round((dash?.weekSeconds??0)/3600)
  const balance    = (dash?.monthIncome??0) - (dash?.monthExpense??0)
  const latestW    = metrics[0]?.weight_kg ?? null

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle
        title="Mon Profil"
        sub="Hive sociale · Mes données · Voir mes activités"
        right={
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:'rgba(242,84,45,0.1)', color:'#F2542D', border:'1px solid rgba(242,84,45,0.3)', ...DF, fontWeight:700, fontSize:11 }}>
            <LogOut size={13} /> Déconnexion
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Left — avatar + infos */}
        <div className="flex flex-col gap-[10px]">
          {/* Avatar card */}
          <div style={{ background:'#11686A', borderRadius:12, padding:24 }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#F2542D,#0E9594)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <span style={{ ...DF, fontWeight:900, fontSize:28, color:'#fff' }}>N</span>
            </div>
            <p style={{ ...DF, fontWeight:900, fontSize:20, color:'#F0E4CC' }}>{displayName}</p>
            <p style={{ fontSize:11, color:'rgba(240,228,204,0.7)', marginTop:2 }}>{email}</p>
            <p style={{ fontSize:10, color:'rgba(240,228,204,0.5)', marginTop:6 }}>Membre depuis 2026</p>
            <div style={{ marginTop:12, padding:'8px 14px', borderRadius:20, background:'rgba(242,84,45,0.2)', display:'inline-flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#F2542D' }} />
              <span style={{ fontSize:10, color:'#F0E4CC', ...DF, fontWeight:700 }}>Plan Personnel</span>
            </div>
          </div>

          {/* Modifier profil */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase', marginBottom:12 }}>Modifier le profil</p>
            <div className="flex flex-col gap-3">
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)', ...DF, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Nom affiché</p>
                <input value={displayName} onChange={e=>setDisplayName(e.target.value)}
                  style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
              </div>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)', ...DF, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Email</p>
                <input value={email} readOnly
                  style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text-muted)', fontSize:13, cursor:'not-allowed' }} />
              </div>
              <button style={{ background:'#F2542D', color:'#fff', borderRadius:8, padding:'8px 16px', ...DF, fontWeight:700, fontSize:12 }}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Center — stats globales */}
        <div className="flex flex-col gap-[10px]">
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:16 }}>Mes statistiques globales</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label:'Distance totale',   value:`${totalKm.toFixed(0)} km`,    icon: Activity },
                { label:'Projets actifs',     value:String(dash?.activeProjects.length??0), icon: TrendingUp },
                { label:'Tâches complétées',  value:String(dash?.todayTasks.filter(t=>t.status==='done').length??0), icon: CheckSquare },
                { label:'Budget du mois',     value:`${balance >= 0 ? '+' : ''}${Math.round(balance)} €`, icon: Wallet },
              ].map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="flex flex-col gap-1">
                    <Icon size={16} style={{ color:'rgba(26,10,10,0.6)' }} />
                    <p style={{ ...DF, fontWeight:900, fontSize:22, color:'#1A0A0A', lineHeight:1 }}>{stat.value}</p>
                    <p style={{ fontSize:9, color:'rgba(26,10,10,0.6)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Badges */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:12 }}>Badges</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji:'🏃', label:'Coureur',    unlocked: activities.length > 0 },
                { emoji:'✅', label:'Productif',  unlocked: (dash?.todayTasks.filter(t=>t.status==='done').length??0) > 0 },
                { emoji:'💰', label:'Épargnant',  unlocked: balance > 0 },
                { emoji:'📊', label:'Analyste',   unlocked: true },
                { emoji:'🎯', label:'Focalisé',   unlocked: false },
                { emoji:'⭐', label:'Expert',     unlocked: false },
              ].map(b => (
                <div key={b.label} className="flex flex-col items-center gap-1 p-3 rounded-xl"
                  style={{ background: b.unlocked ? 'rgba(14,149,148,0.1)' : 'var(--bg-input)', border:`1px solid ${b.unlocked ? 'rgba(14,149,148,0.3)' : 'var(--border)'}`, opacity: b.unlocked ? 1 : 0.4 }}>
                  <span style={{ fontSize:22 }}>{b.emoji}</span>
                  <span style={{ fontSize:9, ...DF, fontWeight:700, color: b.unlocked ? '#0E9594' : 'var(--text-muted)', textTransform:'uppercase' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Poids */}
          {latestW && (
            <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8 }}>Dernière mesure</p>
              <p style={{ ...DF, fontWeight:900, fontSize:36, color:'var(--wheat)', lineHeight:1 }}>{latestW} <span style={{ fontSize:16, fontWeight:500 }}>kg</span></p>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
                {metrics[0]?.date ? new Date(metrics[0].date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' }) : ''}
              </p>
            </div>
          )}
        </div>

        {/* Right — activité récente */}
        <div className="flex flex-col gap-[10px]">
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Activité récente</p>
            </div>
            {[
              { label:'Run ajouté',         sub: activities[0] ? `${activities[0].distance_km} km` : '—',      color:'#0E9594' },
              { label:'Tâche complétée',    sub:'Récemment',                                                     color:'#F2542D' },
              { label:'Budget mis à jour',  sub:'Ce mois',                                                        color:'#F5DFBB' },
            ].map(a => (
              <div key={a.label} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ width:8, height:8, borderRadius:2, background:a.color, flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:12, color:'var(--wheat)' }}>{a.label}</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{a.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:12 }}>Paramètres du compte</p>
            {[
              { label:'Changer le mot de passe', color:'var(--text-muted)' },
              { label:'Gérer l\'abonnement',     color:'#F2542D' },
              { label:'Supprimer le compte',     color:'#F2542D' },
            ].map(a => (
              <button key={a.label} className="w-full text-left flex items-center justify-between py-2.5"
                style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:a.color }}>{a.label}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ background:'#0E9594', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:8 }}>À propos de NYSA</p>
            <p style={{ ...DF, fontWeight:900, fontSize:18, color:'#1A0A0A' }}>Version 1.0.0</p>
            <p style={{ fontSize:11, color:'rgba(26,10,10,0.7)', marginTop:4 }}>Focus. Plan. Progress.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
