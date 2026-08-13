'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronRight, Award, Target } from '@/components/ui/icons'
import { PageTitle } from '@/components/ui/PageTitle'
import { useFormationMilestones, FormationMilestone } from '@/hooks/useFormationMilestones'
import { useMktPrinciples, MktPrinciple } from '@/hooks/useMktPrinciples'
import { brandColor } from '@/lib/digestStyle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
  boxShadow: 'var(--elev-1)', ...extra,
})

function fmtDate(d?: string | null): string {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Barre de progression ──────────────────────────────────────────────────────
function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 160, height: 12, borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ ...DF, fontSize: 13, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap' }}>{done} / {total}</span>
    </div>
  )
}

// ── Case à cocher ─────────────────────────────────────────────────────────────
function CheckBox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={checked ? 'Marquer à faire' : 'Marquer fait'}
      style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0, cursor: 'pointer',
        border: '1px solid var(--border)', background: checked ? '#16a34a' : 'var(--bg-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--elev-1)',
      }}>
      {checked && <Check size={15} style={{ color: '#fff' }} />}
    </button>
  )
}

// ── SECTION 1 : Parcours de formation ─────────────────────────────────────────
function MilestoneCard({ m, onToggle }: { m: FormationMilestone; onToggle: () => void }) {
  const done = m.status === 'done'
  return (
    <div style={{ ...card({ boxShadow: 'var(--elev-1)' }), padding: 16, display: 'flex', gap: 12, opacity: done ? 0.85 : 1 }}>
      <CheckBox checked={done} onToggle={onToggle} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...DF, fontSize: 15, fontWeight: 900, color: 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
            Phase {m.phase} — {m.title}
          </span>
          {m.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Échéance : {fmtDate(m.due_date)}</span>}
        </div>
        {m.competence && (
          <p style={{ fontSize: 12, color: 'var(--text)' }}>
            <span style={{ ...DF, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 6 }}>Compétence</span>
            {m.competence}
          </p>
        )}
        {m.study && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ ...DF, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 6 }}>À étudier</span>
            {m.study}
          </p>
        )}
        {m.deliverable && (
          <div style={{ marginTop: 2, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', borderLeft: '4px solid var(--accent-budget)' }}>
            <span style={{ ...DF, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-budget)', display: 'block', marginBottom: 3 }}>Livrable</span>
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4 }}>{m.deliverable}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SECTION 2 : Principe (lecture seule) ──────────────────────────────────────
function PrincipleRow({ p, isNext, expanded, onExpand }: { p: MktPrinciple; isNext: boolean; expanded: boolean; onExpand: () => void }) {
  const done = p.status === 'done'
  const apps = Array.isArray(p.applications) ? p.applications : []
  return (
    <div style={{
      ...card({ boxShadow: 'var(--elev-1)' }),
      borderColor: isNext ? 'var(--azul)' : 'var(--border)',
      opacity: done ? 1 : isNext ? 1 : 0.55,
    }}>
      <button onClick={done ? onExpand : undefined}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: done ? 'pointer' : 'default', textAlign: 'left' }}>
        <span style={{ ...DF, fontSize: 11, fontWeight: 900, color: done ? '#16a34a' : isNext ? 'var(--azul)' : 'var(--text-muted)', width: 24, flexShrink: 0 }}>{String(p.seq).padStart(2, '0')}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.principle}</span>
        {isNext && !done && (
          <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, color: 'var(--creamy-ivory)', background: 'var(--azul)', whiteSpace: 'nowrap' }}>À venir cette semaine</span>
        )}
        {done && <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />}
      </button>

      {done && expanded && (
        <div style={{ padding: '0 12px 12px 46px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.summary && <p style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>{p.summary}</p>}
          {apps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {apps.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: '#fff', background: brandColor(a.brand), whiteSpace: 'nowrap', flexShrink: 0 }}>{a.brand}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{a.action}</span>
                </div>
              ))}
            </div>
          )}
          {p.week_of && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Semaine du {fmtDate(p.week_of)}</span>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DirecteurMarketingPage() {
  const { milestones, loading: loadingM, error: errM, setStatus, doneCount: doneM } = useFormationMilestones()
  const { principles, loading: loadingP, error: errP, doneCount: doneP, nextPendingId } = useMktPrinciples()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpand(id: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Piliers dans l'ordre d'apparition (par seq), chacun avec ses principes triés par seq
  const pillars = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, MktPrinciple[]>()
    for (const p of principles) {
      if (!map.has(p.pillar)) { map.set(p.pillar, []); order.push(p.pillar) }
      map.get(p.pillar)!.push(p)
    }
    return order.map(name => ({ name, items: (map.get(name) ?? []).sort((a, b) => a.seq - b.seq) }))
  }, [principles])

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
      <PageTitle title="Marketing" sub="Formation & progression" />

      {/* ── SECTION 1 : Parcours de formation ── */}
      <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Award size={16} style={{ color: 'var(--accent-budget)' }} />
          <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parcours de formation</span>
          <div style={{ flex: 1, minWidth: 140 }}><ProgressBar done={doneM} total={6} color="var(--accent-budget)" /></div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errM && <p style={{ fontSize: 12, color: 'var(--accent-budget)' }}>Erreur : {errM}</p>}
          {loadingM ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>Chargement…</p>
          ) : milestones.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>Aucun jalon de formation.</p>
          ) : (
            milestones.map(m => (
              <MilestoneCard key={m.id} m={m}
                onToggle={() => setStatus(m.id, m.status === 'done' ? 'todo' : 'done')} />
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 2 : Programme des principes ── */}
      <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Target size={16} style={{ color: 'var(--azul)' }} />
          <span style={{ ...DF, fontSize: 14, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Programme des principes</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lecture seule · mis à jour chaque lundi</span>
          <div style={{ flex: 1, minWidth: 140 }}><ProgressBar done={doneP} total={24} color="var(--azul)" /></div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errP && <p style={{ fontSize: 12, color: 'var(--accent-budget)' }}>Erreur : {errP}</p>}
          {loadingP ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>Chargement…</p>
          ) : principles.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>Aucun principe.</p>
          ) : (
            pillars.map(group => (
              <div key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{group.name}</p>
                {group.items.map(p => (
                  <PrincipleRow key={p.id} p={p}
                    isNext={p.id === nextPendingId}
                    expanded={expanded.has(p.id)}
                    onExpand={() => toggleExpand(p.id)} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
