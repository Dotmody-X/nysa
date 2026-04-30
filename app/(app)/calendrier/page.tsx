'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Plus, X, MapPin, Tag, Clock,
  Trash2, Calendar, Bell, RefreshCw, Link2, CheckCircle2, Circle,
  Apple, Pencil,
} from 'lucide-react'
import { useCalendar, CalendarEvent, NewEvent } from '@/hooks/useCalendar'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DAY_LABELS   = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const HOUR_START   = 0
const HOUR_END     = 24
const TOTAL_HOURS  = HOUR_END - HOUR_START
const SLOT_PX      = 52
const TIME_COL     = 44

// Catégories fixes avec couleurs NYSA
const CATEGORIES: Record<string, string> = {
  Travail:  '#F2542D',
  Perso:    '#0E9594',
  Santé:    '#B45309',
  Running:  '#11686A',
  Réunion:  '#9333EA',
  Autre:    '#555',
}

// Palette NYSA pour les catégories dynamiques (noms de calendriers Apple)
const NYSA_PALETTE = [
  '#F2542D', // orange fiery
  '#0E9594', // teal
  '#9333EA', // violet
  '#2563EB', // bleu
  '#16A34A', // vert
  '#DB2777', // rose
  '#D97706', // ambre
  '#0891B2', // cyan
  '#7C3AED', // indigo
  '#DC2626', // rouge
]

// Couleur stable pour n'importe quel nom de catégorie (y compris noms Apple)
function categoryColor(name: string): string {
  if (!name) return '#555'
  if (CATEGORIES[name]) return CATEGORIES[name]
  // Hash simple → index dans la palette
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return NYSA_PALETTE[Math.abs(h) % NYSA_PALETTE.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const dt  = new Date(d)
  const day = dt.getDay()
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day))
  dt.setHours(0, 0, 0, 0)
  return dt
}
function addDays(d: Date, n: number): Date {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}
function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
}
function isoLocal(date: Date, h: number, m = 0): string {
  const d = new Date(date); d.setHours(h, m, 0, 0); return d.toISOString()
}
function eventTop(iso: string): number {
  const d   = new Date(iso)
  const min = (d.getHours() - HOUR_START) * 60 + d.getMinutes()
  return (min / 60) * SLOT_PX
}
function eventHeight(start: string, end: string): number {
  const min = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return Math.max((min / 60) * SLOT_PX, 20)
}
function evColor(ev: CalendarEvent): string {
  if (ev.color) return ev.color
  if (ev.category) return categoryColor(ev.category)
  return '#555'
}

// ─────────────────────────────────────────────────────────────────────────────
// Apple Modal
// ─────────────────────────────────────────────────────────────────────────────
interface CalendarOption { name: string; url: string }

