'use client'

// ─────────────────────────────────────────────────────────────────────────────
// DailyNotes — carte « Notes du jour » (onglet Brief).
// Textarea multi-ligne, sauvegarde auto (debounce), indicateur d'enregistrement,
// et historique repliable des jours précédents. Design system Nysa, aucune lib.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { PenLine, ChevronRight, Loader2, CheckCircle2 } from '@/components/ui/icons'
import { useDailyNote } from '@/hooks/useDailyNote'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

function fmtDay(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function DailyNotes() {
  const { content, setContent, loading, saving, savedAt, error, history, historyLoading, loadHistory } = useDailyNote()
  const [showHistory, setShowHistory] = useState(false)

  function toggleHistory() {
    const next = !showHistory
    setShowHistory(next)
    if (next && history === null) loadHistory()
  }

  const status = saving
    ? { icon: <Loader2 size={12} className="animate-spin" />, text: 'Enregistrement…', color: 'var(--text-muted)' }
    : savedAt
    ? { icon: <CheckCircle2 size={12} />, text: `Enregistré à ${savedAt.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`, color: 'var(--azul)' }
    : null

  return (
    <div style={{ ...card(), display: 'flex', flexDirection: 'column' }}>
      {/* En-tête éditorial : sticker + intitulé + filet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px 0' }}>
        <span className="sticker-l nb-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'var(--accent-brand)', boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 }}>
          <PenLine size={13} style={{ color: 'var(--ink-dark)' }} />
        </span>
        <span style={{ ...DF, fontSize: 11, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>Notes du jour</span>
        <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.85, borderRadius: 1, minWidth: 12 }} />
        {status && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: status.color, whiteSpace: 'nowrap' }}>
            {status.icon} {status.text}
          </span>
        )}
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', padding: '5px 18px 0' }}>Lues par le débrief du soir.</p>

      {/* Zone de saisie */}
      <div style={{ padding: '12px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={loading}
          rows={5}
          placeholder={loading ? 'Chargement…' : "Note ce que tu as fait aujourd'hui, au fil de la journée…"}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 110,
            background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        {error && (
          <p style={{ fontSize: 11, color: 'var(--accent-brand)' }}>Sauvegarde impossible : {error}</p>
        )}

        {/* Historique repliable */}
        <button onClick={toggleHistory}
          style={{ ...DF, alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
          Notes précédentes
          <ChevronRight size={12} style={{ transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            {historyLoading ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chargement…</p>
            ) : !history || history.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aucune note antérieure.</p>
            ) : history.map(h => (
              /* Pas de carte imbriquée : date en petites capitales + filet. */
              <div key={h.note_date} style={{ paddingLeft: 12, borderLeft: '3px solid var(--border)' }}>
                <span style={{ ...DF, fontSize: 9.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{fmtDay(h.note_date)}</span>
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{h.content || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
