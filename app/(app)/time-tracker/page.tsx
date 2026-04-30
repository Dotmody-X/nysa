'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Square, Plus, CalendarPlus, Pencil, Trash2, X, PenLine,
  Download, MoreVertical, ChevronDown, BarChart2, LayoutGrid, List, ArrowRight,
} from 'lucide-react'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects }    from '@/hooks/useProjects'
import type { TimeEntry } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

/* ── Period types ─────────────────────────────────────────────────────────── */
type Period  = 'this_week' | 'last_7' | 'this_month' | 'last_month'
type GroupBy = 'project' | 'category' | 'day'
type View    = 'list' | 'chart'

const PERIOD_LABELS: Record<Period, string> = {
  this_week:  'Cette semaine',
  last_7:     '7 derniers jours',
  this_month: 'Ce mois',
  last_month: 'Mois dernier',
}
const GROUPBY_LABELS: Record<GroupBy, string> = {
  project:  'Projet',
  category: 'Catégorie',
  day:      'Jour',
}

function getPeriodDates(period: Period): { from: string; to?: string } {
  const now = new Date()
  if (period === 'this_week') {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0)
    return { from: d.toISOString() }
  }
  if (period === 'last_7') {
    const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0)
    return { from: d.toISOString() }
  }
  if (period === 'this_month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  }
  // last_month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

/* ── Category colours ─────────────────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  'Design':        '#0E9594',
  'Développement': '#F2542D',
  'Dev':           '#F2542D',
  'Apprentissage': '#F5DFBB',
  'Admin':         '#E07030',
  'Santé':         '#4ECDC4',
  'Running':       '#4ECDC4',
}
const catColor = (c?: string | null) => (c ? (CAT_COLORS[c] ?? '#0E9594') : '#555')

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtSec(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmtDur(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function toLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function toLocalTimeStr(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function exportCSV(entries: TimeEntry[], projects: Array<{ id: string; name: string }>) {
  const rows = [
    ['Description','Projet','Catégorie','Facturable','Début','Fin','Durée (s)'],
    ...entries.filter(e => e.duration_seconds).map(e => {
      const proj = projects.find(p => p.id === e.project_id)
      return [
        e.description ?? '', proj?.name ?? '', e.category ?? '',
        e.is_billable ? 'Oui' : 'Non',
        e.started_at, e.ended_at ?? '', String(e.duration_seconds ?? 0),
      ]
    }),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'time-entries.csv'; a.click()
  URL.revokeObjectURL(url)
}

/* ── Mini sparkline bar chart ─────────────────────────────────────────────── */
function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 'auto' }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${Math.max(6, (v / max) * 100)}%`,
          background: v > 0 ? color : 'rgba(255,255,255,0.08)',
          opacity: i === values.length - 1 ? 1 : 0.55,
          transition: 'height 0.4s ease',
        }} />
      ))}
    </div>
  )
}

/* ── SVG Donut chart ──────────────────────────────────────────────────────── */
function DonutChart({ segments, label }: {
  segments: { color: string; pct: number }[]
  label: string
}) {
  const r = 70, cx = 90, cy = 90, sw = 22
  const circ = 2 * Math.PI * r
  let cum = 0
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
      {segments.filter(s => s.pct > 0).map((seg, i) => {
        const dash  = `${seg.pct / 100 * circ} ${circ}`
        const angle = cum / 100 * 360 - 90
        cum += seg.pct
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={dash}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        )
      })}
      <text x={cx} y={cy - 6}  textAnchor="middle" fill="var(--wheat)"      fontSize="18" fontWeight="900" fontFamily="var(--font-display)">{label}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="9"  fontFamily="var(--font-display)" letterSpacing="2">TOTAL</text>
    </svg>
  )
}

/* ── Stacked bar chart ────────────────────────────────────────────────────── */
function StackedBar({ days }: {
  days: { label: string; total: number; segments: { color: string; value: number }[] }[]
}) {
  const maxSec = Math.max(...days.map(d => d.total), 1)
  const H = 130
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: H + 22, flex: 1 }}>
      {days.map((day, di) => {
        const barH = (day.total / maxSec) * H
        return (
          <div key={di} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: barH, borderRadius: '3px 3px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {day.segments.map((seg, si) => (
                  <div key={si} style={{ width: '100%', flex: seg.value, background: seg.color, minHeight: 2 }} />
                ))}
                {day.segments.length === 0 && barH > 0 && <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)' }} />}
              </div>
            </div>
            <span style={{ fontSize: 9, color: 'rgba(240,228,204,0.45)', ...DF, fontWeight: 600 }}>{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Dropdown générique ───────────────────────────────────────────────────── */
function Dropdown<T extends string>({
  value, options, labels, onChange, dark,
}: {
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (v: T) => void
  dark?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const bg     = dark ? 'rgba(255,255,255,0.1)'  : 'var(--bg-input)'
  const border = dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border)'
  const txtC   = dark ? '#F0E4CC' : 'var(--wheat)'
  const muted  = dark ? 'rgba(240,228,204,0.55)' : 'var(--text-muted)'
  const menuBg = dark ? '#0d4a4b' : 'var(--bg-card)'
  const menuBorder = dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, border, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 10, color: txtC }}>{labels[value]}</span>
        <ChevronDown size={10} style={{ color: muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: menuBg, border: menuBorder, borderRadius: 8, minWidth: '100%', padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false) }}
              style={{ padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: opt === value ? '#F2542D' : txtC, fontWeight: opt === value ? 700 : 400, background: opt === value ? 'rgba(242,84,45,0.08)' : 'transparent' }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.07)' : 'var(--bg-card-hover)' }}
              onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              {labels[opt]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Context menu (⋮) ─────────────────────────────────────────────────────── */
function ContextMenu({ items, onClose }: {
  items: { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 160, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: item.danger ? '#F2542D' : 'var(--wheat)', fontWeight: item.danger ? 600 : 400, textAlign: 'left' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ══ Edit Entry Modal ═════════════════════════════════════════════════════════ */
function EditEntryModal({
  entry, projects, onSave, onDelete, onClose,
}: {
  entry: TimeEntry
  projects: Array<{ id: string; name: string; color: string }>
  onSave:   (id: string, patch: Partial<Pick<TimeEntry,'description'|'project_id'|'category'|'started_at'|'ended_at'|'is_billable'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
  onClose:  () => void
}) {
  const [form, setForm] = useState({
    description: entry.description ?? '',
    projectId:   entry.project_id  ?? '',
    category:    entry.category    ?? '',
    billable:    entry.is_billable,
    startDate:   toLocalDate(entry.started_at),
    startTime:   toLocalTimeStr(entry.started_at),
    endDate:     entry.ended_at ? toLocalDate(entry.ended_at)    : toLocalDate(entry.started_at),
    endTime:     entry.ended_at ? toLocalTimeStr(entry.ended_at) : '',
  })
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function submit() {
    setSaving(true)
    const startedAt = new Date(`${form.startDate}T${form.startTime}:00`).toISOString()
    const endedAt   = form.endTime ? new Date(`${form.endDate}T${form.endTime}:00`).toISOString() : entry.ended_at
    await onSave(entry.id, { description: form.description || undefined, project_id: form.projectId || undefined, category: form.category || undefined, is_billable: form.billable, started_at: startedAt, ended_at: endedAt })
    setSaving(false); onClose()
  }

  const inp: React.CSSProperties = { background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ ...DF, fontWeight: 700, fontSize: 14, color: 'var(--wheat)' }}>Modifier l'entrée</p>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Sur quoi as-tu travaillé ?" style={inp} autoFocus /></div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Projet</label>
          <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} style={inp}>
            <option value="">Sans projet</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Catégorie</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Design, Dev, Réunion…" style={inp} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Début</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inp, marginBottom: 4 }} />
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inp} /></div>
          <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Fin</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inp, marginBottom: 4 }} />
            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} placeholder="—" style={inp} /></div>
        </div>
        <button onClick={() => setForm(f => ({ ...f, billable: !f.billable }))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.billable ? 'rgba(14,149,148,0.3)' : 'var(--border)'}`, background: form.billable ? 'rgba(14,149,148,0.08)' : 'transparent', cursor: 'pointer', ...DF }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${form.billable ? '#0E9594' : 'var(--border)'}`, background: form.billable ? '#0E9594' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {form.billable && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: form.billable ? '#0E9594' : 'var(--text-muted)', fontWeight: 600 }}>Facturable</span>
        </button>
        <div className="flex gap-2 justify-between">
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} /> Supprimer</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
              <button onClick={async () => { await onDelete(entry.id); onClose() }} style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#F2542D', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Confirmer</button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>Annuler</button>
            <button onClick={submit} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? '…' : 'Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ Manual Entry Modal ═══════════════════════════════════════════════════════ */
function ManualEntryModal({
  projects, onCreate, onClose,
}: {
  projects: Array<{ id: string; name: string; color: string }>
  onCreate: (patch: { description?: string; project_id?: string; category?: string; is_billable?: boolean; started_at: string; ended_at?: string }) => Promise<unknown>
  onClose:  () => void
}) {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const [form, setForm] = useState({
    description: '', projectId: '', category: '', billable: true,
    startDate: yd(yesterday), startTime: '09:00', endDate: yd(yesterday), endTime: '10:00',
  })
  const [saving, setSaving] = useState(false)
  async function submit() {
    if (!form.startDate || !form.startTime) return
    setSaving(true)
    const startedAt = new Date(`${form.startDate}T${form.startTime}:00`).toISOString()
    const endedAt   = form.endDate && form.endTime ? new Date(`${form.endDate}T${form.endTime}:00`).toISOString() : undefined
    await onCreate({ description: form.description || undefined, project_id: form.projectId || undefined, category: form.category || undefined, is_billable: form.billable, started_at: startedAt, ended_at: endedAt })
    setSaving(false); onClose()
  }
  const inp: React.CSSProperties = { background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[16px] p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ ...DF, fontWeight: 700, fontSize: 14, color: 'var(--wheat)' }}>Entrée manuelle</p>
          <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Sur quoi as-tu travaillé ?" style={inp} autoFocus onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Projet</label>
          <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} style={inp}>
            <option value="">Sans projet</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Catégorie</label>
          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Design, Dev, Réunion…" style={inp} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Début</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: e.target.value }))} style={{ ...inp, marginBottom: 4 }} />
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inp} /></div>
          <div><label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Fin</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inp, marginBottom: 4 }} />
            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} placeholder="—" style={inp} /></div>
        </div>
        <button onClick={() => setForm(f => ({ ...f, billable: !f.billable }))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.billable ? 'rgba(14,149,148,0.3)' : 'var(--border)'}`, background: form.billable ? 'rgba(14,149,148,0.08)' : 'transparent', cursor: 'pointer', ...DF }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${form.billable ? '#0E9594' : 'var(--border)'}`, background: form.billable ? '#0E9594' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {form.billable && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: form.billable ? '#0E9594' : 'var(--text-muted)', fontWeight: 600 }}>Facturable</span>
        </button>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={submit} disabled={saving || !form.startDate || !form.startTime} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? '…' : 'Créer'}</button>
        </div>
      </div>
    </div>
  )
}

/* ══ Main page ════════════════════════════════════════════════════════════════ */
export default function TimeTrackerPage() {
  /* ── UI state ──────────────────────────────────────────────────────────── */
  const [period,       setPeriod]       = useState<Period>('this_week')
  const [groupBy,      setGroupBy]      = useState<GroupBy>('project')
  const [view,         setView]         = useState<View>('list')
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [openMenu,     setOpenMenu]     = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [manualOpen,   setManualOpen]   = useState(false)
  const [desc,    setDesc]    = useState('')
  const [projId,  setProjId]  = useState('')
  const [billable, setBillable] = useState(true)
  const [addToCalendar, setAddToCalendar] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Fetch data based on period ─────────────────────────────────────────── */
  const { from, to } = getPeriodDates(period)
  const { entries, loading, start, stop, update, remove, createManual } = useTimeEntries(from, to)
  const { projects } = useProjects()

  const running = entries.find(e => !e.ended_at)

  useEffect(() => {
    if (running) {
      setElapsed(Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000))
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running?.id])

  /* ── Data transforms ─────────────────────────────────────────────────────── */
  const today = new Date().toISOString().slice(0, 10)

  // 7 jours à afficher dans les graphiques (selon période)
  const chartDays = (() => {
    if (period === 'this_week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i)
        return d.toISOString().slice(0, 10)
      })
    }
    // last_7 ou autres : 7 derniers jours
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i)
      return d.toISOString().slice(0, 10)
    })
  })()
  const DAY_LABELS = period === 'this_week' ? ['L','M','M','J','V','S','D'] : chartDays.map(d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'narrow' }))

  const secPerDay  = chartDays.map(day =>
    entries.filter(e => e.started_at.slice(0, 10) === day && e.duration_seconds)
      .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  )
  const totalSec   = entries.filter(e => e.duration_seconds).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const todaySec   = entries.filter(e => e.started_at.slice(0, 10) === today && e.duration_seconds)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const workingDays = chartDays.slice(0, 5).filter((_, i) => secPerDay[i] > 0).length
  const avgSec     = workingDays > 0 ? totalSec / workingDays : 0
  const activeProjs = new Set(entries.filter(e => e.project_id).map(e => e.project_id)).size
  const billableSec = entries.filter(e => e.is_billable && e.duration_seconds).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const prodPct    = totalSec > 0 ? Math.round(billableSec / totalSec * 100) : 0

  /* ── Grouped rows (selon groupBy) ─────────────────────────────────────── */
  type Row = { id: string; name: string; color: string; seconds: number; desc: string; category: string | null }
  const groupedRows: Row[] = (() => {
    if (groupBy === 'project') {
      const rows: Row[] = []
      projects.forEach(p => {
        const pe = entries.filter(e => e.project_id === p.id && e.duration_seconds)
        if (!pe.length) return
        rows.push({ id: p.id, name: p.name, color: p.color ?? '#F2542D',
          seconds: pe.reduce((s, e) => s + (e.duration_seconds ?? 0), 0),
          desc: pe[0]?.description ?? '', category: pe.find(e => e.category)?.category ?? null })
      })
      const noProjSec = entries.filter(e => !e.project_id && e.duration_seconds).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
      if (noProjSec > 0) rows.push({ id: 'none', name: 'Sans projet', color: '#888', seconds: noProjSec, desc: '', category: null })
      return rows.sort((a, b) => b.seconds - a.seconds)
    }
    if (groupBy === 'category') {
      const catMap: Record<string, number> = {}
      entries.filter(e => e.duration_seconds).forEach(e => {
        const c = e.category ?? 'Sans catégorie'
        catMap[c] = (catMap[c] ?? 0) + (e.duration_seconds ?? 0)
      })
      return Object.entries(catMap).sort((a, b) => b[1] - a[1])
        .map(([cat, sec]) => ({ id: cat, name: cat, color: catColor(cat), seconds: sec, desc: '', category: cat }))
    }
    // day
    const dayMap: Record<string, number> = {}
    entries.filter(e => e.duration_seconds).forEach(e => {
      const d = e.started_at.slice(0, 10); dayMap[d] = (dayMap[d] ?? 0) + (e.duration_seconds ?? 0)
    })
    return Object.entries(dayMap).sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, sec]) => ({
        id: day,
        name: new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
        color: '#F2542D', seconds: sec, desc: '', category: null,
      }))
  })()

  /* Category distribution (donut) */
  const catMap: Record<string, number> = {}
  entries.filter(e => e.duration_seconds).forEach(e => {
    const c = e.category ?? 'Autre'
    catMap[c] = (catMap[c] ?? 0) + (e.duration_seconds ?? 0)
  })
  const catList    = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const donutSegs  = catList.map(([cat, sec]) => ({ color: catColor(cat), pct: totalSec > 0 ? sec / totalSec * 100 : 0, label: cat, sec }))

  /* Stacked bar days */
  const allCats    = catList.map(([c]) => c)
  const stackedDays = chartDays.map((day, i) => {
    const de = entries.filter(e => e.started_at.slice(0, 10) === day && e.duration_seconds)
    return {
      label: DAY_LABELS[i], total: secPerDay[i],
      segments: allCats
        .map(cat => ({ color: catColor(cat), value: de.filter(e => (e.category ?? 'Autre') === cat).reduce((s, e) => s + (e.duration_seconds ?? 0), 0) }))
        .filter(s => s.value > 0),
    }
  })

  const runningProj = running ? projects.find(p => p.id === running.project_id) : null

  async function handleStart() {
    if (!desc.trim()) return
    await start(projId || null, desc.trim(), billable)
    setDesc('')
  }
  async function handleStop() {
    if (!running) return
    await stop(running.id, running.started_at, { addToCalendar })
  }

  async function handleStartForProject(row: Row) {
    // Démarre une session pour ce projet/catégorie
    const projectId = row.id !== 'none' && groupBy === 'project' ? row.id : null
    const description = row.desc || row.name
    await start(projectId, description, true)
  }

  /* ── Shared styles ───────────────────────────────────────────────────────── */
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, ...extra,
  })
  const tableLabelStyle: React.CSSProperties = {
    fontSize: 8, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', ...DF, fontWeight: 700,
  }

  const filteredEntries = entries.filter(e => e.duration_seconds)
  const visibleEntries  = showAllRecent ? filteredEntries : filteredEntries.slice(0, 6)

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
    <div className="bento-grid md:grid md:grid-cols-4 page-wrap" style={{ gap: 10, alignContent: 'start' }}>

      {/* ─── ROW 1 : Hero + Session en cours ──────────────────────────────── */}

      {/* Hero — col-span-2, h=300 */}
      <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 300, paddingBottom: 20 }}>
        <p style={{ ...DF, fontSize: 10, fontWeight: 700, color: '#F2542D', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
          Time Trackers
        </p>
        <h1 style={{ ...DF, fontWeight: 900, fontSize: 'clamp(42px, 5.5vw, 72px)', lineHeight: 0.88, color: 'var(--wheat)', letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 18 }}>
          TIME<br />TRACKERS.
        </h1>
        <p style={{ ...DF, fontSize: 11, fontWeight: 700, color: '#0E9594', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Suivez. Analysez. Améliorez.
        </p>
      </div>

      {/* Session en cours — col-span-2, h=300 */}
      <div className="col-span-2" style={{
        height: 300, borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: running ? '#F2542D' : 'var(--bg-card)',
        border: running ? 'none' : '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: 22,
      }}>
        {running ? (
          <>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -70, right: 60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite' }} />
                <span style={{ ...DF, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Session en cours</span>
              </div>
              <button style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <MoreVertical size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <button onClick={handleStop} style={{ width: 60, height: 60, borderRadius: '50%', background: '#0E9594', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
                <Square size={20} fill="#fff" color="#fff" />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...DF, fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {running.description || 'Session de travail'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                  {runningProj?.name ?? 'Sans projet'}{running.category ? ` • ${running.category}` : ''}
                </p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 34, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>
                  {fmtSec(elapsed)}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Aujourd'hui</p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 26, color: '#fff', lineHeight: 1 }}>{fmtDur(todaySec + elapsed)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setAddToCalendar(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: addToCalendar ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 600, ...DF }}>
                <CalendarPlus size={10} /> {addToCalendar ? 'Agenda ✓' : 'Agenda'}
              </button>
              <button onClick={() => setManualOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, ...DF }}>
                <PenLine size={10} /> Entrée manuelle
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ ...DF, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14 }}>Démarrer une session</p>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Sur quoi travailles-tu ?"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 13, marginBottom: 10, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select value={projId} onChange={e => setProjId(e.target.value)} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }}>
                <option value="">Sans projet</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => setBillable(b => !b)} style={{ padding: '8px 12px', borderRadius: 8, background: billable ? 'rgba(14,149,148,0.15)' : 'var(--bg-input)', color: billable ? '#0E9594' : 'var(--text-muted)', border: '1px solid var(--border)', ...DF, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                {billable ? '€ Fact.' : 'Non fact.'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <button onClick={handleStart} disabled={!desc.trim()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, background: desc.trim() ? '#F2542D' : 'var(--bg-input)', color: desc.trim() ? '#fff' : 'var(--text-muted)', border: 'none', cursor: desc.trim() ? 'pointer' : 'default', ...DF, fontWeight: 700, fontSize: 13 }}>
                <Play size={13} fill={desc.trim() ? '#fff' : 'var(--text-muted)'} /> Démarrer
              </button>
              <button onClick={() => setManualOpen(true)} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                <PenLine size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── ROW 2 : Filter bar ───────────────────────────────────────────── */}
      <div className="col-span-4" style={{ ...card(), padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Période */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={tableLabelStyle}>Période</span>
          <Dropdown<Period>
            value={period}
            options={['this_week','last_7','this_month','last_month']}
            labels={PERIOD_LABELS}
            onChange={setPeriod}
          />
        </div>
        {/* Groupe par */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={tableLabelStyle}>Groupe par</span>
          <Dropdown<GroupBy>
            value={groupBy}
            options={['project','category','day']}
            labels={GROUPBY_LABELS}
            onChange={setGroupBy}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => exportCSV(filteredEntries, projects)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, ...DF, fontWeight: 600 }}>
          <Download size={11} /> Exporter
        </button>
        <button onClick={() => setManualOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, background: '#F2542D', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, ...DF, fontWeight: 700, letterSpacing: '0.05em' }}>
          <Plus size={11} /> Nouvelle entrée
        </button>
      </div>

      {/* ─── ROW 3 : KPI cards ────────────────────────────────────────────── */}

      {/* KPI 1 — Temps total */}
      <div style={{ ...card(), padding: 20, height: 280, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...tableLabelStyle, marginBottom: 6 }}>Temps total</span>
        <p style={{ ...DF, fontWeight: 900, fontSize: 38, color: 'var(--wheat)', lineHeight: 1, marginBottom: 6 }}>{fmtDur(totalSec)}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{PERIOD_LABELS[period]}</p>
        <MiniBarChart values={secPerDay} color="var(--accent)" />
      </div>

      {/* KPI 2 — Moyenne / jour (wheat bg) */}
      <div style={{ background: '#F5DFBB', borderRadius: 12, padding: 20, height: 280, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(26,10,10,0.55)', textTransform: 'uppercase', ...DF, fontWeight: 700, marginBottom: 6 }}>Moyenne / jour</span>
        <p style={{ ...DF, fontWeight: 900, fontSize: 38, color: '#1A0A0A', lineHeight: 1, marginBottom: 6 }}>{fmtDur(avgSec)}</p>
        <p style={{ fontSize: 10, color: 'rgba(26,10,10,0.5)' }}>{workingDays} jour{workingDays > 1 ? 's' : ''} travaillé{workingDays > 1 ? 's' : ''}</p>
        <MiniBarChart values={secPerDay} color="rgba(26,10,10,0.5)" />
      </div>

      {/* KPI 3 — Projets actifs (orange) */}
      <div style={{ background: '#F2542D', borderRadius: 12, padding: 20, height: 280, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', ...DF, fontWeight: 700, marginBottom: 6 }}>Projets actifs</span>
        <p style={{ ...DF, fontWeight: 900, fontSize: 56, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{activeProjs}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{PERIOD_LABELS[period]}</p>
        <MiniBarChart values={secPerDay} color="rgba(255,255,255,0.65)" />
      </div>

      {/* KPI 4 — Productivité (teal) */}
      <div style={{ background: '#0E9594', borderRadius: 12, padding: 20, height: 280, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', ...DF, fontWeight: 700, marginBottom: 6 }}>Taux facturable</span>
        <p style={{ ...DF, fontWeight: 900, fontSize: 56, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{prodPct}%</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 'auto' }}>{fmtDur(billableSec)} facturables</p>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: '#fff', width: `${prodPct}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* ─── ROW 4 : Temps enregistrés table ─────────────────────────────── */}
      <div className="col-span-4" style={{ ...card(), overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--wheat)', textTransform: 'uppercase' }}>
            Temps enregistrés — {GROUPBY_LABELS[groupBy]}
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { icon: List,      v: 'list'  as View },
              { icon: BarChart2, v: 'chart' as View },
            ] as const).map(({ icon: Icon, v }) => (
              <button key={v} onClick={() => setView(v)}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`, background: view === v ? 'rgba(242,84,45,0.1)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: view === v ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Icon size={11} />
              </button>
            ))}
          </div>
        </div>

        {view === 'chart' ? (
          /* ── Vue graphique ── */
          <div style={{ padding: 20 }}>
            {groupedRows.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune entrée sur cette période.</p>
              : groupedRows.map(row => {
                  const pct = totalSec > 0 ? (row.seconds / totalSec * 100) : 0
                  return (
                    <div key={row.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--wheat)' }}>{row.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(pct)}%</span>
                          <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: 'var(--wheat)' }}>{fmtDur(row.seconds)}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: row.color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })
            }
          </div>
        ) : (
          /* ── Vue liste ── */
          <>
            {/* Table columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 90px 50px 1fr 90px 72px', padding: '8px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
              {[GROUPBY_LABELS[groupBy] + ' / Tâche','Catégorie','Temps','%','','Durée',''].map((h, i) => (
                <span key={i} style={tableLabelStyle}>{h}</span>
              ))}
            </div>

            {loading ? <p style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>
            : groupedRows.length === 0 ? <p style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Aucune entrée sur cette période.</p>
            : groupedRows.map(row => {
                const pct = totalSec > 0 ? Math.round(row.seconds / totalSec * 100) : 0
                return (
                  <div key={row.id}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 130px 90px 50px 1fr 90px 72px', padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 12, alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    {/* Projet / Tâche */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 3, background: row.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--wheat)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</p>
                        {row.desc && <p style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.desc}</p>}
                      </div>
                    </div>

                    {/* Catégorie */}
                    {row.category
                      ? <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 6, background: catColor(row.category) + '20', color: catColor(row.category), ...DF, fontWeight: 700, border: `1px solid ${catColor(row.category)}40`, display: 'inline-block' }}>{row.category}</span>
                      : <span style={{ fontSize: 9, color: 'var(--text-subtle)' }}>—</span>}

                    {/* Temps */}
                    <span style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>{fmtDur(row.seconds)}</span>

                    {/* % */}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>

                    {/* Bar */}
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: row.color, width: `${pct}%` }} />
                    </div>

                    {/* Durée */}
                    <span style={{ ...DF, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{fmtDur(row.seconds)}</span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => handleStartForProject(row)}
                        title="Démarrer une session"
                        style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#F2542D'; (e.currentTarget as HTMLElement).style.color = '#F2542D' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>
                        <Play size={9} fill="currentColor" />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenMenu(openMenu === `proj-${row.id}` ? null : `proj-${row.id}`)}
                          style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <MoreVertical size={9} />
                        </button>
                        {openMenu === `proj-${row.id}` && (
                          <ContextMenu
                            onClose={() => setOpenMenu(null)}
                            items={[
                              { label: 'Démarrer une session', icon: <Play size={10} />, onClick: () => handleStartForProject(row) },
                              { label: 'Entrée manuelle', icon: <PenLine size={10} />, onClick: () => setManualOpen(true) },
                            ]}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            }
          </>
        )}

        {/* Footer */}
        {groupedRows.length > 0 && (
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', ...DF, fontWeight: 600 }}>{groupedRows.length} groupe{groupedRows.length > 1 ? 's' : ''} · {fmtDur(totalSec)} total</span>
            <button onClick={() => exportCSV(filteredEntries, projects)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>
              Exporter <Download size={10} />
            </button>
          </div>
        )}
      </div>

      {/* ─── ROW 5 : Charts ───────────────────────────────────────────────── */}

      {/* Répartition du temps — donut */}
      <div className="col-span-2" style={{ ...card(), padding: 20, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--wheat)', textTransform: 'uppercase' }}>Répartition du temps</p>
          <Dropdown<Period>
            value={period}
            options={['this_week','last_7','this_month','last_month']}
            labels={PERIOD_LABELS}
            onChange={setPeriod}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, flex: 1, alignItems: 'center' }}>
          <DonutChart segments={donutSegs} label={fmtDur(totalSec)} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {donutSegs.length === 0
              ? <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucune donnée.</p>
              : donutSegs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                    <span style={{ ...DF, fontSize: 11, fontWeight: 700, color: 'var(--wheat)', flexShrink: 0 }}>{fmtDur(s.sec)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 34, textAlign: 'right', flexShrink: 0 }}>{Math.round(s.pct)}%</span>
                  </div>
                ))
            }
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', ...DF, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Voir le rapport détaillé</span>
          <ArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Évolution du temps — stacked bars */}
      <div className="col-span-2" style={{ background: '#11686A', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F0E4CC', textTransform: 'uppercase' }}>Évolution du temps</p>
          <Dropdown<Period>
            value={period}
            options={['this_week','last_7','this_month','last_month']}
            labels={PERIOD_LABELS}
            onChange={setPeriod}
            dark
          />
        </div>

        <StackedBar days={stackedDays} />

        {donutSegs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 10 }}>
            {donutSegs.slice(0, 6).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 9, color: 'rgba(240,228,204,0.65)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.55)', ...DF, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Voir plus d'analyses</span>
          <ArrowRight size={11} style={{ color: 'rgba(240,228,204,0.55)' }} />
        </div>
      </div>

      {/* ─── ROW 6 : Entrées récentes ──────────────────────────────────────── */}
      <div className="col-span-4" style={{ ...card(), overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--wheat)', textTransform: 'uppercase' }}>
            Entrées récentes
            {filteredEntries.length > 0 && <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>({filteredEntries.length})</span>}
          </p>
          <button onClick={() => setShowAllRecent(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#F2542D', background: 'none', border: 'none', cursor: 'pointer', ...DF, fontWeight: 700 }}>
            {showAllRecent ? 'Voir moins' : 'Voir toutes'} <ArrowRight size={10} style={{ transform: showAllRecent ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 130px 130px 80px 60px 60px 72px', padding: '8px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          {['Description','Projet','Catégorie','Durée','Début','Fin',''].map((h, i) => (
            <span key={i} style={tableLabelStyle}>{h}</span>
          ))}
        </div>

        {visibleEntries.length === 0 ? (
          <p style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>Aucune entrée sur cette période.</p>
        ) : visibleEntries.map(e => {
          const proj = projects.find(p => p.id === e.project_id)
          return (
            <div key={e.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 130px 130px 80px 60px 60px 72px', padding: '11px 20px', borderBottom: '1px solid var(--border)', gap: 12, alignItems: 'center' }}
              onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
              <p style={{ fontSize: 12, color: 'var(--wheat)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description || 'Sans description'}</p>
              {proj
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: proj.color, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</p>
                  </div>
                : <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>—</span>}
              {e.category
                ? <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 6, background: catColor(e.category) + '20', color: catColor(e.category), ...DF, fontWeight: 700, border: `1px solid ${catColor(e.category)}40`, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{e.category}</span>
                : <span style={{ fontSize: 9, color: 'var(--text-subtle)' }}>—</span>}
              <span style={{ ...DF, fontSize: 12, fontWeight: 700, color: 'var(--wheat)' }}>{e.duration_seconds ? fmtDur(e.duration_seconds) : '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(e.started_at)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.ended_at ? fmtTime(e.ended_at) : '—'}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => setEditingEntry(e as TimeEntry)}
                  title="Modifier"
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                  onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.borderColor = '#F2542D'; (ev.currentTarget as HTMLElement).style.color = '#F2542D' }}
                  onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (ev.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>
                  <Pencil size={9} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenMenu(openMenu === `entry-${e.id}` ? null : `entry-${e.id}`)}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <MoreVertical size={9} />
                  </button>
                  {openMenu === `entry-${e.id}` && (
                    <ContextMenu
                      onClose={() => setOpenMenu(null)}
                      items={[
                        { label: 'Modifier', icon: <Pencil size={10} />, onClick: () => setEditingEntry(e as TimeEntry) },
                        { label: 'Dupliquer', icon: <Plus size={10} />, onClick: () => {
                            createManual({ description: e.description ?? undefined, project_id: e.project_id ?? undefined, category: e.category ?? undefined, is_billable: e.is_billable, started_at: new Date().toISOString() })
                          }},
                        { label: 'Supprimer', icon: <Trash2 size={10} />, danger: true, onClick: () => remove(e.id) },
                      ]}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Footer avec compteur */}
        {filteredEntries.length > 6 && (
          <div onClick={() => setShowAllRecent(v => !v)}
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', ...DF, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {showAllRecent ? 'Voir moins' : `Voir ${filteredEntries.length - 6} entrée${filteredEntries.length - 6 > 1 ? 's' : ''} de plus`}
            </span>
            <ArrowRight size={12} style={{ color: 'var(--text-muted)', transform: showAllRecent ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        )}
      </div>

    </div>

    {/* ── Modals ─────────────────────────────────────────────────────────── */}
    {editingEntry && (
      <EditEntryModal entry={editingEntry} projects={projects} onSave={update}
        onDelete={async (id) => { await remove(id) }} onClose={() => setEditingEntry(null)} />
    )}
    {manualOpen && (
      <ManualEntryModal projects={projects} onCreate={createManual} onClose={() => setManualOpen(false)} />
    )}
    </>
  )
}
