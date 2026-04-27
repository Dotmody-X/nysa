'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, AlertCircle, Calendar, Clock, ChevronDown } from 'lucide-react'
import { useTasks }    from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { PageHeader }  from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { Badge }       from '@/components/ui/Badge'
import { Button }      from '@/components/ui/Button'
import type { Task }   from '@/types'

// ─── Utils ───────────────────────────────────────────────────────────────────
function today()    { return new Date().toISOString().slice(0, 10) }
function inDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
const priorityColor = {
  urgent: '#F2542D', high: '#F5DFBB', medium: '#0E9594', low: '#11686A',
} as Record<string, string>

// ─── TaskRow ─────────────────────────────────────────────────────────────────
function TaskRow({
  task, onToggle, onDelete, projectName,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  projectName?: string
}) {
  const done = task.status === 'done'
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 group transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,223,187,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded-[4px] shrink-0 flex items-center justify-center border transition-colors"
        style={{
          background:   done ? '#0E9594' : 'transparent',
          borderColor:  done ? '#0E9594' : 'var(--border)',
        }}
      >
        {done && <span className="text-[9px] font-bold" style={{ color: 'var(--bg)' }}>✓</span>}
      </button>

      {/* Titre */}
      <span
        className="flex-1 text-xs leading-snug"
        style={{
          color:          done ? 'var(--text-muted)' : 'var(--wheat)',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>

      {/* Projet */}
      {projectName && (
        <Badge variant="teal" className="text-[9px] shrink-0">{projectName}</Badge>
      )}

      {/* Priorité */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: priorityColor[task.priority] ?? 'var(--text-muted)' }}
        title={task.priority}
      />

      {/* Date */}
      {task.due_date && (
        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
          {new Date(task.due_date).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}
        </span>
      )}

      {/* Supprimer */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
        style={{ color: 'var(--text-muted)' }}
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({
  title, icon, tasks, onToggle, onDelete, getProjectName, accent,
}: {
  title:          string
  icon:           React.ReactNode
  tasks:          Task[]
  onToggle:       (t: Task) => void
  onDelete:       (id: string) => void
  getProjectName: (id?: string) => string | undefined
  accent?:        string
}) {
  const [open, setOpen] = useState(true)
  if (!tasks.length) return null
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(245,223,187,0.02)' }}
      >
        <span style={{ color: accent ?? 'var(--text-muted)' }}>{icon}</span>
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: accent ?? 'var(--text-muted)' }}>
          {title}
        </span>
        <Badge variant="wheat" className="text-[9px]">{tasks.length}</Badge>
        <ChevronDown size={12} className="ml-auto transition-transform" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>
      {open && tasks.map(t => (
        <TaskRow
          key={t.id}
          task={t}
          onToggle={() => onToggle(t)}
          onDelete={() => onDelete(t.id)}
          projectName={getProjectName(t.project_id ?? undefined)}
        />
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { tasks, loading, create, toggle, remove } = useTasks()
  const { projects } = useProjects()

  const [form, setForm] = useState({
    title: '', priority: 'medium' as Task['priority'],
    due_date: today(), project_id: '',
  })
  const [showForm, setShowForm] = useState(false)

  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name

  // Sections
  const { late, todayTasks, weekTasks, futureTasks } = useMemo(() => {
    const t0 = today()
    const t7 = inDays(7)
    const pending = tasks.filter(t => t.status !== 'done')
    return {
      late:       pending.filter(t => t.due_date && t.due_date < t0),
      todayTasks: pending.filter(t => t.due_date === t0 || (!t.due_date && t.status === 'todo')),
      weekTasks:  pending.filter(t => t.due_date && t.due_date > t0 && t.due_date <= t7),
      futureTasks:pending.filter(t => t.due_date && t.due_date > t7),
    }
  }, [tasks])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    await create({
      title:      form.title.trim(),
      priority:   form.priority,
      due_date:   form.due_date || undefined,
      project_id: form.project_id || undefined,
    })
    setForm({ title: '', priority: 'medium', due_date: today(), project_id: '' })
    setShowForm(false)
  }

  const doneTasks  = tasks.filter(t => t.status === 'done')
  const totalTasks = tasks.length

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        title="To-Do List"
        sub={`${doneTasks.length} / ${totalTasks} tâches complétées`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(s => !s)}>
            <Plus size={13} /> Nouvelle tâche
          </Button>
        }
      />

      {/* ── FORMULAIRE ─────────────────────────────────────────────────── */}
      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre de la tâche…"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: 'var(--wheat)' }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              {/* Priorité */}
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                className="text-xs px-2 py-1.5 rounded-[6px] outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>

              {/* Date */}
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="text-xs px-2 py-1.5 rounded-[6px] outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />

              {/* Projet */}
              <select
                value={form.project_id}
                onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="text-xs px-2 py-1.5 rounded-[6px] outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              >
                <option value="">Sans projet</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" variant="primary" size="sm">Ajouter</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* ── STATS RAPIDES ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'En retard',       value: late.length,        color: '#F2542D' },
          { label: "Aujourd'hui",     value: todayTasks.length,  color: '#F5DFBB' },
          { label: 'Cette semaine',   value: weekTasks.length,   color: '#0E9594' },
          { label: 'Terminées',       value: doneTasks.length,   color: '#11686A' },
        ].map(({ label, value, color }) => (
          <Card key={label} padding="sm" className="text-center">
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </Card>
        ))}
      </div>

      {/* ── LISTE ──────────────────────────────────────────────────────── */}
      <Card padding="none">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune tâche pour l&apos;instant.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Clique sur &quot;Nouvelle tâche&quot; pour commencer.</p>
          </div>
        ) : (
          <>
            <Section title="En retard"      icon={<AlertCircle size={13}/>} tasks={late}        onToggle={t => toggle(t.id, t.status)} onDelete={remove} getProjectName={getProjectName} accent="#F2542D" />
            <Section title="Aujourd'hui"    icon={<Clock size={13}/>}       tasks={todayTasks}  onToggle={t => toggle(t.id, t.status)} onDelete={remove} getProjectName={getProjectName} accent="#F5DFBB" />
            <Section title="Cette semaine"  icon={<Calendar size={13}/>}    tasks={weekTasks}   onToggle={t => toggle(t.id, t.status)} onDelete={remove} getProjectName={getProjectName} accent="#0E9594" />
            <Section title="Plus tard"      icon={<Calendar size={13}/>}    tasks={futureTasks} onToggle={t => toggle(t.id, t.status)} onDelete={remove} getProjectName={getProjectName} />

            {/* Terminées */}
            {doneTasks.length > 0 && (
              <Section
                title="Terminées"
                icon={<span>✓</span>}
                tasks={doneTasks}
                onToggle={t => toggle(t.id, t.status)}
                onDelete={remove}
                getProjectName={getProjectName}
                accent="#11686A"
              />
            )}
          </>
        )}
      </Card>
    </div>
  )
}
