'use client'

import { useState, useMemo } from 'react'
import { RefreshCw, Loader2, Sun, Moon } from '@/components/ui/icons'
import { PageTitle } from '@/components/ui/PageTitle'
import { useDigests, type Digest } from '@/hooks/useDigests'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const BRIEF_COLOR = 'var(--azul)'          // cobalt
const DEBRIEF_COLOR = 'var(--accent-budget)' // tangerine

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

const kindMeta = (kind: string) => kind === 'debrief'
  ? { label: 'Débrief', color: DEBRIEF_COLOR, Icon: Moon }
  : { label: 'Brief',   color: BRIEF_COLOR,   Icon: Sun }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}
const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── Carte « en tête » (dernier brief / débrief) ── */
function HeadlineCard({ digest, fallback }: { digest: Digest | null; fallback: string }) {
  if (!digest) {
    return (
      <div style={{ ...card(), padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fallback}</p>
      </div>
    )
  }
  const m = kindMeta(digest.kind)
  return (
    <div style={{ ...card(), padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: m.color, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <m.Icon size={16} style={{ color: 'var(--creamy-ivory)' }} />
        <span style={{ ...DF, fontSize: 12, fontWeight: 900, color: 'var(--creamy-ivory)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dernier {m.label.toLowerCase()}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(245,241,237,0.85)' }}>{fmtDate(digest.generated_at)}</span>
      </div>
      <div style={{ padding: 18, maxHeight: 260, overflowY: 'auto' }}>
        <p style={{ fontSize: 13, color: WHEAT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{digest.content}</p>
      </div>
    </div>
  )
}

/* ── Élément d'historique ── */
function HistoryItem({ digest }: { digest: Digest }) {
  const m = kindMeta(digest.kind)
  return (
    <div style={{ ...card(), padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, color: 'var(--creamy-ivory)', background: m.color, ...DF }}>
          <m.Icon size={11} /> {m.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{fmtDate(digest.generated_at)}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 12.5, color: WHEAT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{digest.content}</p>
      </div>
    </div>
  )
}

export default function BriefPage() {
  const { digests, loading, error, refetch, latestBrief, latestDebrief } = useDigests()
  const [typeFilter, setTypeFilter] = useState<'tous' | 'brief' | 'debrief'>('tous')
  const [dateFilter, setDateFilter] = useState('') // '' = toutes les dates

  const filtered = useMemo(() => digests.filter(d => {
    if (typeFilter !== 'tous' && d.kind !== typeFilter) return false
    if (dateFilter && dayKey(d.generated_at) !== dateFilter) return false
    return true
  }), [digests, typeFilter, dateFilter])

  const chip = (active: boolean, color: string): React.CSSProperties => ({
    ...DF, fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
    border: `2px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--bg-card)',
    color: active ? 'var(--creamy-ivory)' : 'var(--text-muted)',
  })

  return (
    <div style={{ padding: 30, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageTitle title="Brief" sub="Briefs & débriefs quotidiens"
        right={
          <button onClick={refetch} className="nb-press"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: WHEAT, ...DF, fontWeight: 700, fontSize: 12 }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualiser
          </button>
        } />

      {error && (
        <div style={{ ...card(), padding: '12px 16px', color: 'var(--accent-budget)', fontSize: 12 }}>
          Impossible de charger les briefs : {error}
        </div>
      )}

      {/* En tête : dernier brief + dernier débrief */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <HeadlineCard digest={latestBrief} fallback={loading ? 'Chargement…' : 'Aucun brief pour le moment'} />
        <HeadlineCard digest={latestDebrief} fallback={loading ? 'Chargement…' : 'Aucun débrief pour le moment'} />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button style={chip(typeFilter === 'tous', 'var(--text-muted)')} onClick={() => setTypeFilter('tous')}>Tous</button>
        <button style={chip(typeFilter === 'brief', BRIEF_COLOR)} onClick={() => setTypeFilter('brief')}>Briefs</button>
        <button style={chip(typeFilter === 'debrief', DEBRIEF_COLOR)} onClick={() => setTypeFilter('debrief')}>Débriefs</button>
        <div style={{ flex: 1 }} />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12 }} />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} style={{ ...DF, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Toutes les dates</button>
        )}
      </div>

      {/* Historique antichronologique */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            {digests.length === 0 ? 'Aucun brief ni débrief.' : 'Aucun résultat pour ces filtres.'}
          </div>
        ) : (
          filtered.map(d => <HistoryItem key={d.id} digest={d} />)
        )}
      </div>
    </div>
  )
}
