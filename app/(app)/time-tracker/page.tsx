'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Trash2, Clock, TrendingUp, Folders, Zap } from 'lucide-react'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects }    from '@/hooks/useProjects'
import { PageHeader }     from '@/components/layout/PageHeader'
import { Card }           from '@/components/ui/Card'
import { Badge }          from '@/components/ui/Badge'
import { Button }         from '@/components/ui/Button'
import type { TimeEntry } from '@/types'

// ─── Utils ───────────────────────────────────────────────────────────────────
function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
function fmtShort(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function TimeTrackerPage() {
  const { entries, loading, start, stop, remove, totalSecondsToday, totalSecondsWeek } = useTimeEntries()
  const { projects } = useProjects()

  // Timer actif
  const [activeEntry, setActiveEntry]       = useState<TimeEntry | null>(null)
  const [elapsed,     setElapsed]           = useState(0)
  const [description, setDescription]       = useState('')
  const [selectedProj, setSelectedProj]     = useState('')
  const [isBillable,  setIsBillable]        = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reprendre un timer en cours au reload (entrée sans ended_at)
  useEffect(() => {
    if (!entries.length) return
    const running = entries.find(e => !e.ended_at)
    if (running) {
      setActiveEntry(running)
      setDescription(running.description ?? '')
      setSelectedProj(running.project_id ?? '')
    }
  }, [entries])

  // Tick
  useEffect(() => {
    if (activeEntry) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeEntry.started_at).getTime()) / 1000))
      }, 1000)
    } else {
      setElapsed(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeEntry])

  async function handleStart() {
    if (!description.trim()) return
    const { data } = await start(selectedProj || null, description.trim(), isBillable)
    if (data) setActiveEntry(data as TimeEntry)
  }

  async function handleStop() {
    if (!activeEntry) return
    await stop(activeEntry.id, activeEntry.started_at)
    setActiveEntry(null)
    setDescription('')
  }

  // Stats
  const todayEntries = entries.filter(e =>
    e.started_at.startsWith(new Date().toISOString().slice(0, 10)) && e.ended_at
  )

  const projColor = (id: string | undefined) => {
    const p = projects.find(x => x.id === id)
    return p?.color ?? '#F5DFBB'
  }
  const projName = (id: string | undefined) => {
    const p = projects.find(x => x.id === id)
    return p?.name ?? '—'
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader
        title="Time Tracker"
        sub="Suivi du temps par projet"
      />

      {/* ── TIMER ACTIF ────────────────────────────────────────────────── */}
      <Card padding="none" className="overflow-hidden">
        <div
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: activeEntry ? 'rgba(242,84,45,0.05)' : undefined }}
        >
          {/* Description */}
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !activeEntry && handleStart()}
            placeholder="Sur quoi tu travailles ?"
            disabled={!!activeEntry}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-subtle)]"
            style={{ color: 'var(--wheat)' }}
          />

          {/* Projet */}
          <select
            value={selectedProj}
            onChange={e => setSelectedProj(e.target.value)}
            disabled={!!activeEntry}
            className="text-xs px-2 py-1.5 rounded-[6px] outline-none"
            style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
          >
            <option value="">Sans projet</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Facturable */}
          <button
            onClick={() => !activeEntry && setIsBillable(b => !b)}
            className="text-xs px-2 py-1.5 rounded-[6px] transition-colors"
            style={{
              background: isBillable ? 'rgba(14,149,148,0.15)' : 'transparent',
              color:      isBillable ? '#0E9594' : 'var(--text-muted)',
              border:     `1px solid ${isBillable ? 'rgba(14,149,148,0.3)' : 'var(--border)'}`,
            }}
          >
            Fact.
          </button>

          {/* Timer display */}
          <span
            className="font-mono text-lg font-bold w-28 text-center"
            style={{ color: activeEntry ? '#F2542D' : 'var(--text-muted)' }}
          >
            {fmt(elapsed)}
          </span>

          {/* Start / Stop */}
          {activeEntry ? (
            <Button variant="danger" size="md" onClick={handleStop}>
              <Square size={14} /> Arrêter
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleStart} disabled={!description.trim()}>
              <Play size={14} /> Démarrer
            </Button>
          )}
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-4 divide-x" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {[
            { icon: <Clock size={13}/>,      label: "Aujourd'hui", value: fmtShort(totalSecondsToday) },
            { icon: <TrendingUp size={13}/>, label: 'Cette semaine', value: fmtShort(totalSecondsWeek) },
            { icon: <Folders size={13}/>,    label: 'Projets actifs', value: String(projects.filter(p => p.status === 'active').length) },
            { icon: <Zap size={13}/>,        label: 'Entrées aujourd\'hui', value: String(todayEntries.length) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3">
              <span style={{ color: '#F2542D' }}>{icon}</span>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--wheat)' }}>{value}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── ENTRÉES ────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Temps enregistrés — cette semaine
          </p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {entries.filter(e => e.ended_at).length} entrées
          </span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
        ) : entries.filter(e => e.ended_at).length === 0 ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Aucune entrée cette semaine. Démarre un timer pour commencer.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Projet', 'Description', 'Catégorie', 'Date', 'Durée', 'Fact.', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.filter(e => e.ended_at).map(e => (
                <tr
                  key={e.id}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: projColor(e.project_id ?? undefined) }} />
                      <span style={{ color: 'var(--wheat)' }}>{projName(e.project_id ?? undefined)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {e.description ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.category ? <Badge variant="teal">{e.category}</Badge> : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                    {fmtDate(e.started_at)} · {fmtTime(e.started_at)}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-medium" style={{ color: 'var(--wheat)' }}>
                    {e.duration_seconds ? fmtShort(e.duration_seconds) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.is_billable
                      ? <Badge variant="cyan">Fact.</Badge>
                      : <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => remove(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[rgba(242,84,45,0.1)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
