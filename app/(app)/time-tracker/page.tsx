'use client'
import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus, Clock } from 'lucide-react'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects }    from '@/hooks/useProjects'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtSec(s: number) {
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmtDur(s: number) {
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60)
  return h>0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}min`
}
function fmtEur(n: number) { return n.toLocaleString('fr-BE', { style:'currency', currency:'EUR', minimumFractionDigits:0 }) }

export default function TimeTrackerPage() {
  const { entries, loading, start, stop } = useTimeEntries()
  const { projects } = useProjects()
  const [desc, setDesc] = useState('')
  const [projId, setProjId] = useState('')
  const [billable, setBillable] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const running = entries.find(e => !e.ended_at)

  useEffect(() => {
    if (running) {
      setElapsed(Math.floor((Date.now() - new Date(running.started_at).getTime())/1000))
      timerRef.current = setInterval(() => setElapsed(s => s+1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running?.id])

  const today = new Date().toISOString().slice(0,10)
  const todayEntries  = entries.filter(e => e.started_at.slice(0,10) === today)
  const todaySec      = todayEntries.filter(e => e.duration_seconds).reduce((s,e) => s+(e.duration_seconds??0), 0)
  const weekSec       = entries.filter(e => e.duration_seconds).reduce((s,e) => s+(e.duration_seconds??0), 0)
  const activeProjs   = new Set(entries.map(e => e.project_id).filter(Boolean)).size
  const weekRev       = entries.filter(e=>e.is_billable&&e.duration_seconds).reduce((s,e)=>s+(e.duration_seconds??0)/3600*75,0)

  const byProject = projects.map(p => ({
    ...p,
    seconds: entries.filter(e=>e.project_id===p.id&&e.duration_seconds).reduce((s,e)=>s+(e.duration_seconds??0),0)
  })).filter(p=>p.seconds>0).sort((a,b)=>b.seconds-a.seconds)

  async function handleStart() {
    if (!desc.trim()) return
    await start(projId||null, desc.trim(), billable)
    setDesc('')
  }
  async function handleStop() {
    if (!running) return
    await stop(running.id, running.started_at)
  }

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle
        title="Time Trackers"
        sub="Suivi · Facturation · Analyse · Reporting"
        right={
          running ? (
            <div className="flex items-center gap-3">
              <div style={{ background:'rgba(242,84,45,0.1)', border:'1px solid rgba(242,84,45,0.3)', borderRadius:12, padding:'8px 16px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#F2542D', animation:'pulse 1s infinite' }} />
                <span style={{ ...DF, fontWeight:900, fontSize:20, color:'#F2542D', letterSpacing:'0.05em' }}>{fmtSec(elapsed)}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{running.description}</span>
              </div>
              <button onClick={handleStop} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background:'#F2542D', color:'#fff', ...DF, fontWeight:700, fontSize:12 }}>
                <Square size={12} fill="#fff" /> Arrêter
              </button>
            </div>
          ) : null
        }
      />

      <KpiGrid>
        <KpiCard label="Total semaine"    value={fmtDur(weekSec)}               sub="temps enregistré"   color="#F2542D" />
        <KpiCard label="Aujourd'hui"      value={fmtDur(todaySec+elapsed)}      sub={`${todayEntries.length} sessions`} color="#F5DFBB" />
        <KpiCard label="Projets actifs"   value={String(activeProjs)}           sub="cette semaine"     color="#0E9594" />
        <KpiCard label="Revenus estimés"  value={fmtEur(weekRev)}               sub="heures facturables" />
      </KpiGrid>

      {/* Start new timer */}
      {!running && (
        <div className="flex gap-2" style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:12 }}>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Sur quoi travailles-tu ?" autoFocus
            onKeyDown={e => e.key==='Enter' && handleStart()}
            style={{ flex:1, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:13 }} />
          <select value={projId} onChange={e=>setProjId(e.target.value)}
            style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:12, minWidth:140 }}>
            <option value="">Sans projet</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={()=>setBillable(b=>!b)}
            className="px-3 rounded-lg"
            style={{ background: billable ? 'rgba(14,149,148,0.15)' : 'var(--bg-input)', color: billable ? '#0E9594' : 'var(--text-muted)', border:'1px solid var(--border)', ...DF, fontSize:10, fontWeight:700 }}>
            {billable ? '€ Fact.' : 'Non fact.'}
          </button>
          <button onClick={handleStart} disabled={!desc.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl"
            style={{ background: desc.trim() ? '#F2542D' : 'var(--bg-input)', color: desc.trim() ? '#fff' : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:12, transition:'all 0.15s' }}>
            <Play size={13} fill={desc.trim() ? '#fff' : 'var(--text-muted)'} /> Démarrer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Entries list */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          {/* Weekly bars */}
          <div style={{ background:'#11686A', borderRadius:12, padding:20 }}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F0E4CC', textTransform:'uppercase' }}>Temps enregistrés</p>
              <span style={{ fontSize:11, color:'rgba(240,228,204,0.6)' }}>{fmtDur(weekSec)} cette semaine</span>
            </div>
            <div className="flex items-end gap-2" style={{ height:72 }}>
              {['L','M','M','J','V','S','D'].map((day, i) => {
                const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i)
                const iso = d.toISOString().slice(0,10)
                const sec = entries.filter(e=>e.started_at.slice(0,10)===iso&&e.duration_seconds).reduce((s,e)=>s+(e.duration_seconds??0),0)
                const maxSec = Math.max(...['L','M','M','J','V','S','D'].map((_,j)=>{
                  const dd=new Date(); dd.setDate(dd.getDate()-dd.getDay()+1+j)
                  return entries.filter(e=>e.started_at.slice(0,10)===dd.toISOString().slice(0,10)&&e.duration_seconds).reduce((s,e)=>s+(e.duration_seconds??0),0)
                }), 1)
                const h = sec>0 ? Math.max(8,(sec/maxSec)*64) : 4
                const isToday = iso === today
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ flex:1 }}>
                    <div style={{ width:'100%', height:h, borderRadius:4, background: isToday ? '#F2542D' : sec>0 ? '#F0E4CC' : 'rgba(240,228,204,0.12)' }} />
                    <span style={{ fontSize:9, color: isToday ? '#F2542D' : 'rgba(240,228,204,0.5)', ...DF, fontWeight:isToday?800:500 }}>{day}</span>
                    {sec>0 && <span style={{ fontSize:9, color:'rgba(240,228,204,0.7)' }}>{fmtDur(sec)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Entries table */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Entrées récentes</p>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>{entries.length} cette semaine</span>
            </div>
            {loading ? <p className="p-5 text-xs" style={{ color:'var(--text-muted)' }}>Chargement…</p>
            : entries.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Clock size={32} style={{ color:'var(--text-muted)' }} />
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>Aucune entrée cette semaine</p>
              </div>
            ) : entries.slice(0,12).map(e => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom:'1px solid var(--border)', background: !e.ended_at ? 'rgba(242,84,45,0.04)' : 'transparent' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:(e as any).projects?.color ?? e.project?.color ?? '#F5DFBB', flexShrink:0 }} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize:13, color:'var(--wheat)' }}>{e.description||'Sans description'}</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                    {(e as any).projects?.name ?? e.project?.name ?? 'Sans projet'} · {new Date(e.started_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                    {e.ended_at ? ` → ${new Date(e.ended_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}` : ' · En cours'}
                  </p>
                </div>
                {e.is_billable && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(14,149,148,0.12)', color:'#0E9594', ...DF, fontWeight:700 }}>Fact.</span>}
                {!e.ended_at ? (
                  <button onClick={handleStop} style={{ fontSize:11, color:'#F2542D', ...DF, fontWeight:700, padding:'4px 10px', borderRadius:6, background:'rgba(242,84,45,0.1)', border:'1px solid rgba(242,84,45,0.2)' }}>
                    ■ Stop
                  </button>
                ) : (
                  <span style={{ ...DF, fontWeight:700, fontSize:13, color:'var(--text-muted)', flexShrink:0 }}>
                    {e.duration_seconds ? fmtDur(e.duration_seconds) : '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-[10px]">
          {/* Répartition par projet */}
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Répartition du temps</p>
            {byProject.length === 0 ? <p style={{ fontSize:12, color:'rgba(26,10,10,0.6)' }}>Aucune donnée</p> : byProject.slice(0,5).map(p => {
              const pct = weekSec > 0 ? Math.round(p.seconds/weekSec*100) : 0
              return (
                <div key={p.id} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize:11, color:'#1A0A0A' }}>{p.name}</span>
                    <span style={{ ...DF, fontSize:11, fontWeight:700, color:'#1A0A0A' }}>{fmtDur(p.seconds)} · {pct}%</span>
                  </div>
                  <div style={{ height:4, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background: p.color??'#1A0A0A', width:`${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Objectifs */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:10 }}>Objectif semaine</p>
            <p style={{ ...DF, fontWeight:900, fontSize:32, color:'var(--wheat)', lineHeight:1 }}>
              {Math.round((weekSec/3600)*10)/10} <span style={{ fontSize:16, fontWeight:500 }}>h</span>
            </p>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, marginBottom:10 }}>/ 35h objectif</p>
            <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background:'#0E9594', width:`${Math.min(100,weekSec/3600/35*100)}%` }} />
            </div>
            <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{Math.round(weekSec/3600/35*100)}% atteint</p>
          </div>

          {/* Top projets */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:10 }}>Top projets</p>
            {byProject.slice(0,4).map((p,i) => (
              <div key={p.id} className="flex items-center gap-2 py-2" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ ...DF, fontWeight:900, fontSize:16, color:'var(--text-subtle)', width:16 }}>{i+1}</span>
                <span style={{ width:8, height:8, borderRadius:2, background:p.color??'#F2542D', flexShrink:0 }} />
                <span style={{ flex:1, fontSize:11, color:'var(--wheat)' }}>{p.name}</span>
                <span style={{ ...DF, fontWeight:700, fontSize:12, color:'var(--text-muted)' }}>{fmtDur(p.seconds)}</span>
              </div>
            ))}
            {byProject.length === 0 && <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune donnée</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
