'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Plus, Search, MoreVertical, X, Pencil, Trash2,
  CheckSquare, ChevronRight, Link2, Users, Calendar,
} from 'lucide-react'
import { useProjects }    from '@/hooks/useProjects'
import { useTasks }       from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import type { Project }   from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes marques
// ─────────────────────────────────────────────────────────────────────────────
export const GROUPES = [
  { value: 'Le Mixologue', color: '#F2542D' },
  { value: 'E-Smoker',     color: '#0E9594' },
  { value: 'Aeterna',      color: '#9333EA' },
  { value: 'Interne',      color: '#D97706' },
  { value: 'Autre',        color: '#6B7280' },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtHours(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`
}

function groupeColor(g: string | undefined): string {
  return GROUPES.find(x => x.value === g)?.color ?? '#6B7280'
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Actif',    color: '#0E9594', bg: 'rgba(14,149,148,0.12)'   },
  paused:    { label: 'En pause', color: '#D97706', bg: 'rgba(217,119,6,0.12)'    },
  completed: { label: 'Terminé',  color: '#16A34A', bg: 'rgba(22,163,74,0.12)'    },
  archived:  { label: 'Archivé',  color: '#6B7280', bg: 'rgba(107,114,128,0.12)'  },
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'Basse',   color: '#6B7280' },
  medium: { label: 'Moyenne', color: '#D97706' },
  high:   { label: 'Haute',   color: '#F2542D' },
  urgent: { label: 'Urgente', color: '#DC2626' },
}

const TASK_STATUS_META: Record<string, { label: string; color: string }> = {
  todo:        { label: 'À faire',  color: '#6B7280' },
  in_progress: { label: 'En cours', color: '#D97706' },
  done:        { label: 'Terminé',  color: '#16A34A' },
  cancelled:   { label: 'Annulé',   color: '#DC2626' },
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Donut
// ─────────────────────────────────────────────────────────────────────────────
function Donut({ pct, color, size = 80, stroke = 10 }: {
  pct: number; color: string; size?: number; stroke?: number
}) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown générique
// ─────────────────────────────────────────────────────────────────────────────
function Dropdown<T extends string>({
  value, options, onChange, label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, color: 'var(--wheat)', ...DF, fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {label && <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>{label} :</span>}
        {current?.label}
        <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 0', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', fontSize: 11, color: o.value === value ? '#F2542D' : 'var(--wheat)', background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: o.value === value ? 700 : 400 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Projet (création + édition)
// ─────────────────────────────────────────────────────────────────────────────
function ProjectModal({
  project, onSave, onCreate, onDelete, onClose,
}: {
  project?:  Project
  onSave?:   (id: string, patch: Partial<Project>) => Promise<unknown>
  onCreate?: (payload: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<unknown>
  onDelete?: (id: string) => Promise<unknown>
  onClose:   () => void
}) {
  const isEdit = !!project
  const [form, setForm] = useState({
    name:        project?.name        ?? '',
    color:       project?.color       ?? '#0E9594',
    description: project?.description ?? '',
    status:      (project?.status     ?? 'active')  as Project['status'],
    priority:    (project?.priority   ?? 'medium')  as Project['priority'],
    deadline:    project?.deadline    ?? '',
    budget:      project?.budget ? String(project.budget) : '',
    groupe:      project?.groupe      ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(false)

  const inp: React.CSSProperties = {
    background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%',
  }

  async function submit() {
    setSaving(true)
    const payload = {
      name: form.name.trim(), color: form.color,
      description: form.description || undefined,
      status: form.status, priority: form.priority,
      deadline: form.deadline || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      groupe: form.groupe || undefined,
    }
    if (isEdit && onSave && project) {
      await onSave(project.id, payload)
    } else if (onCreate) {
      await onCreate({ ...payload, progress: 0 })
    }
    setSaving(false)
    onClose()
  }

  const gc = groupeColor(form.groupe)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <p style={{ ...DF, fontWeight: 700, fontSize: 14, color: 'var(--wheat)' }}>
            {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
          </p>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Nom + couleur */}
        <div className="flex gap-2 items-center">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom du projet" style={{ ...inp, flex: 1 }} autoFocus />
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: 3, cursor: 'pointer', background: 'var(--bg)', flexShrink: 0 }} />
        </div>

        {/* Groupe / Marque */}
        <div>
          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
            Marque / Catégorie
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...GROUPES.map(g => g.value)].map(g => {
              const active = form.groupe === g
              const gColor = groupeColor(g)
              return (
                <button key={g || 'none'} onClick={() => setForm(f => ({ ...f, groupe: g }))}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                    background: active ? `${gColor}22` : 'var(--bg)',
                    color: active ? gColor : 'var(--text-muted)',
                    border: `1px solid ${active ? gColor + '66' : 'var(--border)'}`,
                    ...DF, fontWeight: active ? 700 : 500, transition: 'all 0.12s',
                  } as React.CSSProperties}>
                  {g || 'Non classé'}
                </button>
              )
            })}
          </div>
        </div>

        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description…" rows={2} style={{ ...inp, resize: 'none' }} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Statut</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Project['status'] }))} style={inp}>
              <option value="active">Actif</option>
              <option value="paused">En pause</option>
              <option value="completed">Terminé</option>
              <option value="archived">Archivé</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Priorité</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Project['priority'] }))} style={inp}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Budget (€)</label>
            <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" style={inp} />
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: form.color + '15', border: `1px solid ${form.color}44` }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: form.color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: form.color }}>{form.name || 'Aperçu'}</span>
          {form.groupe && (
            <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 20, background: gc + '22', color: gc, ...DF, fontWeight: 700, textTransform: 'uppercase' }}>
              {form.groupe}
            </span>
          )}
        </div>

        <div className="flex gap-2 justify-between items-center">
          {isEdit && onDelete && !confirm && (
            <button onClick={() => setConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} /> Supprimer
            </button>
          )}
          {confirm && (
            <div className="flex gap-2 items-center">
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Confirmer ?</span>
              <button onClick={() => setConfirm(false)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Non</button>
              <button onClick={async () => { await onDelete!(project!.id); onClose() }}
                style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#F2542D', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Oui
              </button>
            </div>
          )}
          {!confirm && !isEdit && <div />}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose}
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={submit} disabled={saving || !form.name.trim()}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : isEdit ? 'Sauvegarder' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────
type StatusFilter = 'tous' | 'active' | 'paused' | 'completed' | 'archived'
type TabType      = 'apercu' | 'taches' | 'temps' | 'fichiers' | 'notes' | 'parametres'

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────
export default function ProjetsPage() {
  const { projects, loading, create, update, remove } = useProjects()
  const { tasks }   = useTasks()
  const { entries } = useTimeEntries()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<string | null>(null)
  const [tab,          setTab]          = useState<TabType>('apercu')
  const [editModal,    setEditModal]    = useState<Project | null>(null)
  const [createModal,  setCreateModal]  = useState(false)
  const [contextMenu,  setContextMenu]  = useState<{ projectId: string; x: number; y: number } | null>(null)
  const cmRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (cmRef.current && !cmRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── Données dérivées ───────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    if (statusFilter !== 'tous' && p.status !== statusFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeProjects = projects.filter(p => p.status === 'active')
  const activeTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const totalSec       = entries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

  // Temps par groupe (marque) — toutes les entries de la semaine
  const timeByGroupe: Record<string, { sec: number; color: string }> = {}
  GROUPES.forEach(g => { timeByGroupe[g.value] = { sec: 0, color: g.color } })
  timeByGroupe['Non classé'] = { sec: 0, color: '#6B7280' }
  entries.forEach(e => {
    if (!e.duration_seconds) return
    const proj  = projects.find(p => p.id === e.project_id)
    const key   = proj?.groupe ?? 'Non classé'
    if (!timeByGroupe[key]) timeByGroupe[key] = { sec: 0, color: groupeColor(key) }
    timeByGroupe[key].sec += e.duration_seconds
  })
  const groupeRows = Object.entries(timeByGroupe)
    .filter(([, v]) => v.sec > 0)
    .sort(([, a], [, b]) => b.sec - a.sec)
  const maxGroupeSec = groupeRows[0]?.[1]?.sec ?? 1

  // Projets groupés par marque pour l'affichage
  const groupedProjects: Record<string, Project[]> = {}
  const GROUPE_ORDER = [...GROUPES.map(g => g.value), 'Non classé']
  filtered.forEach(p => {
    const key = p.groupe ?? 'Non classé'
    if (!groupedProjects[key]) groupedProjects[key] = []
    groupedProjects[key].push(p)
  })
  const orderedGroupes = GROUPE_ORDER.filter(g => groupedProjects[g]?.length > 0)

  // Projet sélectionné
  const selectedProject = projects.find(p => p.id === selected) ?? filtered[0] ?? null
  const projTasks  = tasks.filter(t => t.project_id === selectedProject?.id)
  const doneTasks  = projTasks.filter(t => t.status === 'done')
  const pct        = projTasks.length
    ? Math.round(doneTasks.length / projTasks.length * 100)
    : selectedProject?.progress ?? 0
  const projSec = entries
    .filter(e => e.project_id === selectedProject?.id)
    .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

  function handleSelectProject(id: string) {
    setSelected(id)
    setTab('apercu')
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700,
  }

  const TABS: { id: TabType; label: string }[] = [
    { id: 'apercu',     label: 'APERÇU'     },
    { id: 'taches',     label: 'TÂCHES'     },
    { id: 'temps',      label: 'TEMPS'      },
    { id: 'fichiers',   label: 'FICHIERS'   },
    { id: 'notes',      label: 'NOTES'      },
    { id: 'parametres', label: 'PARAMÈTRES' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 30, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignContent: 'start' }}>

      {/* ── ROW 1 : Hero (2 cols) + VUE GLOBALE marques (2 cols) — 300px ──── */}

      {/* Hero */}
      <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 300, padding: '10px 0 20px 0' }}>
        <p style={{ fontSize: 11, ...DF, fontWeight: 700, color: '#F2542D', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Projets
        </p>
        <h1 style={{ ...DF, fontWeight: 900, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 1, color: 'var(--wheat)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          Gérez.<br />Livrez.
        </h1>
        <p style={{ ...DF, fontSize: 12, fontWeight: 500, color: '#0E9594', marginTop: 12 }}>
          {projects.length} projet{projects.length !== 1 ? 's' : ''} · {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* VUE GLOBALE — 4 marques avec temps semaine */}
      <div className="col-span-2" style={{ ...card, background: '#F2542D', border: '1px solid #F2542D', height: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Vue par marque</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{totalSec > 0 ? fmtHours(totalSec) : '—'} cette semaine</span>
        </div>
        {/* 4 cellules : Mixologue / E-Smoker / Aeterna / Interne */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
          {GROUPES.filter(g => g.value !== 'Autre').map((g, i) => {
            const sec      = timeByGroupe[g.value]?.sec ?? 0
            const projCount = projects.filter(p => p.groupe === g.value && p.status === 'active').length
            return (
              <div key={g.value} style={{
                padding: '16px 20px',
                borderRight:  i % 2 === 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                borderBottom: i < 2       ? '1px solid rgba(255,255,255,0.2)' : 'none',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', flexShrink: 0 }} />
                  <span style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{g.value}</span>
                </div>
                <div>
                  <p style={{ ...DF, fontWeight: 900, fontSize: 24, color: '#fff', lineHeight: 1 }}>
                    {sec > 0 ? fmtHours(sec) : '—'}
                  </p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                    {projCount} projet{projCount !== 1 ? 's' : ''} actif{projCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ROW 2 : Barre de filtres ────────────────────────────────────────── */}
      <div className="col-span-4" style={{ ...card, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', flex: 1, minWidth: 160 }}>
          <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un projet…"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', width: '100%' }} />
        </div>

        <Dropdown<StatusFilter>
          value={statusFilter}
          label="Statut"
          options={[
            { value: 'tous',      label: 'Tous'     },
            { value: 'active',    label: 'Actifs'   },
            { value: 'paused',    label: 'En pause' },
            { value: 'completed', label: 'Terminés' },
            { value: 'archived',  label: 'Archivés' },
          ]}
          onChange={setStatusFilter}
        />
        <div style={{ flex: 1 }} />
        <button onClick={() => setCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          <Plus size={13} /> NOUVEAU PROJET
        </button>
      </div>

      {/* ── ROW 3 : PROJETS PAR MARQUE ───────────────────────────────────────── */}
      <div className="col-span-4" style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={sectionLabel}>Projets récents</p>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} projet{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Aucun projet</p>
            <button onClick={() => setCreateModal(true)} style={{ color: '#F2542D', fontSize: 12, ...DF, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>+ Créer un projet</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orderedGroupes.map((groupeName, gi) => {
              const gColor   = groupeColor(groupeName)
              const gProjs   = groupedProjects[groupeName] ?? []
              const gSec     = timeByGroupe[groupeName]?.sec ?? 0
              return (
                <div key={groupeName} style={{ borderBottom: gi < orderedGroupes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {/* Header groupe */}
                  <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: gColor, flexShrink: 0 }} />
                    <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: gColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{groupeName}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>{gProjs.length} projet{gProjs.length !== 1 ? 's' : ''}</span>
                    {gSec > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: gColor, ...DF, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: gColor + '15', border: `1px solid ${gColor}33` }}>
                        {fmtHours(gSec)} cette semaine
                      </span>
                    )}
                  </div>
                  {/* Cards horizontales */}
                  <div style={{ display: 'flex', gap: 10, padding: '6px 20px 14px', overflowX: 'auto', scrollbarWidth: 'thin' }}>
                    {gProjs.map(p => {
                      const pTasks   = tasks.filter(t => t.project_id === p.id)
                      const pDone    = pTasks.filter(t => t.status === 'done').length
                      const ppct     = pTasks.length ? Math.round(pDone / pTasks.length * 100) : p.progress ?? 0
                      const sm       = STATUS_META[p.status] ?? STATUS_META.active
                      const isActive = selectedProject?.id === p.id

                      return (
                        <div key={p.id} onClick={() => handleSelectProject(p.id)}
                          style={{
                            flexShrink: 0, width: 210, padding: 14, borderRadius: 10, cursor: 'pointer',
                            background: isActive ? `${p.color}15` : 'var(--bg)',
                            border: `1px solid ${isActive ? p.color : 'var(--border)'}`,
                            display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.15s',
                          }}>
                          {/* Badge + ⋮ */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: sm.bg, color: sm.color, ...DF, fontWeight: 700, textTransform: 'uppercase' }}>
                              {sm.label}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setContextMenu({ projectId: p.id, x: e.clientX, y: e.clientY }) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                              onMouseEnter={ev => (ev.currentTarget.style.color = 'var(--wheat)')}
                              onMouseLeave={ev => (ev.currentTarget.style.color = 'var(--text-muted)')}>
                              <MoreVertical size={13} />
                            </button>
                          </div>
                          {/* Dot + nom */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                            <span style={{ ...DF, fontWeight: 800, fontSize: 13, color: 'var(--wheat)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          </div>
                          {/* Barre avancement */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pDone}/{pTasks.length} tâches</span>
                              <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: p.color }}>{ppct}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: p.color, width: `${ppct}%`, transition: 'width 0.4s' }} />
                            </div>
                          </div>
                          {/* Footer deadline */}
                          {p.deadline && (
                            <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={9} />
                              {new Date(p.deadline + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ROW 4 : PROJET SÉLECTIONNÉ ───────────────────────────────────────── */}
      {selectedProject && (
        <div className="col-span-4" style={{ ...card, overflow: 'hidden' }}>
          {/* Header coloré avec badge marque */}
          <div style={{ background: selectedProject.color, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ ...DF, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Projet sélectionné
              </p>
              <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <p style={{ ...DF, fontWeight: 800, fontSize: 14, color: '#fff' }}>{selectedProject.name}</p>
              {selectedProject.groupe && (
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.25)', color: '#fff', ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedProject.groupe}
                </span>
              )}
            </div>
            <button onClick={() => setEditModal(selectedProject)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, background: 'rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 700, ...DF }}>
              <Pencil size={10} /> Modifier
            </button>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 16px', fontSize: 10, fontWeight: 700, ...DF, letterSpacing: '0.07em',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t.id ? selectedProject.color : 'var(--text-muted)',
                  borderBottom: `2px solid ${tab === t.id ? selectedProject.color : 'transparent'}`,
                  marginBottom: -1, transition: 'all 0.12s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* APERÇU */}
          {tab === 'apercu' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {/* Informations */}
              <div style={{ padding: 20, borderRight: '1px solid var(--border)' }}>
                <p style={{ ...sectionLabel, marginBottom: 14 }}>Informations</p>
                {selectedProject.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{selectedProject.description}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Marque',   value: selectedProject.groupe ?? '—' },
                    { label: 'Statut',   value: STATUS_META[selectedProject.status]?.label    ?? selectedProject.status   },
                    { label: 'Priorité', value: PRIORITY_META[selectedProject.priority]?.label ?? selectedProject.priority },
                    { label: 'Deadline', value: selectedProject.deadline
                        ? new Date(selectedProject.deadline + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                        : '—' },
                    { label: 'Budget',   value: selectedProject.budget ? `${selectedProject.budget.toLocaleString('fr-FR')} €` : '—' },
                    { label: 'Tâches',   value: `${projTasks.length} total · ${doneTasks.length} terminée${doneTasks.length > 1 ? 's' : ''}` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: row.label === 'Marque' ? groupeColor(selectedProject.groupe) : 'var(--wheat)', fontWeight: row.label === 'Marque' ? 700 : 500 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avancement */}
              <div style={{ padding: 20, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <p style={{ ...sectionLabel, alignSelf: 'flex-start' }}>Avancement</p>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Donut pct={pct} color={selectedProject.color} size={120} stroke={12} />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <p style={{ ...DF, fontWeight: 900, fontSize: 26, color: 'var(--wheat)', lineHeight: 1 }}>{pct}%</p>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>terminé</p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {doneTasks.length} / {projTasks.length} tâche{projTasks.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Temps & budget */}
              <div style={{ padding: 20 }}>
                <p style={{ ...sectionLabel, marginBottom: 14 }}>Temps & budget</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Temps cette semaine</p>
                    <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: selectedProject.color }}>{projSec > 0 ? fmtHours(projSec) : '—'}</p>
                  </div>
                  {selectedProject.budget ? (
                    <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Budget</p>
                      <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>{selectedProject.budget.toLocaleString('fr-FR')} €</p>
                    </div>
                  ) : null}
                  <div style={{ padding: 12, borderRadius: 8, background: `${selectedProject.color}12`, border: `1px solid ${selectedProject.color}33` }}>
                    <p style={{ fontSize: 9, color: selectedProject.color, ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Priorité</p>
                    <p style={{ ...DF, fontWeight: 800, fontSize: 14, color: PRIORITY_META[selectedProject.priority]?.color ?? 'var(--wheat)' }}>
                      {PRIORITY_META[selectedProject.priority]?.label ?? selectedProject.priority}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÂCHES */}
          {tab === 'taches' && (
            <div style={{ padding: 20 }}>
              {projTasks.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune tâche pour ce projet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {projTasks.map(t => {
                    const sm2 = TASK_STATUS_META[t.status] ?? { label: t.status, color: '#555' }
                    const pm2 = PRIORITY_META[t.priority]  ?? { label: t.priority, color: '#555' }
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <CheckSquare size={12} style={{ color: t.status === 'done' ? '#0E9594' : 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                        <span style={{ fontSize: 10, color: sm2.color, fontWeight: 600 }}>{sm2.label}</span>
                        <span style={{ fontSize: 10, color: pm2.color, fontWeight: 600 }}>{pm2.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {(tab === 'temps' || tab === 'fichiers' || tab === 'notes' || tab === 'parametres') && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Section en cours de développement</p>
            </div>
          )}
        </div>
      )}

      {/* ── ROW 5 : TÂCHES (col-span-3) + ÉQUIPE (col-span-1) — 500px ──────── */}
      {selectedProject && (
        <>
          <div className="col-span-3" style={{ ...card, minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <p style={sectionLabel}>Tâches récentes</p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{projTasks.length} tâche{projTasks.length !== 1 ? 's' : ''}</span>
            </div>
            {projTasks.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune tâche</p>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['TÂCHE', 'STATUT', 'PRIORITÉ', 'ÉCHÉANCE'].map(h => (
                    <span key={h} style={{ fontSize: 9, color: 'var(--text-muted)', ...DF, fontWeight: 700, letterSpacing: '0.1em' }}>{h}</span>
                  ))}
                </div>
                {projTasks.map((t, i) => {
                  const sm2 = TASK_STATUS_META[t.status] ?? { label: t.status, color: '#555' }
                  const pm2 = PRIORITY_META[t.priority]  ?? { label: t.priority, color: '#555' }
                  return (
                    <div key={t.id}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 80px', padding: '10px 20px', borderBottom: i < projTasks.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <CheckSquare size={12} style={{ color: t.status === 'done' ? '#0E9594' : 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      </div>
                      <span style={{ fontSize: 10, color: sm2.color, fontWeight: 600 }}>{sm2.label}</span>
                      <span style={{ fontSize: 10, color: pm2.color, fontWeight: 600 }}>{pm2.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ ...card, minHeight: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <p style={sectionLabel}>Équipe</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${selectedProject.color}22`, border: `2px solid ${selectedProject.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} style={{ color: selectedProject.color }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>Gestion d'équipe<br />à venir</p>
            </div>
          </div>
        </>
      )}

      {/* ── ROW 6 : RÉPARTITION PAR MARQUE (teal, col-span-2) + ACTIVITÉ + LIENS */}

      {/* RÉPARTITION PAR MARQUE */}
      <div className="col-span-2" style={{ ...card, background: '#0E9594', border: '1px solid #0E9594', minHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Répartition par marque</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Cette semaine · {totalSec > 0 ? fmtHours(totalSec) : '—'}</p>
        </div>
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groupeRows.length === 0 ? (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', paddingTop: 20, textAlign: 'center' }}>
              Aucun temps enregistré cette semaine.
            </p>
          ) : groupeRows.map(([name, { sec }]) => {
            const pct2 = Math.round(sec / maxGroupeSec * 100)
            return (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
                    <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{fmtHours(sec)}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginLeft: 6 }}>{totalSec > 0 ? Math.round(sec / totalSec * 100) : 0}%</span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: '#fff', width: `${pct2}%`, opacity: 0.85, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
          {/* Total */}
          {groupeRows.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', ...DF, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total semaine</span>
                <span style={{ ...DF, fontWeight: 900, fontSize: 18, color: '#fff' }}>{fmtHours(totalSec)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVITÉ RÉCENTE */}
      <div style={{ ...card, minHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={sectionLabel}>Activité récente</p>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {entries.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Aucune activité cette semaine</p>
            </div>
          ) : entries.slice(0, 8).map((e, i) => {
            const proj = projects.find(p => p.id === e.project_id)
            const gc2  = groupeColor(proj?.groupe)
            return (
              <div key={e.id} style={{ padding: '10px 16px', borderBottom: i < Math.min(entries.length, 8) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: gc2, flexShrink: 0, marginTop: 4 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 11, color: 'var(--wheat)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description || 'Session de travail'}
                  </p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span style={{ color: gc2, fontWeight: 600 }}>{proj?.groupe ?? proj?.name ?? '—'}</span>
                    {' · '}{e.duration_seconds ? fmtHours(e.duration_seconds) : 'en cours'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* LIENS & DOCUMENTS */}
      <div style={{ ...card, minHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={sectionLabel}>Liens & documents</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(14,149,148,0.1)', border: '1px solid rgba(14,149,148,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link2 size={20} style={{ color: '#0E9594' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Fichiers & liens<br />à venir
          </p>
        </div>
      </div>

      {/* ── Context menu ────────────────────────────────────────────────────── */}
      {contextMenu && (() => {
        const proj = projects.find(p => p.id === contextMenu.projectId)
        if (!proj) return null
        return (
          <div ref={cmRef}
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 0', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {[
              { label: 'Sélectionner', icon: <ChevronRight size={11} />, danger: false, action: () => { handleSelectProject(proj.id); setContextMenu(null) } },
              { label: 'Modifier',     icon: <Pencil size={11} />,       danger: false, action: () => { setEditModal(proj); setContextMenu(null) } },
              { label: 'Supprimer',    icon: <Trash2 size={11} />,       danger: true,  action: async () => { await remove(proj.id); setContextMenu(null); if (selected === proj.id) setSelected(null) } },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', fontSize: 11, color: item.danger ? '#F2542D' : 'var(--wheat)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', ...DF, fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )
      })()}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {editModal && (
        <ProjectModal project={editModal} onSave={update} onDelete={remove} onClose={() => setEditModal(null)} />
      )}
      {createModal && (
        <ProjectModal onCreate={create} onClose={() => setCreateModal(false)} />
      )}
    </div>
  )
}
