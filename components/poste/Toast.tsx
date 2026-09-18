'use client'

import { Send } from '@/components/ui/icons'
import { DF, WHEAT } from './ui'

export type Toast = { id: number; titre: string; texte: string; couleur: string }

/** Les bannières « nouveau mail » en haut à droite : huit secondes, puis s'effacent. */
export function Toasts({ toasts, fermer }: { toasts: Toast[]; fermer: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
      {toasts.map(t => (
        <button key={t.id} onClick={() => fermer(t.id)}
          style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--bg-card)', border: '2px solid var(--ink)', borderLeft: `10px solid ${t.couleur}`, borderRadius: 'var(--radius-md)', boxShadow: '5px 5px 0 var(--ink)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Send size={14} style={{ color: t.couleur, flexShrink: 0, marginTop: 2 }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ ...DF, display: 'block', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.couleur }}>{t.titre}</span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: WHEAT, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.texte}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
