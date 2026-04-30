'use client'
import { useState } from 'react'
import { Plus, Search, CheckCircle2, Circle, Clock, ChevronDown, Pencil, Trash2, X } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'
import type { Task } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#F2542D', high: '#F5DFBB', medium: '#0E9594', low: '#888',
}
const PRIORITY_BG: Record<string, string> = {
  urgent: 'rgba(242,84,45,0.15)', high: 'rgba(245,223,187,0.1)', medium: 'rgba(14,149,148,0.12)', low: 'rgba(136,136,136,0.12)',
}
const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent', high: 'Haute', medium: 'Moyenne', low: 'Basse',
}

// ─── Edit Task Modal ──────────────────────────────────────────────────────────
function EditTaskModal({
  task,
  projects,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task
  projects: Array<{ id: string; name: string; color: string }>
  onSave: (id: string, patch: Partial<Task>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title:      task.title,
    priority:   task.priority as 'urgent' | 'high' | 'medium' | 'low',
    status:     task.status as 'todo' | 'in_progress' | 'done',
    due_date:   task.due_date ?? '',
    project_id: task.project_id ?? '',
    description: task.description ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(task.id, {
      title:       form.title.trim(),
      priority:    form.priority,
      status:      form.status,
      due_date:    form.due_date || undefined,
      project_id:  form.project_id || undefined,
      description: form.description || undefined,
    })
    setSaving(false)
    onClose()
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <p style={{ ...DF, fontWeight: 700, fontSize: 14, color: 'var(--wheat)' }}>Modifier la tâche</p>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Titre */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Titre</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={inp} autoFocus />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} placeholder="Détails optionnels…"
            style={{ ...inp, resize: 'none' }} />
        </div>

        {/* Priorité + Statut */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Priorité</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof form.priority }))} style={inp}>
              <option value="urgent">Urgent</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Statut</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))} style={inp}>
              <option value="todo">À faire</option>
              <option value="in_progress">En cours</option>
              <option value="done">Terminée</option>
            </select>
          </div>
        </div>

        {/* Échéance */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Échéance</label>
          <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
        </div>

        {/* Projet */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Projet</label>
          <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} style={inp}>
            <option value="">Sans projet</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {form.project_id && (() => {
            const p = projects.find(pr => pr.id === form.project_id)
            return p ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.name}</span>
              </div>
            ) : null
          })()}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between items-center">
          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} /> Supprimer
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
              <button onClick={async () => { await onDelete(task.id); onClose() }}
                style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#F2542D', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Confirmer
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={submit} disabled={saving || !form.title.trim()}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { tasks, loading, create, toggle, update, remove } = useTasks()
  const { projects } = useProjects()

  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState<'toutes' | 'priorites' | 'projets' | 'auto'>('toutes')
  const [filterProject, setFilterProject] = useState<string | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [editingTask,   setEditingTask]   = useState<Task | null>(null)

  const [newTitle,     setNewTitle]     = useState('')
  const [newPriority,  setNewPriority]  = useState<'urgent'|'high'|'medium'|'low'>('medium')
  const [newDate,      setNewDate]      = useState(new Date().toISOString().slice(0, 10))
  const [newProjectId, setNewProjectId] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const filtered = tasks.filter(t =>
    (!search || t.title.toLowerCase().includes(search.toLowerCase())) &&
    (!filterProject || t.project_id === filterProject)
  )

  const todayTasks  = filtered.filter(t => t.due_date === today && t.status !== 'done')
  const weekTasks   = filtered.filter(t => t.due_date && t.due_date > today && t.status !== 'done')
  const lateTasks   = filtered.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
  const doneTasks   = filtered.filter(t => t.status === 'done')
  const urgentTasks = filtered.filter(t => t.priority === 'urgent' && t.status !== 'done')
  const noDateTasks = filtered.filter(t => !t.due_date && t.status !== 'done')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await create({
      title:      newTitle.trim(),
      priority:   newPriority,
      due_date:   newDate || undefined,
      project_id: newProjectId || undefined,
    })
    setNewTitle(''); setShowForm(false)
  }

  const TAB_COLORS: Record<string, string> = {
    toutes:    '#F2542D',
    priorites: '#9B72CF',
    projets:   '#0E9594',
    auto:      '#E8A838',
  }
  const tabs = [
    { key: 'toutes',    label: 'Toutes les tâches' },
    { key: 'priorites', label: 'Priorités'          },
    { key: 'projets',   label: 'Par projet'         },
    { key: 'auto',      label: 'Automatiques'       },
  ]

  // ── Par projet : grouped view ─────────────────────────────────────────
  const activeTasks = filtered.filter(t => t.status !== 'done')
  const projectGroups = projects.map(p => ({
    project: p,
    tasks: activeTasks.filter(t => t.project_id === p.id),
  })).filter(g => g.tasks.length > 0)
  const noProjectTasks = activeTasks.filter(t => !t.project_id)

  // ── Priorités : grouped by priority ──────────────────────────────────
  const priorityGroups: { key: 'urgent'|'high'|'medium'|'low'; label: string; color: string }[] = [
    { key: 'urgent', label: 'Urgent',  color: '#F2542D' },
    { key: 'high',   label: 'Haute',   color: '#F5DFBB' },
    { key: 'medium', label: 'Moyenne', color: '#0E9594' },
    { key: 'low',    label: 'Basse',   color: '#888'    },
  ]

  // ── Automatiques : smart lists ────────────────────────────────────────
  const now7d = new Date(); now7d.setDate(now7d.getDate() + 7)
  const next7dStr = now7d.toISOString().slice(0, 10)
  const autoGroups = [
    { key: 'overdue',   label: 'En retard',           color: '#F2542D', tasks: filtered.filter(t => t.due_date && t.due_date < today && t.status !== 'done'), bg: 'rgba(242,84,45,0.05)' },
    { key: 'today',     label: 'Aujourd\'hui',         color: '#F2542D', tasks: filtered.filter(t => t.due_date === today && t.status !== 'done'),              bg: undefined },
    { key: 'next7d',    label: '7 prochains jours',   color: '#E8A838', tasks: filtered.filter(t => t.due_date && t.due_date > today && t.due_date <= next7dStr && t.status !== 'done'), bg: undefined },
    { key: 'inprogress',label: 'En cours',             color: '#0E9594', tasks: filtered.filter(t => t.status === 'in_progress'),                                bg: undefined },
    { key: 'nodate',    label: 'Sans date',            color: 'var(--text-muted)', tasks: filtered.filter(t => !t.due_date && t.status !== 'done'),             bg: undefined },
    { key: 'done',      label: 'Terminées',            color: '#0E9594', tasks: filtered.filter(t => t.status === 'done').slice(0, 10),                         bg: undefined },
  ].filter(g => g.tasks.length > 0)

  const inp: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12,
  }

  return (
    <>
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>

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
        <KpiCard label="Tâches totales"   value={String(tasks.filter(t => t.status !== 'done').length)} sub="actives" />
        <KpiCard label="Proches deadline" value={String(weekTasks.length)}  color="#F5DFBB" />
        <KpiCard label="Urgentes"         value={String(urgentTasks.length)} color="#F2542D" />
        <KpiCard label="Terminées"        value={String(doneTasks.length)}   color="#0E9594" />
      </KpiGrid>

      {/* Tabs + search */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => {
          const active = tab === t.key
          const col    = TAB_COLORS[t.key]
          return (
            <button key={t.key} onClick={() => { setTab(t.key as typeof tab); if (t.key !== 'projets') setFilterProject(null) }}
              style={{
                padding: '8px 18px', borderRadius: 9, cursor: 'pointer',
                background: active ? col : 'var(--bg-card)',
                color:      active ? '#fff' : 'var(--text-muted)',
                border:     active ? 'none' : `1px solid var(--border)`,
                outline:    active ? `2px solid ${col}44` : 'none',
                outlineOffset: 1,
                ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          )
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', width: 160 }} />
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 p-4 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Titre de la tâche…" autoFocus
            style={{ flex: '1 1 200px', ...inp }} />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as typeof newPriority)}
            style={{ ...inp, minWidth: 100 }}>
            <option value="urgent">Urgent</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ ...inp, minWidth: 130 }} />
          <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)}
            style={{ ...inp, minWidth: 120 }}>
            <option value="">Sans projet</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit"
            style={{ background: '#F2542D', color: '#fff', borderRadius: 8, padding: '8px 20px', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
            Créer
          </button>
        </form>
      )}

      {/* Lists + sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        <div className="md:col-span-2 flex flex-col gap-[10px]">

          {/* ── TOUTES ── */}
          {tab === 'toutes' && (
            <>
              <TaskSection title="Aujourd'hui"   color="#F2542D"           tasks={todayTasks}  onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
              <TaskSection title="Cette semaine" color="#0E9594"           tasks={weekTasks}   onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
              {lateTasks.length > 0 && (
                <TaskSection title="En retard"   color="#F2542D"           tasks={lateTasks}   onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} bg="rgba(242,84,45,0.05)" />
              )}
              <TaskSection title="Sans date"     color="var(--text-muted)" tasks={noDateTasks} onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
              {doneTasks.length > 0 && (
                <TaskSection title="Terminées"   color="#0E9594"           tasks={doneTasks.slice(0, 10)} onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} collapsed />
              )}
            </>
          )}

          {/* ── PRIORITÉS ── */}
          {tab === 'priorites' && (
            <>
              {priorityGroups.map(pg => {
                const pgTasks = filtered.filter(t => t.priority === pg.key && t.status !== 'done')
                return pgTasks.length > 0 ? (
                  <TaskSection key={pg.key} title={pg.label} color={pg.color} tasks={pgTasks}
                    onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
                ) : null
              })}
              {doneTasks.length > 0 && (
                <TaskSection title="Terminées" color="#0E9594" tasks={doneTasks.slice(0, 10)}
                  onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} collapsed />
              )}
              {filtered.filter(t => t.status !== 'done').length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0' }}>Aucune tâche active</p>
              )}
            </>
          )}

          {/* ── PAR PROJET ── */}
          {tab === 'projets' && (
            <>
              {filterProject && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: projects.find(p => p.id === filterProject)?.color ?? '#888', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text)' }}>{projects.find(p => p.id === filterProject)?.name}</span>
                  <button onClick={() => setFilterProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: 2 }}>
                    <X size={11} />
                  </button>
                </div>
              )}
              {projectGroups.map(g => (
                <TaskSection key={g.project.id} title={g.project.name} color={g.project.color}
                  tasks={g.tasks} onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
              ))}
              {noProjectTasks.length > 0 && (
                <TaskSection title="Sans projet" color="var(--text-muted)" tasks={noProjectTasks}
                  onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects} />
              )}
              {projectGroups.length === 0 && noProjectTasks.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0' }}>Aucune tâche active</p>
              )}
            </>
          )}

          {/* ── AUTOMATIQUES ── */}
          {tab === 'auto' && (
            <>
              {autoGroups.map(g => (
                <TaskSection key={g.key} title={g.label} color={g.color} tasks={g.tasks} bg={g.bg}
                  onToggle={toggle} onEdit={setEditingTask} loading={loading} projects={projects}
                  collapsed={g.key === 'done'} />
              ))}
              {autoGroups.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0' }}>Aucune tâche active</p>
              )}
            </>
          )}

        </div>

        <div className="flex flex-col gap-[10px]">
          <MiniCalendar tasks={tasks} />

          {/* Répartition priorités */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase', marginBottom: 12 }}>Répartition priorités</p>
            {(['urgent', 'high', 'medium', 'low'] as const).map(p => {
              const count = tasks.filter(t => t.priority === p && t.status !== 'done').length
              const total = tasks.filter(t => t.status !== 'done').length
              const pct   = total ? Math.round(count / total * 100) : 0
              return (
                <div key={p} className="flex items-center gap-2 mb-2">
                  <span style={{ ...DF, fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[p], width: 56 }}>{PRIORITY_LABELS[p]}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: PRIORITY_COLOR[p], width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>

          {/* Projets */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 10 }}>Projets</p>
            {projects.map(p => {
              const count   = tasks.filter(t => t.project_id === p.id && t.status !== 'done').length
              const isActive = filterProject === p.id
              return (
                <button key={p.id}
                  onClick={() => {
                    setFilterProject(isActive ? null : p.id)
                    setTab(isActive ? 'toutes' : 'projets')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 8px', borderRadius: 7, marginBottom: 2,
                    background: isActive ? p.color + '22' : 'transparent',
                    border: isActive ? `1px solid ${p.color}44` : '1px solid transparent',
                    cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: isActive ? p.color : 'var(--text)', fontWeight: isActive ? 700 : 400 }}>{p.name}</span>
                  </div>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: isActive ? p.color : 'var(--text-muted)' }}>{count}</span>
                </button>
              )
            })}
            {projects.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucun projet</p>}
            {filterProject && (
              <button onClick={() => { setFilterProject(null); setTab('toutes') }}
                style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={9} /> Réinitialiser le filtre
              </button>
            )}
          </div>

          {/* Filtres rapides */}
          <div style={{ background: '#F2542D', borderRadius: 12, padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#1A0A0A', textTransform: 'uppercase', marginBottom: 10 }}>Filtres rapides</p>
            {[
              { label: 'Sans projet', count: tasks.filter(t => !t.project_id && t.status !== 'done').length },
              { label: 'Avec date',   count: tasks.filter(t => t.due_date   && t.status !== 'done').length },
              { label: 'Favoris',     count: 0 },
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

    {/* Edit modal */}
    {editingTask && (
      <EditTaskModal
        task={editingTask}
        projects={projects}
        onSave={update}
        onDelete={async (id) => { await remove(id) }}
        onClose={() => setEditingTask(null)}
      />
    )}
    </>
  )
}

// ─── Task section ─────────────────────────────────────────────────────────────
function TaskSection({
  title, color, tasks, onToggle, onEdit, loading, collapsed = false, bg, projects,
}: {
  title: string
  color: string
  tasks: Task[]
  onToggle: (id: string, s: Task['status']) => void
  onEdit: (t: Task) => void
  loading: boolean
  collapsed?: boolean
  bg?: string
  projects: Array<{ id: string; name: string; color: string }>
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
        loading
          ? <p className="text-xs p-5" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
          : tasks.length === 0
            ? <p className="text-xs p-5" style={{ color: 'var(--text-muted)' }}>Aucune tâche</p>
            : tasks.map(t => {
                const proj = projects.find(p => p.id === t.project_id)
                return (
                  <div key={t.id}
                    className="flex items-center gap-3 px-5 py-3 group"
                    style={{ borderBottom: '1px solid var(--border)' }}>

                    {/* Checkbox */}
                    <button onClick={() => onToggle(t.id, t.status)} style={{ flexShrink: 0 }}>
                      {t.status === 'done'
                        ? <CheckCircle2 size={16} style={{ color: '#0E9594' }} />
                        : <Circle size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {t.due_date && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={9} />{t.due_date}
                          </span>
                        )}
                        {proj && (
                          <span style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 2, background: proj.color, flexShrink: 0, display: 'inline-block' }} />
                            {proj.name}
                          </span>
                        )}
                        {t.status === 'in_progress' && (
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(14,149,148,0.12)', color: '#0E9594', ...DF, fontWeight: 700 }}>En cours</span>
                        )}
                      </div>
                    </div>

                    {/* Priority badge */}
                    {t.priority && t.status !== 'done' && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: PRIORITY_BG[t.priority], color: PRIORITY_COLOR[t.priority], ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                        {t.priority}
                      </span>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => onEdit(t)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ padding: '4px 6px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#F2542D')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <Pencil size={11} />
                    </button>
                  </div>
                )
              })
      )}
    </div>
  )
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const today    = new Date()
  const year     = today.getFullYear()
  const month    = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay() || 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = [
    ...Array.from({ length: firstDay - 1 }, (): number | null => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const taskDates = new Set(tasks.map(t => t.due_date))
  const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
      <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 10 }}>Calendrier</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'capitalize' }}>{monthName}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, padding: '2px 0' }}>{d}</span>
        ))}
        {days.map((d, i) => {
          if (!d) return <span key={i} />
          const iso    = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const isToday  = d === today.getDate()
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
