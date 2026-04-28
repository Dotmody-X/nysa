'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Calendar, CheckCircle2, Circle, Star, Clock, ChevronDown } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#F2542D', high: '#F5DFBB', medium: '#0E9594', low: '#555',
}
const PRIORITY_BG: Record<string, string> = {
  urgent: 'rgba(242,84,45,0.15)', high: 'rgba(245,223,187,0.1)', medium: 'rgba(14,149,148,0.12)', low: 'rgba(80,80,80,0.15)',
}

export default function TodoPage() {
  const { tasks, loading, create, toggle } = useTasks()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'toutes' | 'priorites' | 'auto'>('toutes')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<'urgent'|'high'|'medium'|'low'>('medium')

  const today = new Date().toISOString().slice(0, 10)

  const filtered = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )

  const todayTasks    = filtered.filter(t => t.due_date === today && t.status !== 'done')
  const weekTasks     = filtered.filter(t => t.due_date && t.due_date > today && t.status !== 'done')
  const lateTasks     = filtered.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
  const doneTasks     = filtered.filter(t => t.status === 'done')
  const urgentTasks   = filtered.filter(t => t.priority === 'urgent' && t.status !== 'done')
  const noDateTasks   = filtered.filter(t => !t.due_date && t.status !== 'done')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await create({ title: newTitle.trim(), priority: newPriority, due_date: today })
    setNewTitle(''); setShowForm(false)
  }

  const tabs = [
    { key: 'toutes', label: 'Toutes les tâches' },
    { key: 'priorites', label: 'Priorités' },
    { key: 'auto', label: 'Automatiques' },
  ]

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <PageTitle
        title="To Do List"
        sub="Organisées · Priorités · Automatiques"
        right={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: '#F2542D', color: '#fff', ...DF, fontWeight: 700, fontSize: 12 }}>
            <Plus size={14} /> Ajouter une tâche
          </button>
        }
      />

      {/* KPIs */}
      <KpiGrid>
        <KpiCard label="Tâches totales"    value={String(tasks.filter(t=>t.status!=='done').length)} sub="actives" />
        <KpiCard label="Proches deadline"  value={String(weekTasks.length)}  color="#F5DFBB" />
        <KpiCard label="Urgentes"          value={String(urgentTasks.length)} color="#F2542D" />
        <KpiCard label="Terminées"         value={String(doneTasks.length)}   color="#0E9594" />
      </KpiGrid>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-4 py-2 rounded-lg"
            style={{ background: tab === t.key ? '#F2542D' : 'var(--bg-card)', color: tab === t.key ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', width: 160 }} />
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-2 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre de la tâche…" autoFocus
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as typeof newPriority)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }}>
            <option value="urgent">Urgent</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
          <button type="submit" style={{ background: '#F2542D', color: '#fff', borderRadius: 8, padding: '8px 16px', ...DF, fontWeight: 700, fontSize: 12 }}>Créer</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Main task lists */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          <TaskSection title="Aujourd'hui" color="#F2542D" tasks={todayTasks} onToggle={toggle} loading={loading} />
          <TaskSection title="Cette semaine" color="#0E9594" tasks={weekTasks} onToggle={toggle} loading={loading} />
          {lateTasks.length > 0 && <TaskSection title="En retard" color="#F2542D" tasks={lateTasks} onToggle={toggle} loading={loading} bg="rgba(242,84,45,0.05)" />}
          <TaskSection title="Sans date" color="var(--text-muted)" tasks={noDateTasks} onToggle={toggle} loading={loading} />
          {doneTasks.length > 0 && <TaskSection title="Terminées" color="#0E9594" tasks={doneTasks.slice(0,10)} onToggle={toggle} loading={loading} collapsed />}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-[10px]">
          {/* Mini calendar */}
          <MiniCalendar tasks={tasks} />

          {/* Distribution par priorité */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase', marginBottom: 12 }}>Répartition priorités</p>
            {(['urgent','high','medium','low'] as const).map(p => {
              const count = tasks.filter(t => t.priority === p && t.status !== 'done').length
              const total = tasks.filter(t => t.status !== 'done').length
              const pct = total ? Math.round(count/total*100) : 0
              const labels: Record<string,string> = { urgent:'Urgent', high:'Haute', medium:'Moyenne', low:'Basse' }
              return (
                <div key={p} className="flex items-center gap-2 mb-2">
                  <span style={{ ...DF, fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[p], width: 56 }}>{labels[p]}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: PRIORITY_COLOR[p], width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Filtres rapides */}
          <div style={{ background: '#F2542D', borderRadius: 12, padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#1A0A0A', textTransform: 'uppercase', marginBottom: 10 }}>Filtres rapides</p>
            {[
              { label: 'Sans projet', count: tasks.filter(t => !t.project_id && t.status !== 'done').length },
              { label: 'Avec date', count: tasks.filter(t => t.due_date && t.status !== 'done').length },
              { label: 'Favoris', count: 0 },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between py-1.5">
                <span style={{ fontSize: 12, color: '#1A0A0A' }}>{f.label}</span>
                <span style={{ ...DF, fontWeight: 800, fontSize: 14, color: '#1A0A0A' }}>{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskSection({ title, color, tasks, onToggle, loading, collapsed = false, bg }: {
  title: string; color: string; tasks: any[]; onToggle: (id:string,s:any)=>void; loading: boolean; collapsed?: boolean; bg?: string
}) {
  const [open, setOpen] = useState(!collapsed)
  return (
    <div style={{ background: bg ?? 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <span style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>{title}</span>
        <div className="flex items-center gap-2">
          <span style={{ ...DF, fontSize: 12, fontWeight: 700, color }}>{tasks.length}</span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </button>
      {open && (
        loading ? <p className="text-xs p-5" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
        : tasks.length === 0 ? <p className="text-xs p-5" style={{ color: 'var(--text-muted)' }}>Aucune tâche</p>
        : tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => onToggle(t.id, t.status)}>
              {t.status === 'done'
                ? <CheckCircle2 size={16} style={{ color: '#0E9594' }} />
                : <Circle size={16} style={{ color: 'var(--text-muted)' }} />}
            </button>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                {t.title}
              </p>
              {t.due_date && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}><Clock size={9} style={{ display:'inline', marginRight:3 }} />{t.due_date}</p>}
            </div>
            {t.priority && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.priority}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function MiniCalendar({ tasks }: { tasks: any[] }) {
  const today = new Date()
  const year = today.getFullYear(); const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay() || 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: firstDay - 1 }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  const taskDates = new Set(tasks.map(t => t.due_date))
  const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
      <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 10 }}>Calendrier</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'capitalize' }}>{monthName}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['L','M','M','J','V','S','D'].map((d,i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, padding: '2px 0' }}>{d}</span>
        ))}
        {days.map((d, i) => {
          if (!d) return <span key={i} />
          const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const isToday = d === today.getDate()
          const hasTasks = taskDates.has(iso)
          return (
            <span key={i} style={{
              fontSize: 10, padding: '3px 2px', borderRadius: 4,
              background: isToday ? '#F2542D' : 'transparent',
              color: isToday ? '#fff' : hasTasks ? '#0E9594' : 'var(--text-muted)',
              fontWeight: isToday || hasTasks ? 700 : 400,
            }}>{d}</span>
          )
        })}
      </div>
    </div>
  )
}
