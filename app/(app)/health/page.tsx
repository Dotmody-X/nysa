'use client'

import { useState } from 'react'
import { Plus, Heart, Activity, Scale } from 'lucide-react'
import { useHealth }   from '@/hooks/useHealth'
import { PageHeader }  from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { Button }      from '@/components/ui/Button'

function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${m}min`
}
function pace(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}'${String(s).padStart(2,'0')}"`
}

export default function HealthPage() {
  const { metrics, activities, loading, addWeight, addRun, latestWeight, weightTrend } = useHealth()

  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().slice(0,10), weight: '' })
  const [runForm,    setRunForm]    = useState({ date: new Date().toISOString().slice(0,10), distance: '', duration: '', notes: '' })
  const [tab,        setTab]        = useState<'weight'|'run'>('weight')

  async function handleWeight(e: React.FormEvent) {
    e.preventDefault()
    await addWeight(weightForm.date, parseFloat(weightForm.weight))
    setWeightForm(f => ({ ...f, weight: '' }))
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    const [h = '0', m = '0', s = '0'] = runForm.duration.split(':')
    const duration_seconds = parseInt(h)*3600 + parseInt(m)*60 + parseInt(s)
    const dist = parseFloat(runForm.distance)
    await addRun({
      date: runForm.date,
      distance_km: dist,
      duration_seconds,
      pace_sec_per_km: Math.round(duration_seconds / dist),
      notes: runForm.notes || undefined,
    })
    setRunForm(f => ({ ...f, distance: '', duration: '', notes: '' }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader title="Health" sub="Poids · Running · Forme" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Scale size={14} style={{ color: '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Poids actuel</span>
          </div>
          {latestWeight ? (
            <>
              <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>
                {latestWeight} <span className="text-sm font-normal">kg</span>
              </p>
              {weightTrend !== null && (
                <p className="text-xs mt-1" style={{ color: weightTrend <= 0 ? '#0E9594' : '#F2542D' }}>
                  {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg vs entrée précédente
                </p>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} style={{ color: '#0E9594' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sorties running</span>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>{activities.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {activities.reduce((a, r) => a + (r.distance_km ?? 0), 0).toFixed(1)} km total
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} style={{ color: '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Dernière sortie</span>
          </div>
          {activities[0] ? (
            <>
              <p className="text-lg font-bold" style={{ color: 'var(--wheat)' }}>
                {activities[0].distance_km} km
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {activities[0].duration_seconds ? fmt(activities[0].duration_seconds) : '—'}
                {activities[0].pace_sec_per_km ? ` · ${pace(activities[0].pace_sec_per_km)}/km` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune sortie</p>
          )}
        </Card>
      </div>

      {/* Formulaires */}
      <Card>
        {/* Tabs */}
        <div className="flex gap-0 mb-5 rounded-[8px] overflow-hidden p-1 self-start" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {(['weight', 'run'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 text-xs font-medium rounded-[6px] transition-all"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color:      tab === t ? 'var(--wheat)' : 'var(--text-muted)',
              }}
            >
              {t === 'weight' ? '⚖️  Poids' : '🏃 Running'}
            </button>
          ))}
        </div>

        {tab === 'weight' ? (
          <form onSubmit={handleWeight} className="flex items-end gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input type="date" value={weightForm.date}
                onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Poids (kg)</label>
              <input type="number" step="0.1" min="30" max="200" required
                value={weightForm.weight}
                onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))}
                placeholder="72.4"
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-28"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <Button type="submit" variant="primary" size="sm"><Plus size={13} /> Enregistrer</Button>
          </form>
        ) : (
          <form onSubmit={handleRun} className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input type="date" value={runForm.date}
                onChange={e => setRunForm(f => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Distance (km)</label>
              <input type="number" step="0.01" min="0" required
                value={runForm.distance}
                onChange={e => setRunForm(f => ({ ...f, distance: e.target.value }))}
                placeholder="5.2"
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-24"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Durée (hh:mm:ss)</label>
              <input type="text" required pattern="\d{1,2}:\d{2}:\d{2}"
                value={runForm.duration}
                onChange={e => setRunForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="0:28:30"
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-28"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
              <input type="text"
                value={runForm.notes}
                onChange={e => setRunForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Facultatif…"
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-36"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
            <Button type="submit" variant="primary" size="sm"><Plus size={13} /> Enregistrer</Button>
          </form>
        )}
      </Card>

      {/* Historique */}
      <div className="grid grid-cols-2 gap-5">

        {/* Poids */}
        <Card padding="none">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Historique poids</p>
          </div>
          {loading ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
          : metrics.length === 0 ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Aucune entrée.</div>
          : metrics.slice(0, 12).map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="font-bold" style={{ color: 'var(--wheat)' }}>{m.weight_kg} kg</span>
            </div>
          ))}
        </Card>

        {/* Running */}
        <Card padding="none">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Historique running</p>
          </div>
          {loading ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
          : activities.length === 0 ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Aucune sortie enregistrée.</div>
          : activities.slice(0, 10).map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {new Date(a.date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}
              </span>
              <span className="font-bold" style={{ color: '#0E9594' }}>{a.distance_km} km</span>
              <span style={{ color: 'var(--text-muted)' }}>{a.duration_seconds ? fmt(a.duration_seconds) : '—'}</span>
              <span style={{ color: 'var(--wheat)' }}>{a.pace_sec_per_km ? pace(a.pace_sec_per_km) + '/km' : '—'}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
