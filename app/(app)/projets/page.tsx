'use client'

import { useState } from 'react'
import { Plus, X, Calendar, TrendingUp, Clock, CheckSquare } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useTasks }    from '@/hooks/useTasks'
import { PageHeader }  from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { Badge }       from '@/components/ui/Badge'
import { Button }      from '@/components/ui/Button'
import type { Project } from '@/types'

// ─── Utils ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', completed: 'Terminé', archived: 'Archivé', paused: 'Pause',
}
const STATUS_VARIANT: Record<string, 'cyan'|'teal'|'wheat'|'fiery'> = {
  active: 'cyan', completed: 'teal', archived: 'wheat', paused: 'fiery',
}
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
}

const COLORS = ['#F2542D','#0E9594','#11686A','#F5DFBB','#562C2C','#E05A00','#007B7B','#3D8B6B']

// ─── Modal création / édition ─────────────────────────────────────────────────
function ProjectModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Project>
  onSave:  (p: Partial<Project>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    status:      initial?.status      ?? 'active',
    priority:    initial?.priority    ?? 'medium',
    color:       initial?.color       ?? '#F2542D',
    budget:      initial?.budget      ? String(initial.budget) : '',
    deadline:    initial?.deadline    ?? '',
    progress:    initial?.progress    ?? 0,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      budget:   form.budget ? parseFloat(form.budget) : undefined,
      deadline: form.deadline || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-lg" padding="lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--wheat)' }}>
            {initial?.id ? 'Modifier le projet' : 'Nouveau projet'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nom */}
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Nom *</label>
            <input
              required autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] text-sm outline-none resize-none"
              style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Statut */}
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Statut</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Project['status'] }))}
                className="w-full px-3 py-2 rounded-[8px] text-xs outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
                <option value="active">Actif</option>
                <option value="paused">En pause</option>
                <option value="completed">Terminé</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            {/* Priorité */}
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Priorité</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Project['priority'] }))}
                className="w-full px-3 py-2 rounded-[8px] text-xs outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Budget (€)</label>
              <input type="number" min="0" step="0.01"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Deadline</label>
              <input type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          {/* Progression */}
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 flex justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>Progression</span><span>{form.progress}%</span>
            </label>
            <input type="range" min="0" max="100"
              value={form.progress}
              onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>Couleur</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              {initial?.id ? 'Sauvegarder' : 'Créer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Carte projet ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, selected }: { project: Project; onClick: () => void; selected: boolean }) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-[10px] cursor-pointer transition-all"
      style={{
        background:   selected ? 'rgba(242,84,45,0.08)' : 'var(--bg-card)',
        border:       `1px solid ${selected ? 'rgba(242,84,45,0.3)' : 'var(--border)'}`,
        borderLeft:   `3px solid ${project.color}`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--wheat)' }}>{project.name}</p>
        <Badge variant={STATUS_VARIANT[project.status] ?? 'wheat'} className="text-[9px] shrink-0 ml-2">
          {STATUS_LABEL[project.status]}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{project.description}</p>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: project.color }} />
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{project.progress}%</span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {project.deadline && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={9} />
            {new Date(project.deadline).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
        {project.budget && (
          <span className="text-[10px]" style={{ color: '#0E9594' }}>
            {project.budget.toLocaleString('fr-BE')} €
          </span>
        )}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-subtle)' }}>
          {PRIORITY_LABEL[project.priority]}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjetsPage() {
  const { projects, loading, create, update, remove } = useProjects()
  const [selected,   setSelected]   = useState<Project | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<Project | undefined>()
  const { tasks } = useTasks(selected?.id)

  const stats = {
    active:    projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    avgProgress: projects.length
      ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)
      : 0,
  }

  function openCreate()           { setEditTarget(undefined); setShowModal(true) }
  function openEdit(p: Project)   { setEditTarget(p);         setShowModal(true) }

  async function handleSave(payload: Partial<Project>) {
    if (editTarget?.id) await update(editTarget.id, payload)
    else                await create(payload as Omit<Project,'id'|'user_id'|'created_at'|'updated_at'>)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader
        title="Projets"
        sub={`${stats.active} actifs · ${stats.avgProgress}% progression moyenne`}
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={13} /> Nouveau projet
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Projets actifs',  value: stats.active,     icon: <TrendingUp size={13}/>, color: '#F2542D' },
          { label: 'Terminés',        value: stats.completed,  icon: <CheckSquare size={13}/>,color: '#0E9594' },
          { label: 'Progression moy.',value: `${stats.avgProgress}%`, icon: <TrendingUp size={13}/>, color: '#F5DFBB' },
          { label: 'Total',           value: projects.length,  icon: <Clock size={13}/>,      color: '#11686A' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color }}>{icon}</span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--wheat)' }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-5">

        {/* Liste */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
          ) : projects.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun projet.</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={openCreate}><Plus size={12}/>Créer</Button>
            </Card>
          ) : projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => setSelected(s => s?.id === p.id ? null : p)}
              selected={selected?.id === p.id}
            />
          ))}
        </div>

        {/* Détail */}
        {selected ? (
          <Card padding="lg" className="self-start">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
                  <h2 className="text-base font-bold" style={{ color: 'var(--wheat)' }}>{selected.name}</h2>
                </div>
                {selected.description && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(selected)}>Modifier</Button>
                <Button variant="danger" size="sm" onClick={async () => { await remove(selected.id); setSelected(null) }}>Supprimer</Button>
              </div>
            </div>

            {/* Progression */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Progression</span><span>{selected.progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${selected.progress}%`, background: selected.color }} />
              </div>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
              {[
                { label: 'Statut',   value: STATUS_LABEL[selected.status] },
                { label: 'Priorité', value: PRIORITY_LABEL[selected.priority] },
                { label: 'Budget',   value: selected.budget ? `${selected.budget.toLocaleString('fr-BE')} €` : '—' },
                { label: 'Deadline', value: selected.deadline ? new Date(selected.deadline).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-[8px]" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p style={{ color: 'var(--wheat)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Tâches liées */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>
                Tâches ({tasks.length})
              </p>
              {tasks.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Aucune tâche liée à ce projet.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {tasks.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: t.status === 'done' ? '#0E9594' : '#F2542D' }}
                      />
                      <span style={{ color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)',
                        textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                        {t.title}
                      </span>
                    </div>
                  ))}
                  {tasks.length > 8 && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>+{tasks.length - 8} autres…</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center py-16 self-start">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>← Sélectionne un projet pour voir les détails</p>
          </Card>
        )}
      </div>

      {showModal && (
        <ProjectModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