function AppleModal({ onClose, onSynced }: { onClose: () => void; onSynced?: () => void }) {
  const [step, setStep]         = useState<1 | 2 | 3>(1)
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [syncing, setSyncing]   = useState(false)
  const [result, setResult]     = useState<string | null>(null)
  // Step 3 — sélection des calendriers
  const [calendars, setCalendars]     = useState<CalendarOption[]>([])
  const [excluded, setExcluded]       = useState<string[]>([])
  const [loadingCals, setLoadingCals] = useState(false)

  // Cas : déjà connecté → aller directement au step 3
  useEffect(() => {
    async function checkConnected() {
      setLoadingCals(true)
      try {
        const res  = await fetch('/api/calendar/apple/calendars')
        const json = await res.json()
        if (res.ok && json.calendars?.length > 0) {
          setCalendars(json.calendars)
          setExcluded(json.excluded ?? [])
          setStep(3)
        }
      } catch {}
      setLoadingCals(false)
    }
    checkConnected()
  }, [])

  async function handleConnect() {
    if (!email || !pass) return
    setSyncing(true)
    try {
      // Connexion initiale — on lance le sync sans excludedCalendars (d'abord tout importer)
      const res = await fetch('/api/calendar/apple/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appPassword: pass }),
      })
      const json = await res.json()
      if (!res.ok) { setResult(`❌ ${json.error ?? 'Erreur'}`); setSyncing(false); return }
      // Charge la liste des calendriers pour step 3
      const cRes  = await fetch('/api/calendar/apple/calendars')
      const cJson = await cRes.json()
      if (cRes.ok && cJson.calendars?.length > 0) {
        setCalendars(cJson.calendars)
        setExcluded(cJson.excluded ?? [])
        setStep(3)
      } else {
        setResult(`✅ ${json.synced ?? 0} événement(s) importé(s)`)
        onSynced?.()
      }
    } catch {
      setResult('❌ Impossible de contacter le serveur')
    } finally {
      setSyncing(false)
    }
  }

  async function handleApplyFilter() {
    setSyncing(true)
    try {
      const res  = await fetch('/api/calendar/apple/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedCalendars: excluded }),
      })
      const json = await res.json()
      setResult(res.ok ? `✅ Sync terminé — ${json.synced ?? 0} ajouté(s), ${json.removed ?? 0} supprimé(s)` : `❌ ${json.error ?? 'Erreur'}`)
      onSynced?.()
    } catch {
      setResult('❌ Impossible de contacter le serveur')
    } finally {
      setSyncing(false)
    }
  }

  function toggleExclude(name: string) {
    setExcluded(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const stepLabel = step === 1 ? 'Instructions' : step === 2 ? 'Connexion' : 'Mes calendriers'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[16px] p-6 flex flex-col gap-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--bg-input)' }}>
              {loadingCals ? <RefreshCw size={14} style={{ color: 'var(--wheat)', opacity: 0.5 }} /> : <Apple size={16} style={{ color: 'var(--wheat)' }} />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--wheat)', fontFamily: 'var(--font-display)' }}>Apple Calendar</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stepLabel}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Step 1 — Instructions */}
        {step === 1 && (
          <>
            <div className="rounded-[10px] p-4 flex flex-col gap-2" style={{ background: 'rgba(14,149,148,0.12)', border: '1px solid rgba(14,149,148,0.25)' }}>
              <p className="text-xs font-semibold" style={{ color: '#0E9594' }}>Avant de continuer</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--wheat)' }}>
                Apple exige un <strong style={{ color: 'var(--wheat)' }}>mot de passe spécifique à l'app</strong> pour les accès tiers. Ton mot de passe Apple ID principal ne fonctionnera pas.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { n: '1', t: 'Ouvre', link: 'appleid.apple.com', desc: 'et connecte-toi' },
                { n: '2', t: 'Section', link: 'Connexion et sécurité', desc: '→ Mots de passe spécifiques aux apps' },
                { n: '3', t: 'Clique sur', link: '+', desc: ', donne le nom "NYSA", copie le mdp' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: '#F2542D', color: '#fff' }}>{s.n}</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--wheat)' }}>
                    {s.t} <span style={{ color: 'var(--wheat)' }}>{s.link}</span> {s.desc}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-[8px] text-sm font-semibold" style={{ background: '#F2542D', color: '#fff' }}>
              J'ai mon mot de passe →
            </button>
          </>
        )}

        {/* Step 2 — Connexion */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Apple ID (email)</label>
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nom@icloud.com"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Mot de passe spécifique</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg-input)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>
            </div>
            {result && (
              <p className="text-[11px] px-3 py-2 rounded-[7px]" style={{ background: result.startsWith('✅') ? 'rgba(14,149,148,0.12)' : 'rgba(242,84,45,0.12)', color: result.startsWith('✅') ? '#0E9594' : '#F2542D' }}>
                {result}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2 rounded-[8px] text-sm" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ← Retour
              </button>
              <button onClick={handleConnect} disabled={syncing || !email || !pass}
                className="flex-1 py-2 rounded-[8px] text-sm font-semibold disabled:opacity-40"
                style={{ background: '#F2542D', color: '#fff' }}>
                {syncing ? 'Connexion…' : 'Connecter →'}
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Sélection des calendriers */}
        {step === 3 && (
          <>
            <div className="rounded-[10px] p-3" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Coche les calendriers à <strong style={{ color: 'var(--wheat)' }}>inclure</strong> dans NYSA. Les autres seront ignorés.
              </p>
            </div>

            <div className="flex flex-col gap-1" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {calendars.map(cal => {
                const isIncluded = !excluded.includes(cal.name)
                return (
                  <div key={cal.url}
                    onClick={() => toggleExclude(cal.name)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer"
                    style={{ background: isIncluded ? 'rgba(14,149,148,0.08)' : 'transparent', border: `1px solid ${isIncluded ? 'rgba(14,149,148,0.25)' : 'var(--border)'}`, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!isIncluded) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { if (!isIncluded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${isIncluded ? '#0E9594' : 'var(--border-active)'}`,
                      background: isIncluded ? '#0E9594' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}>
                      {isIncluded && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: isIncluded ? 'var(--wheat)' : 'var(--text-subtle)', fontWeight: isIncluded ? 500 : 400 }}>
                      {cal.name}
                    </span>
                  </div>
                )
              })}
            </div>

            {result && (
              <p className="text-[11px] px-3 py-2 rounded-[7px]" style={{ background: result.startsWith('✅') ? 'rgba(14,149,148,0.12)' : 'rgba(242,84,45,0.12)', color: result.startsWith('✅') ? '#0E9594' : '#F2542D' }}>
                {result}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-[8px] text-sm" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Annuler
              </button>
              <button onClick={handleApplyFilter} disabled={syncing}
                className="flex-1 py-2.5 rounded-[8px] text-sm font-semibold disabled:opacity-40"
                style={{ background: '#F2542D', color: '#fff' }}>
                {syncing ? 'Sync…' : `Appliquer (${calendars.length - excluded.length}/${calendars.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Modal (create + edit)
// ─────────────────────────────────────────────────────────────────────────────
function EventModal({
  date, hour, onSave, onClose, extraCategories = [], initialValues, onUpdate,
}: {
  date: string
  hour: number
  onSave: (ev: NewEvent) => Promise<unknown>
  onClose: () => void
  extraCategories?: string[]
  initialValues?: CalendarEvent | null
  onUpdate?: (id: string, patch: Partial<NewEvent>) => Promise<unknown>
}) {
  const { projects, create: createProject } = useProjects()
  const isEdit    = !!initialValues
  const initStart = initialValues ? new Date(initialValues.start_at) : null
  const initEnd   = initialValues ? new Date(initialValues.end_at)   : null

  const [form, setForm] = useState({
    title:       initialValues?.title       ?? '',
    description: initialValues?.description ?? '',
    category:    initialValues?.category    ?? (extraCategories[0] || 'Travail'),
    location:    initialValues?.location    ?? '',
    projectId:   initialValues?.project_id  ?? '',
    date:        date,
    startTime:   initStart
      ? `${String(initStart.getHours()).padStart(2,'0')}:${String(initStart.getMinutes()).padStart(2,'0')}`
      : `${String(hour).padStart(2, '0')}:00`,
    endTime: initEnd
      ? `${String(initEnd.getHours()).padStart(2,'0')}:${String(initEnd.getMinutes()).padStart(2,'0')}`
      : `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`,
  })
  const [saving, setSaving]           = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [showNewProj, setShowNewProj] = useState(false)
  const [creatingProj, setCreatingProj] = useState(false)

  async function handleCreateProject() {
    if (!newProjName.trim()) return
    setCreatingProj(true)
    const color = NYSA_PALETTE[Math.abs(newProjName.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0)) % NYSA_PALETTE.length]
    const { data } = await createProject({
      name: newProjName.trim(), color, status: 'active', priority: 'medium', progress: 0,
    } as never)
    if (data) {
      setForm(f => ({ ...f, projectId: (data as { id: string }).id }))
      setShowNewProj(false)
      setNewProjName('')
    }
    setCreatingProj(false)
  }

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const base = new Date(form.date + 'T00:00:00')
    const patch: Partial<NewEvent> = {
      title:       form.title,
      description: form.description || undefined,
      category:    form.category    || undefined,
      location:    form.location    || undefined,
      start_at:    isoLocal(base, sh, sm),
      end_at:      isoLocal(base, eh, em),
      all_day:     false,
      project_id:  form.projectId   || undefined,
    }
    if (isEdit && initialValues && onUpdate) {
      await onUpdate(initialValues.id, patch)
    } else {
      await onSave(patch as NewEvent)
    }
    setSaving(false)
    onClose()
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })
  const selectedProj = projects.find(p => p.id === form.projectId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--wheat)', fontFamily: 'var(--font-display)' }}>
              {isEdit ? "Modifier l'événement" : 'Nouvel événement'}
            </p>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="text-[10px] mt-0.5 outline-none bg-transparent"
            style={{ color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} />
          </div>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Titre */}
          <input autoFocus type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Titre de l'événement…"
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />

          {/* Heures */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Début</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Fin</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-[7px] text-xs outline-none"
                style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            </div>
          </div>

          {/* Catégorie + couleur */}
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
            {extraCategories.length > 0 && (
              <optgroup label="Apple Calendar">
                {extraCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            )}
            <optgroup label="NYSA">
              {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColor(form.category), transition: 'background 0.15s' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{form.category || 'Catégorie'}</span>
          </div>

          {/* Projet */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="text-[9px] uppercase tracking-widest block" style={{ color: 'var(--text-muted)' }}>Projet</label>
              <button type="button" onClick={() => setShowNewProj(v => !v)}
                style={{ fontSize: 9, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plus size={9} /> Nouveau
              </button>
            </div>

            {/* Inline new project form */}
            {showNewProj && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input autoFocus value={newProjName} onChange={e => setNewProjName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  placeholder="Nom du projet…"
                  style={{ flex: 1, background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid rgba(242,84,45,0.4)', borderRadius: 7, padding: '6px 10px', fontSize: 12, outline: 'none' }} />
                <button onClick={handleCreateProject} disabled={creatingProj || !newProjName.trim()}
                  style={{ padding: '6px 12px', borderRadius: 7, background: '#F2542D', color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: creatingProj ? 0.5 : 1 }}>
                  {creatingProj ? '…' : 'OK'}
                </button>
              </div>
            )}

            <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
              style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
              <option value="">Sans projet</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Dot projet sélectionné */}
            {selectedProj && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: selectedProj.color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{selectedProj.name}</span>
              </div>
            )}
          </div>

          {/* Lieu */}
          <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Lieu (optionnel)…"
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />

          {/* Notes */}
          <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Notes…"
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none resize-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-[8px] text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Annuler
          </button>
          <button onClick={submit} disabled={saving || !form.title.trim()}
            className="px-4 py-2 rounded-[8px] text-xs font-semibold disabled:opacity-40"
            style={{ background: '#F2542D', color: '#fff' }}>
            {saving ? '…' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calendar content
// ─────────────────────────────────────────────────────────────────────────────
type CalView = 'day' | 'week' | 'month'

function getMonthGridStart(ms: Date): Date {
  const dw = ms.getDay()
  return addDays(ms, dw === 0 ? -6 : 1 - dw)
}

function CalendrierContent() {
  const params = useSearchParams()
  const [calView,    setCalView]    = useState<CalView>('week')
  const [weekStart,  setWeekStart]  = useState<Date>(() => getMonday(new Date()))
  const [dayStart,   setDayStart]   = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [monthStart, setMonthStart] = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })

  // Compute fetch range based on view
  const rangeFrom = calView === 'day'   ? dayStart
                  : calView === 'month' ? getMonthGridStart(monthStart)
                  : weekStart
  const rangeTo   = calView === 'day'   ? addDays(dayStart, 1)
                  : calView === 'month' ? addDays(getMonthGridStart(monthStart), 42)
                  : addDays(weekStart, 7)

  const { events, loading, addEvent, updateEvent, removeEvent, refetch } = useCalendar(rangeFrom, rangeTo)
  const { tasks } = useTasks()

  const [selected, setSelected]           = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent]   = useState<CalendarEvent | null>(null)
  const [modalDate, setModalDate]         = useState<string | null>(null)
  const [modalHour, setModalHour]         = useState(9)
  const [appleOpen, setAppleOpen]         = useState(false)
  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [notification, setNotification]   = useState<string | null>(null)
  const [appleConnected, setAppleConnected] = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [lastSync, setLastSync]           = useState<Date | null>(null)
  const [appleCalendars, setAppleCalendars]       = useState<string[]>([])
  const [showAllReminders, setShowAllReminders]   = useState(false)

  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const colsRef       = useRef<HTMLDivElement | null>(null)
  const calGridRef    = useRef<HTMLDivElement | null>(null)

  // Drag-to-move state
  const [dragging, setDragging] = useState<{
    ev: CalendarEvent; offsetPx: number; ghostDay: number; ghostTopPx: number
  } | null>(null)

  // Resize state
  const [resizing, setResizing] = useState<{
    ev: CalendarEvent; ghostEndPx: number
  } | null>(null)

  // Pending drag — tracks pointer down before movement threshold
  const pendingDragRef = useRef<{
    ev: CalendarEvent; startX: number; startY: number
    offsetPx: number; di: number; topPx: number; pointerId: number
  } | null>(null)

  // Snap to 15-min grid
  function snapPx(px: number) { return Math.round(px / (SLOT_PX / 4)) * (SLOT_PX / 4) }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekDays   = calView === 'day'
    ? [dayStart]
    : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthGrid  = calView === 'month'
    ? Array.from({ length: 42 }, (_, i) => addDays(getMonthGridStart(monthStart), i))
    : []
  const nowMins    = (new Date().getHours() - HOUR_START) * 60 + new Date().getMinutes()
  const nowPx      = Math.max(0, (nowMins / 60) * SLOT_PX)
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime())

  // Auto-scroll : positionne l'heure actuelle en haut de la fenêtre (avec 30min de marge)
  useEffect(() => {
    if (gridScrollRef.current) {
      const margin = SLOT_PX * 0.5  // 30min avant l'heure actuelle
      gridScrollRef.current.scrollTop = Math.max(0, nowPx - margin)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notif query params
  useEffect(() => {
    const n = params.get('calendar')
    if (n === 'connected') setNotification('✅ Apple Calendar connecté')
    else if (n === 'error') setNotification('❌ Erreur de connexion Apple Calendar')
    if (n) setTimeout(() => setNotification(null), 4000)
  }, [params])

  // Auto-sync Apple Calendar au chargement + toutes les 5 minutes
  useEffect(() => {
    async function bgSync(showSpinner = false) {
      if (showSpinner) setSyncing(true)
      try {
        const res  = await fetch('/api/calendar/apple/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const json = await res.json()
        if (!json.skipped) {
          setAppleConnected(true)
          setLastSync(new Date())
          if (json.synced > 0 || json.removed > 0) refetch()
        }
      } catch {}
      if (showSpinner) setSyncing(false)
    }
    // Charge aussi les noms des calendriers Apple pour enrichir le dropdown
    async function loadAppleCals() {
      try {
        const res  = await fetch('/api/calendar/apple/calendars')
        const json = await res.json()
        if (res.ok && json.calendars) {
          // Noms non exclus, non déjà dans CATEGORIES
          const names = (json.calendars as { name: string }[])
            .map(c => c.name)
            .filter(n => !Object.keys(CATEGORIES).includes(n) && !(json.excluded ?? []).includes(n))
          setAppleCalendars(names)
        }
      } catch {}
    }
    bgSync(true)
    loadAppleCals()
    const interval = setInterval(() => bgSync(false), 5 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function prevPeriod() {
    if (calView === 'day')   setDayStart(d => addDays(d, -1))
    else if (calView === 'week') { setWeekStart(d => addDays(d, -7)); setSelected(null) }
    else setMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextPeriod() {
    if (calView === 'day')   setDayStart(d => addDays(d, 1))
    else if (calView === 'week') { setWeekStart(d => addDays(d, 7));  setSelected(null) }
    else setMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday()  {
    const t = new Date(); t.setHours(0,0,0,0)
    if (calView === 'day')   setDayStart(t)
    else if (calView === 'week') { setWeekStart(getMonday(new Date())); setSelected(null) }
    else setMonthStart(new Date(t.getFullYear(), t.getMonth(), 1))
  }

  const periodTitle = calView === 'day'
    ? dayStart.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : calView === 'month'
    ? monthStart.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
    : fmtMonthYear(weekStart)

  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Événements avec heure pour le time grid (hors all_day)
  function eventsForDay(day: Date): CalendarEvent[] {
    const dayStr = localDateStr(day)
    return events.filter(ev => {
      if (ev.all_day) return false
      if (localDateStr(new Date(ev.start_at)) !== dayStr) return false
      if (activeCategories.length > 0 && ev.category && !activeCategories.includes(ev.category)) return false
      return true
    })
  }

  // Événements toute la journée pour le bandeau chips
  function allDayEventsForDay(day: Date): CalendarEvent[] {
    const dayStr = localDateStr(day)
    return events.filter(ev => {
      if (!ev.all_day) return false
      // Pour les all_day, comparer la date UTC (stockée comme YYYY-MM-DDT00:00:00Z)
      const evDate = ev.start_at.slice(0, 10)
      const d = day
      const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (evDate !== dStr) return false
      if (activeCategories.length > 0 && ev.category && !activeCategories.includes(ev.category)) return false
      return true
    })
  }

  const hasAnyAllDay = weekDays.some(d => allDayEventsForDay(d).length > 0)

  function toggleCategory(cat: string) {
    setActiveCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function handleDelete(id: string) {
    await removeEvent(id)
    setSelected(null)
  }

  // ── Overlay handlers (drag + resize) ────────────────────────────────────────
  function handleOverlayMove(e: React.PointerEvent) {
    const gridEl = gridScrollRef.current
    const colsEl = colsRef.current
    if (!gridEl || !colsEl) return
    const colsRect = colsEl.getBoundingClientRect()
    const relY     = e.clientY - colsRect.top + gridEl.scrollTop

    if (dragging) {
      const rawTop   = relY - dragging.offsetPx
      const snapped  = snapPx(Math.max(0, Math.min(rawTop, (TOTAL_HOURS - 0.25) * SLOT_PX)))
      const dayWidth = colsRect.width / 7
      const relX     = e.clientX - colsRect.left
      const dayIdx   = Math.max(0, Math.min(6, Math.floor(relX / dayWidth)))
      setDragging(d => d ? { ...d, ghostDay: dayIdx, ghostTopPx: snapped } : null)
    }

    if (resizing) {
      const minEnd  = eventTop(resizing.ev.start_at) + SLOT_PX / 4
      const snapped = snapPx(Math.max(minEnd, Math.min(relY, TOTAL_HOURS * SLOT_PX)))
      setResizing(r => r ? { ...r, ghostEndPx: snapped } : null)
    }
  }

  async function handleOverlayUp() {
    pendingDragRef.current = null
    if (dragging) {
      const { ev, ghostDay, ghostTopPx } = dragging
      const mins    = Math.round((ghostTopPx / SLOT_PX) * 60)
      const h       = HOUR_START + Math.floor(mins / 60)
      const m       = mins % 60
      const day     = weekDays[ghostDay]
      const dur     = new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()
      const newStart = new Date(day); newStart.setHours(h, m, 0, 0)
      const newEnd   = new Date(newStart.getTime() + dur)
      await updateEvent(ev.id, { start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
      setDragging(null)
    }
    if (resizing) {
      const { ev, ghostEndPx } = resizing
      const totalMins = Math.round((ghostEndPx / SLOT_PX) * 60) + HOUR_START * 60
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      const newEnd = new Date(ev.start_at); newEnd.setHours(h, m, 0, 0)
      await updateEvent(ev.id, { end_at: newEnd.toISOString() })
      setResizing(null)
    }
  }

  // Upcoming events (next 5 from now)
  const now = new Date()
  const upcoming = events
    .filter(ev => new Date(ev.start_at) >= now)
    .slice(0, 5)

  // Week tasks
  const weekTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T00:00:00')
    return d >= weekStart && d < addDays(weekStart, 7)
  })

  // Reminders = events in next 24h
  const tomorrow = new Date(now.getTime() + 24 * 3600_000)
  const reminders = events.filter(ev => {
    const s = new Date(ev.start_at)
    return s >= now && s <= tomorrow
  })

  // Overview — count per category this week
  const categoryCount: Record<string, number> = {}
  events.forEach(ev => {
    const cat = ev.category ?? 'Autre'
    categoryCount[cat] = (categoryCount[cat] ?? 0) + 1
  })

  // ── Card style helper
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    ...extra,
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
  }

  // ── Render
  return (
    <div className="bento-grid md:grid md:grid-cols-4 page-wrap" style={{ gap: 10, alignContent: 'start' }}>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-[10px] text-sm font-semibold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--wheat)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {notification}
        </div>
      )}

      {/* ── ROW 1 : Hero (2 cols) + À VENIR (2 cols) — 300px ───────────────── */}

      {/* Hero title — col-span-2, 300px */}
      <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 0 20px 0', height: 300 }}>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#F2542D', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Calendrier
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 1, color: 'var(--wheat)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          Votre journée.<br />Votre plan.
        </h1>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500, color: '#0E9594', marginTop: 12, textTransform: 'capitalize' }}>
          {fmtShortDate(today)}
        </p>
      </div>

      {/* À VENIR — col-span-2, teal, 300px, liste verticale */}
      <div className="col-span-2" style={{ ...card({ background: '#0E9594', border: '1px solid #0E9594' }), display: 'flex', flexDirection: 'column', height: 300, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>À venir</p>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{upcoming.length}</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '14px 20px' }}>Aucun événement à venir.</p>
          ) : upcoming.map(ev => (
            <div key={ev.id} onClick={() => setSelected(ev)}
              style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {/* Dot couleur catégorie */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  {fmtShortDate(new Date(ev.start_at))} · {fmtTime(ev.start_at)}
                </p>
              </div>
              {ev.category && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.2)', color: '#fff', flexShrink: 0 }}>{ev.category}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 2 : Nav bar ────────────────────────────────────────────────── */}
      <div className="col-span-4" style={{ ...card(), padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* View tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {(['day','week','month'] as CalView[]).map(v => {
            const label = v === 'day' ? 'JOUR' : v === 'week' ? 'SEMAINE' : 'MOIS'
            const active = calView === v
            return (
              <button key={v} onClick={() => setCalView(v)}
                style={{ padding: '4px 14px', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', border: 'none', background: active ? '#F2542D' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevPeriod} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <ChevronLeft size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          <button onClick={goToday} style={{ padding: '5px 16px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--wheat)', cursor: 'pointer' }}>
            Aujourd'hui
          </button>
          <button onClick={nextPeriod} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)', fontFamily: 'var(--font-display)', minWidth: 150, textAlign: 'center', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
            {periodTitle}
          </span>
        </div>

        {/* + Événement */}
        <button onClick={() => setModalDate((calView === 'day' ? dayStart : today).toISOString().slice(0, 10))}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', background: '#F2542D', color: '#fff', cursor: 'pointer', border: 'none', letterSpacing: '0.04em' }}>
          <Plus size={13} /> ÉVÉNEMENT
        </button>
      </div>

      {/* ── ROW 3 : Calendar grid ──────────────────────────────────────────── */}
      {/* Vue mois */}
      {calView === 'month' && (
        <div ref={calGridRef} className="col-span-4" style={{ ...card(), overflow: 'hidden' }}>
          {/* Entêtes jours */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAY_LABELS.map(l => (
              <div key={l} style={{ padding: '9px 0', textAlign: 'center', fontSize: 8, letterSpacing: '0.12em', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{l}</div>
            ))}
          </div>
          {/* Grille */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthGrid.map((day, i) => {
              const isCurrentMonth = day.getMonth() === monthStart.getMonth()
              const isToday = day.getTime() === today.getTime()
              const dayEvs     = eventsForDay(day)
              const allDayEvs  = allDayEventsForDay(day)
              const allEvs     = [...allDayEvs, ...dayEvs]
              const filtered   = activeCategories.length > 0
                ? allEvs.filter(ev => !ev.category || activeCategories.includes(ev.category))
                : allEvs
              return (
                <div key={i}
                  onClick={() => { setDayStart(day); setCalView('day') }}
                  style={{
                    borderRight: i % 7 < 6 ? '1px solid var(--border)' : 'none',
                    borderBottom: i < 35 ? '1px solid var(--border)' : 'none',
                    padding: '6px 8px', minHeight: 90, cursor: 'pointer',
                    background: isToday ? 'rgba(242,84,45,0.04)' : 'transparent',
                    opacity: isCurrentMonth ? 1 : 0.35,
                  }}
                  onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(242,84,45,0.04)' : 'transparent' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#F2542D' : 'transparent', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', color: isToday ? '#fff' : 'var(--wheat)', marginBottom: 3 }}>
                    {day.getDate()}
                  </div>
                  {filtered.slice(0, 2).map(ev => {
                    const color = evColor(ev)
                    return (
                      <div key={ev.id}
                        onClick={e => { e.stopPropagation(); setSelected(ev) }}
                        style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, marginBottom: 2, background: color + '22', color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${color}33` }}>
                        {ev.title}
                      </div>
                    )
                  })}
                  {filtered.length > 2 && (
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>+{filtered.length - 2}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vue jour + semaine (time grid) */}
      {calView !== 'month' && (
      <div ref={calGridRef} className="col-span-4" style={{ ...card(), display: 'flex', flexDirection: 'column', overflow: 'hidden', height: SLOT_PX * 8 + 40 }}>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(${weekDays.length}, 1fr)`, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ borderRight: '1px solid var(--border)' }} />
          {weekDays.map((day, i) => {
            const isToday = day.getTime() === today.getTime()
            return (
              <div key={i} style={{ padding: '10px 0', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ ...labelStyle, fontSize: 8, marginBottom: 4 }}>{DAY_LABELS[i]}</p>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', margin: '0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? '#F2542D' : 'transparent',
                  fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)',
                  color: isToday ? '#fff' : 'var(--wheat)',
                }}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bandeau all-day (masqué si aucun événement) */}
        {hasAnyAllDay && (
          <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(${weekDays.length}, 1fr)`, borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg)' }}>
            <div style={{ borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>JOUR</span>
            </div>
            {weekDays.map((day, i) => {
              const chips = allDayEventsForDay(day)
              return (
                <div key={i} style={{ padding: '4px 4px', borderRight: i < 6 ? '1px solid var(--border)' : 'none', display: 'flex', flexWrap: 'wrap', gap: 2, minHeight: 28 }}>
                  {chips.map(ev => {
                    const color = evColor(ev)
                    return (
                      <div key={ev.id}
                        onClick={() => setSelected(ev)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: color + '22', border: `1px solid ${color}44`, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden' }}
                        onMouseEnter={e => (e.currentTarget.style.background = color + '44')}
                        onMouseLeave={e => (e.currentTarget.style.background = color + '22')}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Scrollable grid */}
        <div ref={gridScrollRef} style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ position: 'relative', height: TOTAL_HOURS * SLOT_PX }}>

            {/* Hour lines */}
            {Array.from({ length: TOTAL_HOURS }, (_, h) => (
              <div key={h} style={{ position: 'absolute', top: h * SLOT_PX, left: 0, right: 0, display: 'flex', pointerEvents: 'none' }}>
                <div style={{ width: TIME_COL, textAlign: 'right', paddingRight: 10, paddingTop: 2, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{String(HOUR_START + h).padStart(2, '0')}h</span>
                </div>
                <div style={{ flex: 1, borderTop: '1px solid var(--border)', opacity: 0.35 }} />
              </div>
            ))}

            {/* Now line */}
            {todayInWeek && nowMins >= 0 && nowMins <= TOTAL_HOURS * 60 && (
              <div style={{ position: 'absolute', top: nowPx, left: TIME_COL, right: 0, display: 'flex', alignItems: 'center', zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F2542D', marginLeft: -3.5 }} />
                <div style={{ flex: 1, height: 1, background: '#F2542D', opacity: 0.85 }} />
              </div>
            )}

            {/* Day columns */}
            <div ref={colsRef} style={{ position: 'absolute', inset: 0, left: TIME_COL, display: 'grid', gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
              {weekDays.map((day, di) => {
                const dayEvs = eventsForDay(day)
                // Ghost drop indicator for this column
                const showGhost = dragging && dragging.ghostDay === di
                const ghostEv   = dragging?.ev
                const ghostH    = ghostEv ? eventHeight(ghostEv.start_at, ghostEv.end_at) : 0
                const ghostColor = ghostEv ? evColor(ghostEv) : '#555'

                return (
                  <div key={di} style={{ position: 'relative', borderRight: di < 6 ? '1px solid var(--border)' : 'none' }}>
                    {/* Click zones */}
                    {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                      <div key={h} style={{ position: 'absolute', top: h * SLOT_PX, height: SLOT_PX, left: 0, right: 0, cursor: 'pointer', zIndex: 1 }}
                        onClick={() => { setModalDate(day.toISOString().slice(0, 10)); setModalHour(HOUR_START + h) }} />
                    ))}

                    {/* Ghost drop preview */}
                    {showGhost && ghostEv && (
                      <div style={{
                        position: 'absolute', top: dragging!.ghostTopPx, height: ghostH,
                        left: 2, right: 2, borderRadius: 6,
                        background: ghostColor + '33',
                        border: `1.5px dashed ${ghostColor}`,
                        zIndex: 30, pointerEvents: 'none',
                      }} />
                    )}

                    {/* Events */}
                    {dayEvs.map(ev => {
                      const top    = eventTop(ev.start_at)
                      const isDraggingThis = dragging?.ev.id === ev.id
                      const isResizingThis = resizing?.ev.id === ev.id
                      const height = isResizingThis
                        ? Math.max(20, resizing!.ghostEndPx - top)
                        : eventHeight(ev.start_at, ev.end_at)
                      const color  = evColor(ev)
                      const isSel  = selected?.id === ev.id
                      return (
                        <div key={ev.id}
                          onPointerDown={e => {
                            if (e.button !== 0) return
                            if ((e.target as HTMLElement).dataset.resize) return
                            e.stopPropagation()
                            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            pendingDragRef.current = { ev, startX: e.clientX, startY: e.clientY, offsetPx: e.clientY - rect.top, di, topPx: top, pointerId: e.pointerId }
                          }}
                          onPointerMove={e => {
                            const p = pendingDragRef.current
                            if (!p || p.ev.id !== ev.id) return
                            const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY)
                            if (dist > 6) {
                              e.preventDefault()
                              ;(e.currentTarget as HTMLElement).releasePointerCapture(p.pointerId)
                              pendingDragRef.current = null
                              setDragging({ ev: p.ev, offsetPx: p.offsetPx, ghostDay: p.di, ghostTopPx: p.topPx })
                            }
                          }}
                          onPointerUp={e => {
                            const p = pendingDragRef.current
                            if (p && p.ev.id === ev.id) {
                              pendingDragRef.current = null
                              setSelected(ev)
                            }
                          }}
                          style={{
                            position: 'absolute', top, height, left: 2, right: 2,
                            borderRadius: 6, padding: '3px 6px',
                            background: color + (isDraggingThis ? '0A' : '1A'),
                            borderLeft: `3px solid ${color}`,
                            zIndex: 10,
                            cursor: isDraggingThis ? 'grabbing' : 'grab',
                            outline: isSel ? `1.5px solid ${color}` : 'none',
                            outlineOffset: 1, overflow: 'hidden',
                            opacity: isDraggingThis ? 0.4 : 1,
                            transition: isDraggingThis ? 'none' : 'opacity 0.1s',
                          }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{ev.title}</p>
                          {height > 28 && <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, pointerEvents: 'none' }}>{fmtTime(ev.start_at)}</p>}
                          {/* Resize handle */}
                          <div
                            data-resize="1"
                            onPointerDown={e => {
                              e.preventDefault(); e.stopPropagation()
                              setResizing({ ev, ghostEndPx: top + height })
                            }}
                            style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
                              cursor: 's-resize', zIndex: 20,
                              background: `linear-gradient(to bottom, transparent, ${color}44)`,
                              borderRadius: '0 0 6px 6px',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Full-screen overlay during drag/resize */}
            {(dragging || resizing) && (
              <div
                onPointerMove={handleOverlayMove}
                onPointerUp={handleOverlayUp}
                style={{
                  position: 'fixed', inset: 0, zIndex: 50,
                  cursor: dragging ? 'grabbing' : 's-resize',
                }}
              />
            )}
          </div>
        </div>
      </div>
      )} {/* end calView !== 'month' */}

      {/* ── ROW 4 : Event detail | Tâches liées | Filtrer ─────────────────── */}
      <div className="col-span-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

        {/* ÉVÉNEMENT SÉLECTIONNÉ */}
        <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={labelStyle}>{selected ? 'Événement sélectionné' : 'Événement sélectionné'}</p>
            {selected && <button onClick={() => setSelected(null)}><X size={10} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>
          {selected ? (
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: evColor(selected), flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>{selected.title}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(selected.start_at)} → {fmtTime(selected.end_at)}</span>
              </div>
              {selected.location && <div style={{ display: 'flex', gap: 8 }}><MapPin size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.location}</span></div>}
              {selected.category && <div style={{ display: 'flex', gap: 8 }}><Tag size={10} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 99, background: evColor(selected) + '22', color: evColor(selected) }}>{selected.category}</span></div>}
              {selected.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{selected.description}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button onClick={() => setEditingEvent(selected)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#0E9594', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Pencil size={11} /> Modifier
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Trash2 size={11} /> Supprimer
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '14px 16px' }}>Clique sur un événement pour voir ses détails.</p>
          )}
        </div>

        {/* TÂCHES LIÉES */}
        <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={labelStyle}>Tâches cette semaine</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {weekTasks.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '14px 16px' }}>Aucune tâche cette semaine.</p>
            ) : weekTasks.slice(0, 6).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                {t.status === 'done'
                  ? <CheckCircle2 size={12} style={{ color: '#0E9594', flexShrink: 0 }} />
                  : <Circle size={12} style={{ color: t.priority === 'urgent' ? '#F2542D' : 'var(--text-muted)', flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTRER */}
        <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={labelStyle}>Filtrer</p>
            {activeCategories.length > 0 && (
              <button onClick={() => setActiveCategories([])} style={{ fontSize: 9, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer' }}>Réinitialiser</button>
            )}
          </div>
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 200 }}>
            <p style={{ ...labelStyle, marginBottom: 2 }}>Catégories</p>
            {/* Uniquement les catégories présentes dans les événements réels */}
            {Array.from(new Set(
              events.map(e => e.category).filter(Boolean) as string[]
            )).map(cat => {
              const color  = categoryColor(cat)
              const active = activeCategories.includes(cat)
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleCategory(cat)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    <span style={{ fontSize: 11, color: 'var(--wheat)' }}>{cat}</span>
                  </div>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${active ? color : 'var(--border)'}`, background: active ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 5 : Vue d'ensemble | Rappels | Sync ────────────────────────── */}
      <div className="col-span-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingBottom: 10 }}>

        {/* VUE D'ENSEMBLE — teal */}
        <div style={{ ...card({ background: '#0E9594', border: '1px solid #0E9594' }), display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Vue d'ensemble</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{fmtShortDate(weekStart)} – {fmtShortDate(addDays(weekStart, 6))}</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <p style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff', lineHeight: 1 }}>{events.length}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Événements</p>
            </div>
            {Object.entries(categoryCount).slice(0, 2).map(([cat, count]) => (
              <div key={cat}>
                <p style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff', lineHeight: 1 }}>{count}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{cat}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setCalView('week'); calGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8, marginTop: 'auto' }}>
            Voir la semaine <ChevronRight size={12} />
          </button>
        </div>

        {/* RAPPELS — orange */}
        <div style={{ ...card({ background: '#F2542D', border: '1px solid #F2542D' }), display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={11} color="rgba(255,255,255,0.9)" />
            <p style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rappels</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {reminders.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '12px 16px' }}>Rien dans les 24 prochaines heures.</p>
            ) : (showAllReminders ? reminders : reminders.slice(0, 4)).map(ev => (
              <div key={ev.id} style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{ev.title}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{fmtTime(ev.start_at)}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <button onClick={() => setShowAllReminders(v => !v)}
              style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
              {showAllReminders ? 'Réduire' : `Voir tous les rappels (${reminders.length})`} <ChevronRight size={12} style={{ transform: showAllReminders ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>

        {/* SYNC & INTÉGRATIONS */}
        <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={10} style={{ color: 'var(--text-muted)' }} />
            <p style={labelStyle}>Sync & Intégrations</p>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {/* Apple Calendar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: appleConnected ? 'rgba(14,149,148,0.08)' : 'var(--bg-card-hover)', border: `1px solid ${appleConnected ? 'rgba(14,149,148,0.25)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: appleConnected ? 'rgba(14,149,148,0.15)' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Apple size={14} style={{ color: appleConnected ? '#0E9594' : 'var(--wheat)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--wheat)' }}>Apple Calendar</p>
                  <p style={{ fontSize: 9, color: appleConnected ? '#0E9594' : 'var(--text-muted)' }}>
                    {appleConnected ? (syncing ? 'Sync…' : lastSync ? `Sync ${lastSync.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}` : 'Connecté') : 'CalDAV'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {appleConnected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0E9594' }} />}
                <button onClick={() => setAppleOpen(true)} style={{ fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', color: appleConnected ? '#0E9594' : 'var(--text-muted)', padding: 0 }}>
                  {appleConnected ? 'Reconnecter' : 'Connecter'}
                </button>
              </div>
            </div>
            {/* Google Calendar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={14} style={{ color: 'var(--wheat)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--wheat)' }}>Google Calendar</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>Bientôt disponible</p>
                </div>
              </div>
              <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Soon</span>
            </div>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setAppleOpen(true)}
              style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              Gérer mes intégrations <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(modalDate || editingEvent) && (
        <EventModal
          date={editingEvent ? editingEvent.start_at.slice(0, 10) : modalDate!}
          hour={editingEvent ? new Date(editingEvent.start_at).getHours() : modalHour}
          onSave={addEvent}
          onUpdate={updateEvent}
          onClose={() => { setModalDate(null); setEditingEvent(null) }}
          extraCategories={appleCalendars}
          initialValues={editingEvent}
        />
      )}
      {appleOpen && <AppleModal onClose={() => setAppleOpen(false)} onSynced={() => { refetch(); setAppleConnected(true); setLastSync(new Date()) }} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export (Suspense for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────
export default function CalendrierPage() {
  return (
    <Suspense fallback={null}>
      <CalendrierContent />
    </Suspense>
  )
}
