'use client'
import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus, Clock, CalendarPlus, Pencil, Trash2, X } from 'lucide-react'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects }    from '@/hooks/useProjects'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'
import type { TimeEntry } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ─── Edit Entry Modal ────────────────────────────────────────────────────────
function EditEntryModal({
  entry,
  projects,
  onSave,
  onDelete,
  onClose,
}: {
  entry: TimeEntry
  projects: Array<{ id: string; name: string; color: string }>
  onSave: (id: string, patch: Partial<Pick<TimeEntry, 'description' | 'project_id' | 'category' | 'started_at' | 'ended_at' | 'is_billable'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  function toLocalTime(iso: string) {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
  function toLocalDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const [form, setForm] = useState({
    description: entry.description ?? '',
    projectId:   entry.project_id  ?? '',
    category:    entry.category    ?? '',
    billable:    entry.is_billable,
    startDate:   toLocalDate(entry.started_at),
    startTime:   toLocalTime(entry.started_at),
    endDate:     entry.ended_at ? toLocalDate(entry.ended_at) : toLocalDate(entry.started_at),
    endTime:     entry.ended_at ? toLocalTime(entry.ended_at) : '',
  })
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function submit() {
    setSaving(true)
    const startedAt = new Date(`${form.startDate}T${form.startTime}:00`).toISOString()
    const endedAt   = form.endTime ? new Date(`${form.endDate}T${form.endTime}:00`).toISOString() : entry.ended_at
    await onSave(entry.id, {
      description: form.description || undefined,
      project_id:  form.projectId   || undefined,
      category:    form.category    || undefined,
      is_billable: form.billable,
      started_at:  startedAt,
      ended_at:    endedAt,
    })
    setSaving(false)
    onClose()
  }

  const inputStyle = { background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%' } as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4" style={{ background: '#111', border: '1px solid rgba(245,223,187,0.12)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <p style={{ ...DF, fontWeight: 700, fontSize: 14, color: 'var(--wheat)' }}>Modifier l'entrée</p>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Sur quoi as-tu travaillé ?" style={inputStyle} autoFocus />
        </div>

        {/* Projet */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Projet</label>
          <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} style={inputStyle}>
            <option value="">Sans projet</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Catégorie */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Catégorie</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Ex : Design, Dev, Réunion…" style={inputStyle} />
        </div>

        {/* Début / Fin */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Début</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, marginBottom: 4 }} />
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Fin</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, marginBottom: 4 }} />
            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} placeholder="—" style={inputStyle} />
          </div>
        </div>

        {/* Facturable */}
        <button onClick={() => setForm(f => ({ ...f, billable: !f.billable }))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.billable ? 'rgba(14,149,148,0.3)' : 'var(--border)'}`, background: form.billable ? 'rgba(14,149,148,0.08)' : 'transparent', cursor: 'pointer', ...DF }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${form.billable ? '#0E9594' : 'var(--border)'}`, background: form.billable ? '#0E9594' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {form.billable && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: form.billable ? '#0E9594' : 'var(--text-muted)', fontWeight: 600 }}>Facturable</span>
        </button>

        {/* Actions */}
        <div className="flex gap-2 justify-between">
          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} /> Supprimer
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
              <button onClick={async () => { await onDelete(entry.id); onClose() }}
                style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#F2542D', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Confirmer
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={submit} disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const { entries, loading, start, stop, update, remove } = useTimeEntries()
  const { projects } = useProjects()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [desc, setDesc] = useState('')
  const [projId, setProjId] = useState('')
  const [billable, setBillable] = useState(true)
  const [addToCalendar, setAddToCalendar] = useState(true)
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
    await stop(running.id, running.started_at, { addToCalendar })
  }

  return (
    <>
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
              <button onClick={()=>setAddToCalendar(v=>!v)}
                title={addToCalendar ? "Ne pas ajouter au calendrier" : "Ajouter au calendrier à l'arrêt"}
                style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${addToCalendar ? 'rgba(242,84,45,0.35)' : 'var(--border)'}`, background: addToCalendar ? 'rgba(242,84,45,0.1)' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <CalendarPlus size={13} style={{ color: addToCalendar ? '#F2542D' : 'var(--text-muted)' }} />
              </button>
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
          <button onClick={()=>setAddToCalendar(v=>!v)} title="Ajouter au calendrier à l'arrêt"
            className="px-3 rounded-lg flex items-center gap-1.5"
            style={{ background: addToCalendar ? 'rgba(242,84,45,0.12)' : 'var(--bg-input)', color: addToCalendar ? '#F2542D' : 'var(--text-muted)', border:`1px solid ${addToCalendar ? 'rgba(242,84,45,0.3)' : 'var(--border)'}`, ...DF, fontSize:10, fontWeight:700 }}>
            <CalendarPlus size={11} /> {addToCalendar ? 'Agenda' : 'No agenda'}
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
                <button onClick={() => setEditingEntry(e as TimeEntry)}
                  title="Modifier"
                  style={{ padding:'4px 6px', borderRadius:6, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', flexShrink:0, display:'flex', alignItems:'center' }}
                  onMouseEnter={ev => (ev.currentTarget.style.color = '#F2542D')}
                  onMouseLeave={ev => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                  <Pencil size={11} />
                </button>
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

    {editingEntry && (
      <EditEntryModal
        entry={editingEntry}
        projects={projects}
        onSave={update}
        onDelete={async (id) => { await remove(id) }}
        onClose={() => setEditingEntry(null)}
      />
    )}
    </>
  )
}
