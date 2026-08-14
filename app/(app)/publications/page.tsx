'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, ExternalLink, Send, Tag,
} from '@/components/ui/icons'
import { PageTitle } from '@/components/ui/PageTitle'
import { createClient } from '@/lib/supabase/client'
import { usePublications, Publication, PublicationInput, PubStatus } from '@/hooks/usePublications'
import { brandColor } from '@/lib/digestStyle'

// ── Constantes ────────────────────────────────────────────────────────────────
const BRANDS = ['Le Mixologue', 'E-Smoker', 'Aeterna', 'Transverse', 'Interne']
const CHANNELS = ['Instagram', 'Réel', 'Story', 'Facebook', 'TikTok', 'Newsletter', 'Magazine', 'Site web', 'Autre']

// Couleur par canal (type de post). Liste éditable → repli par hash pour les
// canaux personnalisés, afin que chaque canal garde une couleur stable.
const CHANNEL_COLOR: Record<string, string> = {
  Instagram:   '#E1306C',
  'Réel':      '#9333EA',
  Reel:        '#9333EA',
  Story:       '#F59E0B',
  Facebook:    '#2563EB',
  TikTok:      '#0891B2',
  Newsletter:  '#D97706',
  Magazine:    '#16A34A',
  'Site web':  '#0D9488',
  Autre:       '#6b7280',
}
const CH_PALETTE = ['#E1306C', '#9333EA', '#2563EB', '#0891B2', '#D97706', '#16A34A', '#0EA5E9', '#DC2626', '#7C3AED', '#DB2777']
function channelColor(name?: string | null): string {
  if (!name) return '#6b7280'
  if (CHANNEL_COLOR[name]) return CHANNEL_COLOR[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return CH_PALETTE[Math.abs(h) % CH_PALETTE.length]
}
const STATUSES: { key: PubStatus; label: string; color: string }[] = [
  { key: 'idea',      label: 'Idée',      color: '#6b7280' },
  { key: 'draft',     label: 'Brouillon', color: '#d97706' },
  { key: 'scheduled', label: 'Planifié',  color: 'var(--azul)' },
  { key: 'published', label: 'Publié',    color: '#16a34a' },
  { key: 'cancelled', label: 'Annulé',    color: '#9ca3af' },
]
const statusMeta = (s: string) => STATUSES.find(x => x.key === s) ?? STATUSES[0]

const DAY_LABELS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

// ── Helpers date ──────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function monthGridStart(monthStart: Date): Date {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
  const dw = first.getDay()
  return addDays(first, dw === 0 ? -6 : 1 - dw)
}
function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
}

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', ...extra,
})

// ── Badges ────────────────────────────────────────────────────────────────────
function BrandBadge({ brand }: { brand?: string | null }) {
  if (!brand) return null
  return <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: '#fff', background: brandColor(brand), whiteSpace: 'nowrap' }}>{brand}</span>
}
function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status)
  return <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: '#fff', background: m.color, whiteSpace: 'nowrap' }}>{m.label}</span>
}

type ProjectOpt = { id: string; name: string; groupe: string | null }
type TaskOpt = { id: string; title: string }

