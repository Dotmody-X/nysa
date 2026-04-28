'use client'
import { useState } from 'react'
import { Plus, Search, ArrowRight, Clock, CheckSquare, TrendingUp } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useTasks }    from '@/hooks/useTasks'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

export default function ProjetsPage() {
  const { projects, loading, create } = useProjects()
  const { tasks } = useTasks()
  const [filter, setFilter] = useState<'tous'|'actifs'|'termines'|'archives'>('actifs')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#0E9594', description: '' })

  const activeProjects  = projects.filter(p => p.status === 'active')
  const doneProjects    = projects.filter(p => p.status === 'done')
  const filtered = projects.filter(p => {
    if (filter === 'actifs')   return p.status === 'active'
    if (filter === 'termines') return p.status === 'done'
    if (filter === 'archives') return p.status === 'archived'
    return true
  }).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const selectedProject = projects.find(p => p.id === selected) ?? filtered[0] ?? null
  const projectTasks = tasks.filter(t => t.project_id === selectedProject?.id)
  const doneProjTasks = projectTasks.filter(t => t.status === 'done')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await create({ name: form.name.trim(), color: form.color, description: form.description, status: 'active', progress: 0 })
    setShowForm(false); setForm({ name: '', color: '#0E9594', description: '' })
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <PageTitle
        title="Projets"
        sub="Membres · Suivi · Liens"
        right={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: '#F2542D', color: '#fff', ...DF, fontWeight: 700, fontSize: 12 }}>
            <Plus size={14} /> Nouveau projet
          </button>
        }
      />

      <KpiGrid>
        <KpiCard label="En cours"       value={String(activeProjects.length)}              color="#F2542D" />
        <KpiCard label="Terminés"       value={String(doneProjects.length)}                color="#0E9594" />
        <KpiCard label="Taux réussite"  value={projects.length ? `${Math.round(doneProjects.length/projects.length*100)}%` : '—'} color="#F5DFBB" />
        <KpiCard label="Total tâches"   value={String(tasks.length)}                       sub="toutes catégories" />
      </KpiGrid>

      {/* Filters + search */}
      <div className="flex gap-2 flex-wrap">
        {(['tous','actifs','termines','archives'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg capitalize"
            style={{ background: filter === f ? '#F2542D' : 'var(--bg-card)', color: filter === f ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', ...DF, fontSize: 11, fontWeight: 700 }}>
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un projet…"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', width: 180 }} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-2 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="Nom du projet…" autoFocus
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color:e.target.value}))}
            style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', padding: 2, cursor: 'pointer', background: 'var(--bg-input)' }} />
          <button type="submit" style={{ background: '#F2542D', color: '#fff', borderRadius: 8, padding: '8px 20px', ...DF, fontWeight: 700, fontSize: 12 }}>Créer</button>
        </form>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Project cards list */}
        <div className="md:col-span-2">
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun projet</p>
              <button onClick={() => setShowForm(true)} style={{ color: '#F2542D', ...DF, fontWeight: 700, fontSize: 12 }}>+ Créer un projet</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
              {filtered.map(p => {
                const pTasks = tasks.filter(t => t.project_id === p.id)
                const pDone  = pTasks.filter(t => t.status === 'done').length
                const pct    = pTasks.length ? Math.round(pDone/pTasks.length*100) : p.progress ?? 0
                const isSelected = selectedProject?.id === p.id
                return (
                  <button key={p.id} onClick={() => setSelected(p.id)}
                    className="text-left p-5 flex flex-col gap-3"
                    style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${isSelected ? p.color : 'var(--border)'}`, transition: 'all 0.15s' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                        <span style={{ ...DF, fontWeight: 800, fontSize: 14, color: 'var(--wheat)' }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: p.status === 'active' ? 'rgba(14,149,148,0.15)' : 'rgba(80,80,80,0.15)', color: p.status === 'active' ? '#0E9594' : 'var(--text-muted)', ...DF, fontWeight: 700, textTransform: 'uppercase' }}>
                        {p.status}
                      </span>
                    </div>
                    {p.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.description}</p>}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pDone}/{pTasks.length} tâches</span>
                        <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: p.color }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: p.color, width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    {p.deadline && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        <Clock size={9} style={{ display:'inline', marginRight: 3 }} />
                        {new Date(p.deadline + 'T12:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected project detail */}
        {selectedProject && (
          <div className="flex flex-col gap-[10px]">
            <div style={{ background: selectedProject.color, borderRadius: 12, padding: 20 }}>
              <p style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Projet sélectionné</p>
              <p style={{ ...DF, fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 8 }}>{selectedProject.name}</p>
              {selectedProject.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{selectedProject.description}</p>}
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase', marginBottom: 12 }}>Tâches récentes</p>
              {projectTasks.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune tâche</p>
              ) : (
                projectTasks.slice(0,6).map(t => (
                  <div key={t.id} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <CheckSquare size={12} style={{ color: t.status === 'done' ? '#0E9594' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none', flex: 1 }}>{t.title}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 8 }}>Progression</p>
              <div className="flex items-end justify-between">
                <div>
                  <p style={{ ...DF, fontWeight: 900, fontSize: 36, color: selectedProject.color, lineHeight: 1 }}>
                    {projectTasks.length ? Math.round(doneProjTasks.length/projectTasks.length*100) : selectedProject.progress ?? 0}%
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{doneProjTasks.length}/{projectTasks.length} terminées</p>
                </div>
                <TrendingUp size={28} style={{ color: selectedProject.color, opacity: 0.4 }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
