'use client'

import { useState } from 'react'
import { Plus, Footprints, Activity, Timer, TrendingUp } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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

export default function SportPage() {
  const { activities, loading, addRun } = useHealth()
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), distance: '', duration: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const [h='0',m='0',s='0'] = form.duration.split(':')
    const duration_seconds = parseInt(h)*3600 + parseInt(m)*60 + parseInt(s)
    const dist = parseFloat(form.distance)
    await addRun({ date: form.date, distance_km: dist, duration_seconds, pace_sec_per_km: Math.round(duration_seconds/dist), notes: form.notes || undefined })
    setForm(f => ({ ...f, distance: '', duration: '', notes: '' }))
    setSaving(false)
  }

  const totalKm   = activities.reduce((s,a) => s + (a.distance_km ?? 0), 0)
  const totalRuns = activities.length
  const bestPace  = activities.filter(a => a.pace_sec_per_km).reduce((best, a) => (!best || a.pace_sec_per_km! < best) ? a.pace_sec_per_km! : best, 0)

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      <PageHeader title="Course à pied" sub="Activités · Stats · Progression" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Footprints size={14} style={{ color: '#0E9594' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total km</span>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>{totalKm.toFixed(1)} <span className="text-sm font-normal">km</span></p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} style={{ color: '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sorties</span>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>{totalRuns}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: '#11686A' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Meilleur pace</span>
          </div>
          <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>{bestPace ? pace(bestPace) + '/km' : '—'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        {/* Historique */}
        <Card padding="none">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Historique des sorties</p>
          </div>
          {loading ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
          : activities.length === 0 ? <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Aucune sortie enregistrée.</div>
          : activities.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(14,149,148,0.15)' }}>
                <Footprints size={14} style={{ color: '#0E9594' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: 'var(--wheat)' }}>{a.distance_km} km</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(a.date + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'short', day: '2-digit', month: 'short' })}
                  {a.notes ? ` · ${a.notes}` : ''}
                </p>
              </div>
              <div className="text-right">
                {a.duration_seconds && <p className="text-xs font-medium" style={{ color: 'var(--wheat)' }}><Timer size={10} className="inline mr-1" />{fmt(a.duration_seconds)}</p>}
                {a.pace_sec_per_km && <p className="text-[10px]" style={{ color: '#0E9594' }}>{pace(a.pace_sec_per_km)}/km</p>}
              </div>
            </div>
          ))}
        </Card>

        {/* Formulaire */}
        <Card>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Nouvelle sortie</p>
          <form onSubmit={handleRun} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Distance (km)</label>
              <input type="number" step="0.01" min="0" required value={form.distance}
                onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} placeholder="5.2"
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Durée (hh:mm:ss)</label>
              <input type="text" required pattern="\d{1,2}:\d{2}:\d{2}" value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="0:28:30"
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Facultatif…"
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
            <Button type="submit" variant="primary" size="sm" loading={saving}><Plus size={13} /> Enregistrer</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