// ─────────────────────────────────────────────────────────────────────────────
// Modale création / édition
// ─────────────────────────────────────────────────────────────────────────────
function PubModal({
  initial, initialDate, projects, tasks, onSave, onDelete, onClose,
}: {
  initial: Publication | null
  initialDate: string | null
  projects: ProjectOpt[]
  tasks: TaskOpt[]
  onSave: (input: PublicationInput, id: number | null) => Promise<{ error?: string }>
  onDelete: (id: number) => Promise<{ error?: string }>
  onClose: () => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    title:        initial?.title ?? '',
    brand:        initial?.brand ?? BRANDS[0],
    channel:      initial?.channel ?? '',
    status:       (initial?.status ?? (initialDate ? 'scheduled' : 'idea')) as PubStatus,
    publish_date: initial?.publish_date ?? initialDate ?? '',
    link:         initial?.link ?? '',
    notes:        initial?.notes ?? '',
    project_id:   initial?.project_id ?? '',
    task_id:      initial?.task_id ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const groupedProjects = useMemo(() => {
    const map = new Map<string, ProjectOpt[]>()
    for (const p of projects) {
      const g = p.groupe || 'Autres'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    }
    return [...map.entries()]
  }, [projects])

  async function submit() {
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    setSaving(true); setError(null)
    // Règle : une idée qui reçoit une date passe à « planifié »
    let status = form.status
    if (form.publish_date && status === 'idea') status = 'scheduled'
    const input: PublicationInput = {
      title:        form.title.trim(),
      brand:        form.brand || null,
      channel:      form.channel.trim() || null,
      status,
      publish_date: form.publish_date || null,
      link:         form.link.trim() || null,
      notes:        form.notes.trim() || null,
      project_id:   form.project_id || null,
      task_id:      form.task_id || null,
    }
    const res = await onSave(input, initial?.id ?? null)
    setSaving(false)
    if (res.error) setError(res.error)
    else onClose()
  }

  async function handleDelete() {
    if (!initial) return
    setSaving(true)
    const res = await onDelete(initial.id)
    setSaving(false)
    if (res.error) setError(res.error)
    else onClose()
  }

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: 13, outline: 'none',
  }
  const label: React.CSSProperties = { fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5, display: 'block', ...DF, fontWeight: 700 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div style={{ ...card(), width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
          <Send size={16} style={{ color: 'var(--accent-brand)' }} />
          <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{isEdit ? 'Modifier la publication' : 'Nouvelle publication'}</span>
          {initial?.featured && (
            <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: 'var(--ink-dark)', background: 'var(--accent-brand)', whiteSpace: 'nowrap' }} title="Mix de la semaine (lecture seule)">
              ★ {initial.featured}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose}><X size={15} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={label}>Titre</label>
            <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la publication…" style={field} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Marque</label>
              <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} style={field}>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Canal</label>
              <input list="pub-channels" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} placeholder="Canal…" style={field} />
              <datalist id="pub-channels">{CHANNELS.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Statut</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PubStatus }))} style={field}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Date de publication</label>
              <input type="date" value={form.publish_date} onChange={e => setForm(f => ({ ...f, publish_date: e.target.value }))} style={field} />
            </div>
          </div>

          <div>
            <label style={label}>Lien</label>
            <input type="url" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://…" style={field} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Projet</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} style={field}>
                <option value="">Aucun</option>
                {groupedProjects.map(([g, list]) => (
                  <optgroup key={g} label={g}>
                    {list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Tâche liée</label>
              <select value={form.task_id} onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))} style={field}>
                <option value="">Aucune</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={label}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" style={{ ...field, resize: 'vertical', minHeight: 70, lineHeight: 1.5 }} />
          </div>

          {error && <p style={{ fontSize: 11, color: 'var(--accent-brand)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
          {isEdit && (
            confirmDel ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Supprimer ?</span>
                <button onClick={handleDelete} disabled={saving} style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Oui</button>
                <button onClick={() => setConfirmDel(false)} style={{ ...DF, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Non</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} title="Supprimer" style={{ display: 'flex', alignItems: 'center', gap: 5, ...DF, fontSize: 11, fontWeight: 700, color: '#dc2626', background: 'none', border: '2px solid #dc2626', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                <Trash2 size={12} /> Supprimer
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...DF, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={submit} disabled={saving || !form.title.trim()} className="nb-press"
            style={{ ...DF, fontSize: 12, fontWeight: 700, color: 'var(--ink-dark)', background: 'var(--accent-brand)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? '…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
type PubView = 'calendar' | 'backlog'

export default function PublicationsPage() {
  const { publications, loading, error, create, update, remove } = usePublications()
  const [view, setView] = useState<PubView>('calendar')
  const [monthStart, setMonthStart] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })

  const [brandFilter, setBrandFilter]     = useState('tous')
  const [statusFilter, setStatusFilter]   = useState('tous')
  const [channelFilter, setChannelFilter] = useState('tous')

  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Publication | null>(null)
  const [modalDate, setModalDate]   = useState<string | null>(null)

  // Options pour les selects de la modale
  const [projects, setProjects] = useState<ProjectOpt[]>([])
  const [tasks, setTasks]       = useState<TaskOpt[]>([])
  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const [{ data: pj }, { data: tk }] = await Promise.all([
        supabase.from('projects').select('id, name, groupe').neq('status', 'archived').order('groupe', { ascending: true }).order('name', { ascending: true }),
        supabase.from('tasks').select('id, title').order('created_at', { ascending: false }).limit(300),
      ])
      setProjects((pj as ProjectOpt[]) ?? [])
      setTasks((tk as TaskOpt[]) ?? [])
    })()
  }, [])

  // Filtrage commun
  const passes = useCallback((p: Publication) =>
    (brandFilter === 'tous'   || p.brand === brandFilter) &&
    (statusFilter === 'tous'  || p.status === statusFilter) &&
    (channelFilter === 'tous' || p.channel === channelFilter)
  , [brandFilter, statusFilter, channelFilter])

  const filtered = useMemo(() => publications.filter(passes), [publications, passes])
  const backlog  = useMemo(() => filtered.filter(p => !p.publish_date), [filtered])

  // Index par jour pour la vue calendrier
  const byDay = useMemo(() => {
    const map = new Map<string, Publication[]>()
    for (const p of filtered) {
      if (!p.publish_date) continue
      const k = p.publish_date.slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    return map
  }, [filtered])

  const grid = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(monthGridStart(monthStart), i)), [monthStart])
  const todayStr = localDateStr(new Date())

  function openCreate(date: string | null) { setEditing(null); setModalDate(date); setModalOpen(true) }
  function openEdit(p: Publication) { setEditing(p); setModalDate(null); setModalOpen(true) }

  async function handleSave(input: PublicationInput, id: number | null) {
    return id == null ? create(input) : update(id, input)
  }

  // Sélecteur de statut rapide (backlog)
  async function quickStatus(p: Publication, status: PubStatus) {
    await update(p.id, { status })
  }

  const filterSelect: React.CSSProperties = {
    ...DF, fontSize: 11, fontWeight: 600, background: 'var(--bg-card)', color: 'var(--text)',
    border: '2px solid var(--ink)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
      <PageTitle title="Publications" sub="Calendrier éditorial" accent="var(--accent-calendar)" icon={Send}
        right={
          <button onClick={() => openCreate(view === 'backlog' ? null : todayStr)} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-brand)', color: 'var(--ink-dark)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', ...DF, fontWeight: 700, fontSize: 12 }}>
            <Plus size={14} /> Publication
          </button>
        } />

      {error && (
        <div style={{ ...card(), padding: '12px 16px', color: 'var(--accent-brand)', fontSize: 12 }}>Erreur : {error}</div>
      )}

      {/* Barre : bascule vue + filtres */}
      <div style={{ ...card(), padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {([['calendar', 'Calendrier'], ['backlog', 'Backlog']] as [PubView, string][]).map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ ...DF, padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', border: 'none', background: view === v ? 'var(--accent-brand)' : 'transparent', color: view === v ? 'var(--ink-dark)' : 'var(--text-muted)' }}>
              {lbl}{v === 'backlog' && backlog.length > 0 ? ` (${backlog.length})` : ''}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={filterSelect}>
          <option value="tous">Toutes marques</option>
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterSelect}>
          <option value="tous">Tous statuts</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} style={filterSelect}>
          <option value="tous">Tous canaux</option>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Légende — couleur par canal (type de post) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '0 4px' }}>
        {CHANNELS.filter(c => c !== 'Autre').map(c => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)', ...DF, fontWeight: 600 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: channelColor(c), border: '1.5px solid var(--ink)', flexShrink: 0 }} /> {c}
          </span>
        ))}
      </div>

      {/* ── Vue Calendrier ─────────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div style={{ ...card(), overflow: 'hidden' }}>
          {/* Nav mois */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '2px solid var(--ink)' }}>
            <button onClick={() => setMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '2px solid var(--ink)', cursor: 'pointer' }}>
              <ChevronLeft size={14} style={{ color: 'var(--text)' }} />
            </button>
            <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: 'var(--text)', textTransform: 'capitalize' }}>{fmtMonthYear(monthStart)}</span>
            <button onClick={() => setMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '2px solid var(--ink)', cursor: 'pointer' }}>
              <ChevronRight size={14} style={{ color: 'var(--text)' }} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              {/* Entêtes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                {DAY_LABELS.map(l => <div key={l} style={{ padding: '8px 0', textAlign: 'center', fontSize: 8, letterSpacing: '0.12em', color: 'var(--text-muted)', ...DF, fontWeight: 700 }}>{l}</div>)}
              </div>
              {/* Grille */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {grid.map((day, i) => {
                  const dStr = localDateStr(day)
                  const inMonth = day.getMonth() === monthStart.getMonth()
                  const isToday = dStr === todayStr
                  const pubs = byDay.get(dStr) ?? []
                  return (
                    <div key={i} onClick={() => openCreate(dStr)}
                      /* minWidth:0 — sans lui, un titre long en nowrap élargit
                         sa colonne et déforme la grille des 7 jours. */
                      style={{ minWidth: 0, minHeight: 96, padding: 6, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: inMonth ? 'transparent' : 'var(--bg-input)', opacity: inMonth ? 1 : 0.5, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                      <span style={{ fontSize: 11, fontWeight: isToday ? 900 : 600, color: isToday ? 'var(--accent-brand)' : 'var(--text-muted)', ...DF }}>{day.getDate()}</span>
                      {pubs.map(p => (
                        <div key={p.id} onClick={e => { e.stopPropagation(); openEdit(p) }}
                          title={`${p.title ?? ''}${p.brand ? ' — ' + p.brand : ''}${p.channel ? ' · ' + p.channel : ''}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%', padding: '3px 5px', borderRadius: 5, background: `color-mix(in srgb, ${channelColor(p.channel)} 18%, transparent)`, border: '1px solid var(--border)', borderLeft: `3px solid ${channelColor(p.channel)}`, cursor: 'pointer', opacity: p.status === 'cancelled' ? 0.5 : p.status === 'published' ? 0.8 : 1 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: brandColor(p.brand ?? ''), border: '1px solid var(--ink)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                            {p.title}{p.channel ? ` · ${p.channel}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Vue Backlog ────────────────────────────────────────────────────── */}
      {view === 'backlog' && (
        <div style={{ ...card(), padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Idées sans date</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => openCreate(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, ...DF, fontSize: 11, fontWeight: 700, color: 'var(--ink-dark)', background: 'var(--accent-brand)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
              <Plus size={12} /> Nouvelle idée
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Chargement…</p>
          ) : backlog.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Aucune idée en attente.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {backlog.map(p => (
                <div key={p.id} style={{ ...card({ boxShadow: '3px 3px 0 var(--ink)' }), borderLeft: `5px solid ${channelColor(p.channel)}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', opacity: p.status === 'cancelled' ? 0.6 : 1 }} onClick={() => openEdit(p)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span title={p.brand ?? undefined} style={{ width: 10, height: 10, borderRadius: '50%', background: brandColor(p.brand ?? ''), border: '1.5px solid var(--ink)', marginTop: 4, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <BrandBadge brand={p.brand} />
                    {p.channel && <span style={{ fontSize: 10, fontWeight: 700, color: channelColor(p.channel) }}>{p.channel}</span>}
                  </div>
                  {p.notes && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.notes}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <select value={p.status} onChange={e => quickStatus(p, e.target.value as PubStatus)}
                      style={{ ...DF, fontSize: 10, fontWeight: 700, color: '#fff', background: statusMeta(p.status).color, border: '1.5px solid var(--ink)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', outline: 'none' }}>
                      {STATUSES.map(s => <option key={s.key} value={s.key} style={{ color: 'var(--text)', background: 'var(--bg-card)' }}>{s.label}</option>)}
                    </select>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Ouvrir le lien" style={{ display: 'flex' }}>
                        <ExternalLink size={13} style={{ color: 'var(--azul)' }} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <PubModal
          initial={editing} initialDate={modalDate}
          projects={projects} tasks={tasks}
          onSave={handleSave} onDelete={remove}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
