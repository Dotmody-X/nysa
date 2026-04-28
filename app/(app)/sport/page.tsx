'use client'
import { useState } from 'react'
import { Plus, Activity, Trophy, Target, ArrowRight } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtPace(sec: number, km: number) {
  if (!km || !sec) return '—'
  const secsPerKm = sec / km
  return `${Math.floor(secsPerKm/60)}:${String(Math.round(secsPerKm%60)).padStart(2,'0')}/km`
}
function fmtDur(sec: number) {
  const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60)
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  return `${m}min`
}

export default function RunningPage() {
  const { activities, loading, addRun } = useHealth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), distance: '', duration: '', notes: '' })

  const thisWeek = activities.filter(a => {
    const d = new Date(a.date); const now = new Date()
    const mo = new Date(now); mo.setDate(now.getDate() - now.getDay() + 1); mo.setHours(0,0,0,0)
    return d >= mo
  })
  const totalKm   = thisWeek.reduce((s,a) => s+(a.distance_km??0), 0)
  const totalSec  = thisWeek.reduce((s,a) => s+(a.duration_seconds??0), 0)
  const bestRun   = activities.reduce((best, a) => (!best || (a.distance_km??0) > (best.distance_km??0)) ? a : best, activities[0])
  const bestPace  = activities.reduce((best, a) => {
    const p = a.duration_seconds && a.distance_km ? a.duration_seconds/a.distance_km : Infinity
    return p < best ? p : best
  }, Infinity)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.distance) return
    const parts = form.duration.split(':').map(Number)
    const dur = form.duration ? (parts[0]*3600 + (parts[1]||0)*60) : undefined
    await addRun({ date: form.date, distance_km: parseFloat(form.distance), duration_seconds: dur, notes: form.notes||undefined, type:'run' })
    setShowForm(false); setForm({ date: new Date().toISOString().slice(0,10), distance:'', duration:'', notes:'' })
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <PageTitle
        title="Courses"
        sub="Rapide · Progressif · Objectif-Maxi · Récupération"
        right={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: '#F2542D', color: '#fff', ...DF, fontWeight: 700, fontSize: 12 }}>
            <Plus size={14} /> Nouvelle sortie
          </button>
        }
      />

      <KpiGrid>
        <KpiCard label="Distance semaine"  value={`${totalKm.toFixed(1)} km`}  sub={`${thisWeek.length} sorties`}  color="#F2542D" bg="#11686A" />
        <KpiCard label="Temps total"       value={totalSec > 0 ? fmtDur(totalSec) : '—'}                           color="#F0E4CC" bg="#11686A" />
        <KpiCard label="Allure moy."       value={totalKm > 0 ? fmtPace(totalSec, totalKm) : '—'}                  color="#0E9594" />
        <KpiCard label="Meilleure dist."   value={bestRun ? `${bestRun.distance_km} km` : '—'}                      sub="record" />
      </KpiGrid>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap p-4 rounded-xl" style={{ background:'var(--bg-card)', border:'1px solid var(--border-active)' }}>
          <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
            style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:12 }} />
          <input type="number" step="0.01" value={form.distance} onChange={e=>setForm(f=>({...f,distance:e.target.value}))} placeholder="Distance (km)" autoFocus
            style={{ flex:1, minWidth:120, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <input type="text" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="Durée (h:mm)"
            style={{ width:120, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <input type="text" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes…"
            style={{ flex:2, minWidth:160, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <button type="submit" style={{ background:'#F2542D', color:'#fff', borderRadius:8, padding:'8px 20px', ...DF, fontWeight:700, fontSize:12 }}>Enregistrer</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Left — sorties + progression */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          {/* Weekly bar chart */}
          <div style={{ background:'#11686A', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F0E4CC', textTransform:'uppercase', marginBottom:16 }}>Aperçu de la semaine</p>
            <div className="flex items-end gap-2" style={{ height:80 }}>
              {['L','M','M','J','V','S','D'].map((day,i) => {
                const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i)
                const iso = d.toISOString().slice(0,10)
                const runs = activities.filter(a => a.date === iso)
                const km = runs.reduce((s,a) => s+(a.distance_km??0), 0)
                const maxKm = Math.max(...activities.map(a => a.distance_km??0), 1)
                const h = km > 0 ? Math.max(8,(km/maxKm)*70) : 4
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ flex:1 }}>
                    <div style={{ width:'100%', height:h, borderRadius:4, background: km>0 ? '#F2542D' : 'rgba(240,228,204,0.15)' }} />
                    <span style={{ fontSize:9, color:'rgba(240,228,204,0.6)', ...DF, fontWeight:600 }}>{day}</span>
                    {km > 0 && <span style={{ fontSize:9, color:'#F0E4CC', ...DF, fontWeight:700 }}>{km.toFixed(1)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sorties table */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Dernières sorties</p>
            </div>
            {loading ? <p className="p-5 text-xs" style={{ color:'var(--text-muted)' }}>Chargement…</p>
            : activities.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Activity size={32} style={{ color:'var(--text-muted)' }} />
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>Aucune sortie</p>
                <button onClick={()=>setShowForm(true)} style={{ fontSize:12, color:'#F2542D', ...DF, fontWeight:700 }}>+ Ajouter une sortie</button>
              </div>
            ) : activities.map((a,i) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'#11686A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Activity size={18} style={{ color:'#F0E4CC' }} />
                </div>
                <div className="flex-1">
                  <p style={{ ...DF, fontWeight:800, fontSize:16, color:'var(--wheat)' }}>{a.distance_km} km</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' })}
                    {a.notes ? ` — ${a.notes}` : ''}
                  </p>
                </div>
                <div className="flex gap-4 text-right">
                  {a.duration_seconds && <div>
                    <p style={{ ...DF, fontWeight:700, fontSize:13, color:'var(--wheat)' }}>{fmtDur(a.duration_seconds)}</p>
                    <p style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Durée</p>
                  </div>}
                  {a.duration_seconds && a.distance_km && <div>
                    <p style={{ ...DF, fontWeight:700, fontSize:13, color:'#0E9594' }}>{fmtPace(a.duration_seconds, a.distance_km)}</p>
                    <p style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Allure</p>
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — objectifs + meilleurs perfs */}
        <div className="flex flex-col gap-[10px]">
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Objectifs</p>
            {[
              { label:'Distance / semaine', target:30, unit:'km', current:totalKm },
              { label:'Sorties / semaine',  target:4,  unit:'',   current:thisWeek.length },
            ].map(obj => (
              <div key={obj.label} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize:11, color:'#1A0A0A' }}>{obj.label}</span>
                  <span style={{ ...DF, fontSize:11, fontWeight:800, color:'#1A0A0A' }}>{typeof obj.current === 'number' ? obj.current.toFixed(obj.unit==='km'?1:0) : obj.current}{obj.unit} / {obj.target}{obj.unit}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${Math.min(100,(typeof obj.current==='number'?obj.current:0)/obj.target*100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:12 }}>Meilleures perfs</p>
            {[
              { label:'Plus longue sortie', value: bestRun ? `${bestRun.distance_km} km` : '—' },
              { label:'Meilleure allure',   value: bestPace < Infinity ? `${Math.floor(bestPace/60)}:${String(Math.round(bestPace%60)).padStart(2,'0')}/km` : '—' },
              { label:'Total courses',      value: `${activities.reduce((s,a)=>s+(a.distance_km??0),0).toFixed(0)} km` },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between py-2.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{stat.label}</span>
                <span style={{ ...DF, fontWeight:800, fontSize:14, color:'var(--wheat)' }}>{stat.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:10 }}>Total général</p>
            <p style={{ ...DF, fontWeight:900, fontSize:36, color:'var(--wheat)', lineHeight:1 }}>
              {activities.reduce((s,a)=>s+(a.distance_km??0),0).toFixed(1)}
            </p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>kilomètres courus</p>
            <p style={{ ...DF, fontWeight:700, fontSize:18, color:'#0E9594', marginTop:8 }}>
              {fmtDur(activities.reduce((s,a)=>s+(a.duration_seconds??0),0))}
            </p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>de temps total</p>
          </div>
        </div>
      </div>
    </div>
  )
}
