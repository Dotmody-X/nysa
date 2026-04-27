'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Tag, Clock, Trash2, Calendar } from 'lucide-react'
import { useCalendar, CalendarEvent, NewEvent } from '@/hooks/useCalendar'
import { useTasks } from '@/hooks/useTasks'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// ── helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HOUR_START = 7
const HOUR_END   = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const SLOT_PX = 60 // px per hour

const CATEGORY_COLORS: Record<string, string> = {
  Travail:   '#F2542D',
  Perso:     '#0E9594',
  Santé:     '#562C2C',
  Running:   '#11686A',
  Réunion:   '#F5DFBB',
  Autre:     '#888',
}

function getMonday(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function addDays(d: Date, n: number): Date {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isoLocal(date: Date, hour: number, min = 0): string {
  const d = new Date(date)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

function eventTopPx(iso: string): number {
  const d = new Date(iso)
  const mins = (d.getHours() - HOUR_START) * 60 + d.getMinutes()
  return (mins / 60) * SLOT_PX
}

function eventHeightPx(start: string, end: string): number {
  const s = new Date(start), e = new Date(end)
  const mins = (e.getTime() - s.getTime()) / 60000
  return Math.max((mins / 60) * SLOT_PX, 18)
}

function eventColor(ev: CalendarEvent): string {
  if (ev.color) return ev.color
  if (ev.category && CATEGORY_COLORS[ev.category]) return CATEGORY_COLORS[ev.category]
  return '#F2542D'
}

export default function CalendrierPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const { events, loading, addEvent, removeEvent } = useCalendar(weekStart)
  const { tasks } = useTasks()

  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [modalHour, setModalHour] = useState(9)
  const [form, setForm] = useState({ title: '', description: '', category: 'Travail', location: '', startTime: '09:00', endTime: '10:00' })
  const [saving, setSaving] = useState(false)
  const [activeCategories, setActiveCategories] = useState<string[]>([])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Current time indicator in px
  const nowMins = (new Date().getHours() - HOUR_START) * 60 + new Date().getMinutes()
  const nowPx   = Math.max(0, (nowMins / 60) * SLOT_PX)
  const todayInWeek = weekDays.some(d => d.getTime() === today.getTime())

  function prevWeek() { setWeekStart(d => addDays(d, -7)); setSelected(null) }
  function nextWeek() { setWeekStart(d => addDays(d, 7));  setSelected(null) }
  function goToday()  { setWeekStart(getMonday(new Date())); setSelected(null) }

  function eventsForDay(day: Date): CalendarEvent[] {
    const iso = day.toISOString().slice(0, 10)
    return events.filter(ev => {
      if (ev.start_at.slice(0, 10) !== iso) return false
      if (activeCategories.length > 0 && ev.category && !activeCategories.includes(ev.category)) return false
      return true
    })
  }

  function openModal(day: Date, hour: number) {
    setModalDate(day.toISOString().slice(0, 10))
    setModalHour(hour)
    setForm({
      title: '', description: '', category: 'Travail', location: '',
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime:   `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const base = new Date(modalDate + 'T00:00:00')
    const ev: NewEvent = {
      title: form.title,
      description: form.description || undefined,
      category: form.category || undefined,
      location: form.location || undefined,
      start_at: isoLocal(base, sh, sm),
      end_at:   isoLocal(base, eh, em),
      all_day:  false,
    }
    await addEvent(ev)
    setSaving(false)
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    await removeEvent(id)
    setSelected(null)
  }

  function toggleCategory(cat: string) {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const weekTasksDue = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T00:00:00')
    return d >= weekStart && d < addDays(weekStart, 7)
  })

  return (
    <div className="flex flex-col gap-0 max-w-[1400px]" style={{ height: 'calc(100vh - 48px)' }}>
      <PageHeader
        title="Calendrier"
        sub="Vue semaine · Événements · Planning"
        actions={
          <Button variant="primary" size="sm" onClick={() => openModal(weekDays[0], 9)}>
            <Plus size={13} /> Événement
          </Button>
        }
      />

      {/* Nav bar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="p-1.5 rounded-[6px] transition-opacity hover:opacity-70" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronLeft size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button onClick={nextWeek} className="p-1.5 rounded-[6px] transition-opacity hover:opacity-70" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <span className="text-sm font-semibold capitalize" style={{ color: 'var(--wheat)' }}>
          {weekStart.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={goToday} className="px-3 py-1 text-xs rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Aujourd'hui
        </button>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Chargement…' : `${events.length} événement${events.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Main */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Grid */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>

          {/* Day headers */}
          <div className="flex-shrink-0 grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div />
            {weekDays.map((day, i) => {
              const isToday = day.getTime() === today.getTime()
              return (
                <div key={i} className="py-2.5 text-center" style={{ borderLeft: '1px solid var(--border)' }}>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{DAY_LABELS[i]}</p>
                  <div className="mx-auto w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mt-0.5"
                    style={{ background: isToday ? '#F2542D' : 'transparent', color: isToday ? '#fff' : 'var(--wheat)' }}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="overflow-y-auto flex-1">
            <div className="relative" style={{ height: TOTAL_HOURS * SLOT_PX }}>

              {/* Hour lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                <div key={h} className="absolute w-full flex pointer-events-none" style={{ top: h * SLOT_PX }}>
                  <div className="w-11 text-right pr-2" style={{ paddingTop: 2 }}>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{String(HOUR_START + h).padStart(2, '0')}h</span>
                  </div>
                  <div className="flex-1" style={{ borderTop: '1px solid var(--border)', opacity: 0.4 }} />
                </div>
              ))}

              {/* Now indicator */}
              {todayInWeek && nowMins >= 0 && nowMins <= TOTAL_HOURS * 60 && (
                <div className="absolute pointer-events-none z-20 flex items-center" style={{ top: nowPx, left: 44, right: 0 }}>
                  <div className="w-2 h-2 rounded-full -ml-1" style={{ background: '#F2542D' }} />
                  <div className="h-px flex-1" style={{ background: '#F2542D', opacity: 0.8 }} />
                </div>
              )}

              {/* Day columns */}
              <div className="absolute inset-0" style={{ left: 44, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {weekDays.map((day, di) => {
                  const dayEvs = eventsForDay(day)
                  return (
                    <div key={di} className="relative" style={{ borderLeft: '1px solid var(--border)' }}>
                      {/* Click zones */}
                      {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                        <div key={h} className="absolute w-full cursor-pointer" style={{ top: h * SLOT_PX, height: SLOT_PX, zIndex: 1 }}
                          onClick={() => openModal(day, HOUR_START + h)} />
                      ))}
                      {/* Events */}
                      {dayEvs.map(ev => {
                        const top    = eventTopPx(ev.start_at)
                        const height = eventHeightPx(ev.start_at, ev.end_at)
                        const color  = eventColor(ev)
                        const isSel  = selected?.id === ev.id
                        return (
                          <div key={ev.id}
                            onClick={e => { e.stopPropagation(); setSelected(ev) }}
                            className="absolute left-0.5 right-0.5 rounded-[5px] px-1.5 py-1 cursor-pointer overflow-hidden"
                            style={{
                              top, height,
                              background: color + '20',
                              borderLeft: `3px solid ${color}`,
                              zIndex: 10,
                              outline: isSel ? `2px solid ${color}` : 'none',
                              outlineOffset: 1,
                            }}
                          >
                            <p className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>{ev.title}</p>
                            {height > 28 && <p className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{fmtTime(ev.start_at)}</p>}
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

        {/* Right panel */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Event detail */}
          <Card padding="none">
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {selected ? 'Événement sélectionné' : 'Sélectionner'}
              </p>
            </div>
            {selected ? (
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: eventColor(selected) }} />
                    <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--wheat)' }}>{selected.title}</p>
                  </div>
                  <button onClick={() => setSelected(null)}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(selected.start_at)} → {fmtTime(selected.end_at)}</span>
                </div>
                {selected.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{selected.location}</span>
                  </div>
                )}
                {selected.category && (
                  <div className="flex items-center gap-1.5">
                    <Tag size={10} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: eventColor(selected) + '22', color: eventColor(selected) }}>{selected.category}</span>
                  </div>
                )}
                {selected.description && <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{selected.description}</p>}
                <button onClick={() => handleDelete(selected.id)} className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: '#F2542D', opacity: 0.7 }}>
                  <Trash2 size={10} /> Supprimer
                </button>
              </div>
            ) : (
              <p className="text-[10px] p-3" style={{ color: 'var(--text-muted)' }}>Clique sur un événement pour voir ses détails.</p>
            )}
          </Card>

          {/* Tasks this week */}
          <Card padding="none">
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Tâches cette semaine</p>
            </div>
            {weekTasksDue.length === 0 ? (
              <p className="text-[10px] p-3" style={{ color: 'var(--text-muted)' }}>Aucune tâche due.</p>
            ) : weekTasksDue.slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: t.status === 'done' ? '#0E9594' : t.priority === 'urgent' ? '#F2542D' : 'var(--text-muted)' }} />
                <span className="text-[10px] truncate" style={{ color: t.status === 'done' ? 'var(--text-muted)' : 'var(--wheat)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
              </div>
            ))}
          </Card>

          {/* Filters */}
          <Card padding="none">
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Catégories</p>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                const active = activeCategories.includes(cat)
                return (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-2 text-[10px] rounded-[5px] px-2 py-1.5 text-left"
                    style={{ background: active ? color + '22' : 'transparent', color: active ? color : 'var(--text-muted)', border: `1px solid ${active ? color : 'transparent'}` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {cat}
                  </button>
                )
              })}
              {activeCategories.length > 0 && (
                <button onClick={() => setActiveCategories([])} className="text-[10px] mt-0.5 opacity-50 text-left" style={{ color: 'var(--text-muted)' }}>
                  Effacer les filtres
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-sm rounded-[14px] p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--wheat)' }}>Nouvel événement</p>
              <button onClick={() => setModalOpen(false)}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Titre *</label>
                <input autoFocus type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Réunion client…"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>

              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={11} />
                <span className="capitalize">{fmtDateLong(new Date(modalDate + 'T12:00:00'))}</span>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Début</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Fin</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
                  {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Lieu (facultatif)</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Bureau, Zoom…"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Détails…"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none resize-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Créer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
