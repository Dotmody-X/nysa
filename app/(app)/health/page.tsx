'use client'
import { useState } from 'react'
import { Plus, TrendingDown, TrendingUp, Flame, Moon, Activity } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${String(m).padStart(2,'0')}m`
}

export default function HealthPage() {
  const { metrics, activities, loading, addWeight, addRun, latestWeight, weightTrend } = useHealth()
  const [tab, setTab] = useState<'course'|'poids'|'sommeil'>('course')
  const [showWeightForm, setShowWeightForm] = useState(false)
  const [showRunForm, setShowRunForm] = useState(false)
  const [wForm, setWForm] = useState({ date: new Date().toISOString().slice(0,10), weight: '' })
  const [rForm, setRForm] = useState({ date: new Date().toISOString().slice(0,10), distance: '', duration: '', notes: '' })

  const thisWeekRuns = activities.filter(a => {
    const d = new Date(a.date); const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo
  })
  const totalKmWeek  = thisWeekRuns.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const totalSecWeek = thisWeekRuns.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const avgPace = totalKmWeek > 0 && totalSecWeek > 0
    ? `${Math.floor(totalSecWeek/60/totalKmWeek)}:${String(Math.round(totalSecWeek/totalKmWeek % 60)).padStart(2,'0')}/km`
    : '—'

  async function handleWeight(e: React.FormEvent) {
    e.preventDefault()
    if (!wForm.weight) return
    await addWeight(wForm.date, parseFloat(wForm.weight))
    setShowWeightForm(false); setWForm({ date: new Date().toISOString().slice(0,10), weight: '' })
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    if (!rForm.distance) return
    const [h,m] = rForm.duration.split(':').map(Number)
    const dur = rForm.duration ? (h*3600 + m*60) : undefined
    await addRun({ date: rForm.date, distance_km: parseFloat(rForm.distance), duration_seconds: dur, notes: rForm.notes || undefined, type: 'run' })
    setShowRunForm(false); setRForm({ date: new Date().toISOString().slice(0,10), distance: '', duration: '', notes: '' })
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <PageTitle
        title="Health"
        sub="Course · Poids · Sommeil · Forme & Bien-être"
        right={
          <div className="flex gap-2">
            <button onClick={() => setShowWeightForm(!showWeightForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#11686A', color: '#F0E4CC', ...DF, fontWeight: 700, fontSize: 11 }}>
              <Plus size={12} /> Poids
            </button>
            <button onClick={() => setShowRunForm(!showRunForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F2542D', color: '#fff', ...DF, fontWeight: 700, fontSize: 11 }}>
              <Plus size={12} /> Run
            </button>
          </div>
        }
      />

      <KpiGrid>
        <KpiCard label="Distance semaine" value={`${totalKmWeek.toFixed(1)} km`} sub={`${thisWeekRuns.length} sorties`} color="#F2542D" bg="#11686A" />
        <KpiCard label="Poids actuel"     value={latestWeight ? `${latestWeight} kg` : '—'}
          sub={weightTrend !== null ? `${weightTrend > 0 ? '+' : ''}${weightTrend?.toFixed(1)} kg vs hier` : undefined}
          color="#F0E4CC" bg="#11686A" />
        <KpiCard label="Temps de run"  value={totalSecWeek > 0 ? fmtDuration(totalSecWeek) : '—'}  sub="cette semaine" />
        <KpiCard label="Allure moy."  value={avgPace} sub="cette semaine" color="#0E9594" />
      </KpiGrid>

      {/* Forms */}
      {showWeightForm && (
        <form onSubmit={handleWeight} className="flex gap-2 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input type="date" value={wForm.date} onChange={e => setWForm(f => ({...f, date: e.target.value}))}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }} />
          <input type="number" step="0.1" value={wForm.weight} onChange={e => setWForm(f => ({...f, weight: e.target.value}))} placeholder="Poids (kg)" autoFocus
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <button type="submit" style={{ background: '#11686A', color: '#F0E4CC', borderRadius: 8, padding: '8px 16px', ...DF, fontWeight: 700, fontSize: 12 }}>Enregistrer</button>
        </form>
      )}
      {showRunForm && (
        <form onSubmit={handleRun} className="flex gap-2 flex-wrap p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input type="date" value={rForm.date} onChange={e => setRForm(f=>({...f,date:e.target.value}))}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }} />
          <input type="number" step="0.01" value={rForm.distance} onChange={e => setRForm(f=>({...f,distance:e.target.value}))} placeholder="Distance (km)" autoFocus
            style={{ flex: 1, minWidth: 120, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <input type="text" value={rForm.duration} onChange={e => setRForm(f=>({...f,duration:e.target.value}))} placeholder="Durée (h:mm)"
            style={{ width: 120, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <input type="text" value={rForm.notes} onChange={e => setRForm(f=>({...f,notes:e.target.value}))} placeholder="Notes…"
            style={{ flex: 2, minWidth: 160, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <button type="submit" style={{ background: '#F2542D', color: '#fff', borderRadius: 8, padding: '8px 16px', ...DF, fontWeight: 700, fontSize: 12 }}>Ajouter</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Last runs — big teal card */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          {/* Weekly activity chart (sparkline bars) */}
          <div style={{ background: '#11686A', borderRadius: 12, padding: 20 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F0E4CC', textTransform: 'uppercase', marginBottom: 16 }}>Activité hebdomadaire</p>
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {['L','M','M','J','V','S','D'].map((day, i) => {
                const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i)
                const iso = d.toISOString().slice(0,10)
                const run = activities.find(a => a.date === iso)
                const km  = run?.distance_km ?? 0
                const maxKm = Math.max(...activities.map(a => a.distance_km ?? 0), 1)
                const h = km > 0 ? Math.max(8, (km / maxKm) * 70) : 4
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                    <div style={{ width: '100%', height: h, borderRadius: 4, background: km > 0 ? '#F2542D' : 'rgba(240,228,204,0.15)' }} />
                    <span style={{ fontSize: 9, color: 'rgba(240,228,204,0.6)', ...DF, fontWeight: 600 }}>{day}</span>
                    {km > 0 && <span style={{ fontSize: 9, color: '#F0E4CC' }}>{km.toFixed(1)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Runs list */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase' }}>Dernières sorties</p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activities.length} enregistrées</span>
            </div>
            {loading ? <p className="p-5 text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
            : activities.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Activity size={28} style={{ color: 'var(--text-muted)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune sortie enregistrée</p>
                <button onClick={() => setShowRunForm(true)} style={{ fontSize: 11, color: '#F2542D', ...DF, fontWeight: 700 }}>+ Ajouter un run</button>
              </div>
            ) : activities.slice(0,8).map(a => {
              const pace = a.duration_seconds && a.distance_km
                ? `${Math.floor(a.duration_seconds/60/a.distance_km)}:${String(Math.round(a.duration_seconds/a.distance_km % 60)).padStart(2,'0')}/km`
                : null
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#11686A', display: 'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                    <Activity size={16} style={{ color: '#F0E4CC' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ ...DF, fontWeight: 700, fontSize: 13, color: 'var(--wheat)' }}>
                      {a.distance_km} km
                      {a.notes ? ` — ${a.notes}` : ''}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {new Date(a.date).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' })}
                      {a.duration_seconds ? ` · ${fmtDuration(a.duration_seconds)}` : ''}
                    </p>
                  </div>
                  {pace && <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: '#0E9594' }}>{pace}</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[10px]">
          {/* Weight evolution */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 12 }}>Poids</p>
            {latestWeight ? (
              <>
                <p style={{ ...DF, fontWeight: 900, fontSize: 44, color: 'var(--wheat)', lineHeight: 1 }}>
                  {latestWeight} <span style={{ fontSize: 18, fontWeight: 500 }}>kg</span>
                </p>
                {weightTrend !== null && (
                  <div className="flex items-center gap-1 mt-2">
                    {weightTrend < 0 ? <TrendingDown size={14} style={{ color: '#0E9594' }} /> : <TrendingUp size={14} style={{ color: '#F2542D' }} />}
                    <span style={{ fontSize: 11, color: weightTrend < 0 ? '#0E9594' : '#F2542D' }}>
                      {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg
                    </span>
                  </div>
                )}
                {/* Sparkline */}
                <div className="flex items-end gap-0.5 mt-4" style={{ height: 40 }}>
                  {metrics.slice(0,14).reverse().map((m, i) => {
                    const vals = metrics.slice(0,14).map(x => x.weight_kg ?? 0)
                    const min = Math.min(...vals); const max = Math.max(...vals)
                    const h = max > min ? Math.max(4, ((m.weight_kg ?? 0) - min) / (max - min) * 36) : 20
                    return <div key={i} style={{ flex: 1, height: h, borderRadius: 2, background: '#0E9594', opacity: 0.7 }} />
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune donnée</p>
                <button onClick={() => setShowWeightForm(true)} style={{ fontSize: 11, color: '#11686A', ...DF, fontWeight: 700 }}>+ Ajouter</button>
              </div>
            )}
          </div>

          {/* Objectives */}
          <div style={{ background: '#F2542D', borderRadius: 12, padding: 20 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#1A0A0A', textTransform: 'uppercase', marginBottom: 12 }}>Objectifs</p>
            {[
              { label: 'Distance hebdo', target: '30 km', current: `${totalKmWeek.toFixed(1)} km`, pct: Math.min(100, totalKmWeek/30*100) },
              { label: 'Sorties / semaine', target: '4', current: String(thisWeekRuns.length), pct: Math.min(100, thisWeekRuns.length/4*100) },
            ].map(obj => (
              <div key={obj.label} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 11, color: '#1A0A0A' }}>{obj.label}</span>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#1A0A0A' }}>{obj.current} / {obj.target}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: '#1A0A0A', width: `${obj.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Mesures corporelles */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Historique poids</p>
            {metrics.slice(0,5).map(m => (
              <div key={m.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(m.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                </span>
                <span style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                  {m.weight_kg} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
