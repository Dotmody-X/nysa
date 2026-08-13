'use client'

import { useState, useMemo } from 'react'
import { RefreshCw, Loader2, ExternalLink } from '@/components/ui/icons'
import { PageTitle } from '@/components/ui/PageTitle'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'
import { DailyNotes } from '@/components/brief/DailyNotes'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const BRIEF_COLOR = 'var(--azul)'
const DEBRIEF_COLOR = 'var(--accent-budget)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  // Sans filtre : l'historique n'affiche pas les deux « derniers » déjà en tête.
  const filterActive = typeFilter !== 'tous' || !!dateFilter
  const topIds = new Set([latestBrief?.id, latestDebrief?.id].filter((x): x is number => x != null))
  const history = filterActive ? filtered : filtered.filter(d => !topIds.has(d.id))

  function toggleDock() {
    window.dispatchEvent(new Event('nysa:toggle-brief'))
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleDock} className="nb-press" title="Ouvrir/fermer la mini-fenêtre Brief (dispo sur toutes les pages)"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--azul)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: 'var(--creamy-ivory)', ...DF, fontWeight: 700, fontSize: 12 }}>
              <ExternalLink size={13} /> Mini-fenêtre
            </button>
            <button onClick={refetch} className="nb-press"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', color: WHEAT, ...DF, fontWeight: 700, fontSize: 12 }}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualiser
            </button>
          </div>
        } />

      {error && (
        <div style={{ ...card(), padding: '12px 16px', color: 'var(--accent-budget)', fontSize: 12 }}>
          Impossible de charger les briefs : {error}
        </div>
      )}

      {/* En tête : dernier brief + dernier débrief (rendu riche via payload) */}
      {!loading && (latestBrief || latestDebrief) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
          {latestBrief && <DigestCard digest={latestBrief} />}
          {latestDebrief && <DigestCard digest={latestDebrief} />}
        </div>
      )}

      {/* Notes du jour — saisies au fil de la journée, lues par le débrief du soir */}
      <DailyNotes />

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
        ) : history.length === 0 ? (
          <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            {digests.length === 0 ? 'Aucun brief ni débrief.' : filterActive ? 'Aucun résultat pour ces filtres.' : 'Rien de plus dans l’historique.'}
          </div>
        ) : (
          history.map(d => <DigestCard key={d.id} digest={d} />)
        )}
      </div>
    </div>
  )
}
