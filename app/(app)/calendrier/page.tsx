'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Plus, X, MapPin, Tag, Clock,
  Trash2, Calendar, Bell, RefreshCw, Link2, CheckCircle2, Circle,
  Apple,
} from 'lucide-react'
import { useCalendar, CalendarEvent, NewEvent } from '@/hooks/useCalendar'
import { useTasks } from '@/hooks/useTasks'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DAY_LABELS   = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const HOUR_START   = 0
const HOUR_END     = 24
const TOTAL_HOURS  = HOUR_END - HOUR_START
const SLOT_PX      = 52
const TIME_COL     = 44

const CATEGORIES: Record<string, string> = {
  Travail:  '#F2542D',
  Perso:    '#0E9594',
  Santé:    '#562C2C',
  Running:  '#11686A',
  Réunion:  '#F5DFBB',
  Autre:    '#555',
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
  if (ev.category && CATEGORIES[ev.category]) return CATEGORIES[ev.category]
  return '#F2542D'
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
      <div className="w-full max-w-md rounded-[16px] p-6 flex flex-col gap-5" style={{ background: '#111', border: '1px solid rgba(245,223,187,0.12)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(245,223,187,0.08)' }}>
              {loadingCals ? <RefreshCw size={14} style={{ color: 'var(--wheat)', opacity: 0.5 }} /> : <Apple size={16} style={{ color: 'var(--wheat)' }} />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--wheat)', fontFamily: 'var(--font-display)' }}>Apple Calendar</p>
              <p className="text-[10px]" style={{ color: 'rgba(245,223,187,0.45)' }}>{stepLabel}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={14} style={{ color: 'rgba(245,223,187,0.4)' }} /></button>
        </div>

        {/* Step 1 — Instructions */}
        {step === 1 && (
          <>
            <div className="rounded-[10px] p-4 flex flex-col gap-2" style={{ background: 'rgba(14,149,148,0.12)', border: '1px solid rgba(14,149,148,0.25)' }}>
              <p className="text-xs font-semibold" style={{ color: '#0E9594' }}>Avant de continuer</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(245,223,187,0.65)' }}>
                Apple exige un <strong style={{ color: '#F5DFBB' }}>mot de passe spécifique à l'app</strong> pour les accès tiers. Ton mot de passe Apple ID principal ne fonctionnera pas.
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
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(245,223,187,0.65)' }}>
                    {s.t} <span style={{ color: '#F5DFBB' }}>{s.link}</span> {s.desc}
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
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(245,223,187,0.5)', letterSpacing: '0.1em' }}>Apple ID (email)</label>
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nom@icloud.com"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: '#1a1a1a', color: '#F5DFBB', border: '1px solid rgba(245,223,187,0.15)' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(245,223,187,0.5)', letterSpacing: '0.1em' }}>Mot de passe spécifique</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: '#1a1a1a', color: '#F5DFBB', border: '1px solid rgba(245,223,187,0.15)' }} />
              </div>
            </div>
            {result && (
              <p className="text-[11px] px-3 py-2 rounded-[7px]" style={{ background: result.startsWith('✅') ? 'rgba(14,149,148,0.12)' : 'rgba(242,84,45,0.12)', color: result.startsWith('✅') ? '#0E9594' : '#F2542D' }}>
                {result}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2 rounded-[8px] text-sm" style={{ background: '#1a1a1a', border: '1px solid rgba(245,223,187,0.15)', color: 'rgba(245,223,187,0.6)' }}>
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
            <div className="rounded-[10px] p-3" style={{ background: 'rgba(245,223,187,0.04)', border: '1px solid rgba(245,223,187,0.1)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(245,223,187,0.55)' }}>
                Coche les calendriers à <strong style={{ color: '#F5DFBB' }}>inclure</strong> dans NYSA. Les autres seront ignorés.
              </p>
            </div>

            <div className="flex flex-col gap-1" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {calendars.map(cal => {
                const isIncluded = !excluded.includes(cal.name)
                return (
                  <div key={cal.url}
                    onClick={() => toggleExclude(cal.name)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer"
                    style={{ background: isIncluded ? 'rgba(14,149,148,0.08)' : 'transparent', border: `1px solid ${isIncluded ? 'rgba(14,149,148,0.25)' : 'rgba(245,223,187,0.08)'}`, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!isIncluded) (e.currentTarget as HTMLElement).style.background = 'rgba(245,223,187,0.04)' }}
                    onMouseLeave={e => { if (!isIncluded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${isIncluded ? '#0E9594' : 'rgba(245,223,187,0.2)'}`,
                      background: isIncluded ? '#0E9594' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}>
                      {isIncluded && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: isIncluded ? 'var(--wheat)' : 'rgba(245,223,187,0.4)', fontWeight: isIncluded ? 500 : 400 }}>
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
              <button onClick={onClose} className="flex-1 py-2 rounded-[8px] text-sm" style={{ background: '#1a1a1a', border: '1px solid rgba(245,223,187,0.15)', color: 'rgba(245,223,187,0.6)' }}>
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
// Event Modal (create)
// ─────────────────────────────────────────────────────────────────────────────
function EventModal({
  date, hour, onSave, onClose,
}: {
  date: string
  hour: number
  onSave: (ev: NewEvent) => Promise<unknown>
  onClose: () => void
}) {
  const [form, setForm]     = useState({
    title: '', description: '', category: 'Travail', location: '',
    startTime: `${String(hour).padStart(2, '0')}:00`,
    endTime:   `${String(Math.min(hour + 1, 22)).padStart(2, '0')}:00`,
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.title.trim()) return
    setSaving(true)
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const base = new Date(date + 'T00:00:00')
    await onSave({
      title:       form.title,
      description: form.description || undefined,
      category:    form.category || undefined,
      location:    form.location || undefined,
      start_at:    isoLocal(base, sh, sm),
      end_at:      isoLocal(base, eh, em),
      all_day:     false,
    })
    setSaving(false)
    onClose()
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4" style={{ background: '#111', border: '1px solid rgba(245,223,187,0.12)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--wheat)', fontFamily: 'var(--font-display)' }}>Nouvel événement</p>
            <p className="text-[10px] capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>{displayDate}</p>
          </div>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <input autoFocus type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Titre de l'événement…"
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />

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

          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
            {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Lieu (optionnel)…"
            className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
            style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />

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
            {saving ? '…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calendar content
// ─────────────────────────────────────────────────────────────────────────────
function CalendrierContent() {
  const params = useSearchParams()
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const { events, loading, addEvent, removeEvent, refetch } = useCalendar(weekStart)
  const { tasks } = useTasks()

  const [selected, setSelected]           = useState<CalendarEvent | null>(null)
  const [modalDate, setModalDate]         = useState<string | null>(null)
  const [modalHour, setModalHour]         = useState(9)
  const [appleOpen, setAppleOpen]         = useState(false)
  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [notification, setNotification]   = useState<string | null>(null)
  const [appleConnected, setAppleConnected] = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [lastSync, setLastSync]           = useState<Date | null>(null)

  const gridScrollRef = useRef<HTMLDivElement | null>(null)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekDays   = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const nowMins    = (new Date().getHours() - HOUR_START) * 60 + new Date().getMinutes()
  const nowPx      = Math.max(0, (nowMins / 60) * SLOT_PX)
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime())

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (gridScrollRef.current) {
      const scrollTo = Math.max(0, nowPx - 120)
      gridScrollRef.current.scrollTop = scrollTo
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
    bgSync(true)
    const interval = setInterval(() => bgSync(false), 5 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function prevWeek() { setWeekStart(d => addDays(d, -7)); setSelected(null) }
  function nextWeek() { setWeekStart(d => addDays(d, 7));  setSelected(null) }
  function goToday()  { setWeekStart(getMonday(new Date())); setSelected(null) }

  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function eventsForDay(day: Date): CalendarEvent[] {
    const dayStr = localDateStr(day)
    return events.filter(ev => {
      // Comparer en heure locale pour éviter le décalage UTC
      if (localDateStr(new Date(ev.start_at)) !== dayStr) return false
      if (activeCategories.length > 0 && ev.category && !activeCategories.includes(ev.category)) return false
      return true
    })
  }

  function toggleCategory(cat: string) {
    setActiveCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function handleDelete(id: string) {
    await removeEvent(id)
    setSelected(null)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-[10px] text-sm font-semibold"
          style={{ background: '#111', border: '1px solid rgba(245,223,187,0.15)', color: 'var(--wheat)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {notification}
        </div>
      )}

      {/* ── ROW 1 : Hero header + À VENIR ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10 }}>

        {/* Hero title */}
        <div style={{ ...card(), padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150 }}>
          <p style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#F2542D', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Calendrier</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--wheat)', lineHeight: 1.0, letterSpacing: '-0.02em', textTransform: 'uppercase', marginTop: 8 }}>
            Votre journée.<br />Votre plan.
          </h1>
        </div>

        {/* À VENIR */}
        <div style={{ ...card({ background: '#0E9594', border: '1px solid #0E9594' }), display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>À venir</p>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{upcoming.length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', padding: '12px 16px' }}>Aucun événement à venir.</p>
            ) : upcoming.map(ev => (
              <div key={ev.id} onClick={() => setSelected(ev)}
                style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {fmtShortDate(new Date(ev.start_at))} · {fmtTime(ev.start_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={13} color="#fff" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2 : Nav bar ────────────────────────────────────────────────── */}
      <div style={{ ...card(), padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* View tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {[['JOUR', false], ['SEMAINE', true], ['MOIS', false]].map(([label, active]) => (
            <button key={label as string} style={{ padding: '4px 14px', borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', border: 'none', background: active ? '#fff' : 'transparent', color: active ? '#111' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevWeek} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <ChevronLeft size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          <button onClick={goToday} style={{ padding: '5px 16px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--wheat)', cursor: 'pointer' }}>
            Aujourd'hui
          </button>
          <button onClick={nextWeek} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)', fontFamily: 'var(--font-display)', minWidth: 120, textAlign: 'center', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
            {fmtMonthYear(weekStart)}
          </span>
        </div>

        {/* + Événement */}
        <button onClick={() => setModalDate(today.toISOString().slice(0, 10))}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', background: '#F2542D', color: '#fff', cursor: 'pointer', border: 'none', letterSpacing: '0.04em' }}>
          <Plus size={13} /> + ÉVÉNEMENT
        </button>
      </div>

      {/* ── ROW 3 : Calendar grid ──────────────────────────────────────────── */}
      <div style={{ ...card(), display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 350 }}>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(7, 1fr)`, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
            <div style={{ position: 'absolute', inset: 0, left: TIME_COL, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekDays.map((day, di) => {
                const dayEvs = eventsForDay(day)
                return (
                  <div key={di} style={{ position: 'relative', borderRight: di < 6 ? '1px solid var(--border)' : 'none' }}>
                    {/* Click zones */}
                    {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                      <div key={h} style={{ position: 'absolute', top: h * SLOT_PX, height: SLOT_PX, left: 0, right: 0, cursor: 'pointer', zIndex: 1 }}
                        onClick={() => { setModalDate(day.toISOString().slice(0, 10)); setModalHour(HOUR_START + h) }} />
                    ))}
                    {/* Events */}
                    {dayEvs.map(ev => {
                      const top    = eventTop(ev.start_at)
                      const height = eventHeight(ev.start_at, ev.end_at)
                      const color  = evColor(ev)
                      const isSel  = selected?.id === ev.id
                      return (
                        <div key={ev.id}
                          onClick={e => { e.stopPropagation(); setSelected(ev) }}
                          style={{
                            position: 'absolute', top, height, left: 2, right: 2,
                            borderRadius: 6, padding: '3px 6px',
                            background: color + '1A',
                            borderLeft: `3px solid ${color}`,
                            zIndex: 10, cursor: 'pointer',
                            outline: isSel ? `1.5px solid ${color}` : 'none',
                            outlineOffset: 1, overflow: 'hidden',
                          }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.title}</p>
                          {height > 28 && <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{fmtTime(ev.start_at)}</p>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 4 : Event detail | Tâches liées | Filtrer ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

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
              <button onClick={() => handleDelete(selected.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
                <Trash2 size={11} /> Supprimer
              </button>
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
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ ...labelStyle, marginBottom: 2 }}>Catégories</p>
            {Object.entries(CATEGORIES).map(([cat, color]) => {
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingBottom: 10 }}>

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
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8, marginTop: 'auto' }}>
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
            ) : reminders.slice(0, 4).map(ev => (
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
            <button style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 6 }}>
              Voir tous les rappels <ChevronRight size={12} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: appleConnected ? 'rgba(14,149,148,0.08)' : 'rgba(245,223,187,0.04)', border: `1px solid ${appleConnected ? 'rgba(14,149,148,0.25)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: appleConnected ? 'rgba(14,149,148,0.15)' : 'rgba(245,223,187,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(245,223,187,0.02)', border: '1px solid var(--border)', opacity: 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,223,187,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <button style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              Gérer mes intégrations <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalDate && (
        <EventModal
          date={modalDate}
          hour={modalHour}
          onSave={addEvent}
          onClose={() => setModalDate(null)}
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
