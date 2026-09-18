'use client'

import { useState, type FormEvent } from 'react'
import { Sparkles, Send, Loader2, RotateCcw } from '@/components/ui/icons'
import { useAgentRequests, type AgentRequest } from '@/hooks/useAgentRequests'
import { DF, WHEAT, panneau, titrePanneau, bouton, depuis } from './ui'

/** Le strict nécessaire pour lire une réponse : gras, listes, paragraphes. */
function Markdown({ texte }: { texte: string }) {
  const lignes = texte.split('\n')
  const gras = (l: string) => l.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lignes.map((l, i) => {
        const puce = l.match(/^\s*[-*•]\s+(.*)/)
        if (puce) return <div key={i} style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--azul)' }}>•</span><span>{gras(puce[1]!)}</span></div>
        const titre = l.match(/^#+\s+(.*)/)
        if (titre) return <div key={i} style={{ ...DF, fontWeight: 800, marginTop: 4 }}>{titre[1]}</div>
        if (!l.trim()) return <div key={i} style={{ height: 2 }} />
        return <div key={i}>{gras(l)}</div>
      })}
    </div>
  )
}

function Echange({ r }: { r: AgentRequest }) {
  const enCours = r.status === 'pending' || r.status === 'running'
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ ...DF, fontSize: 12.5, fontWeight: 800, color: WHEAT, flex: 1, lineHeight: 1.3 }}>{r.question}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{depuis(r.created_at)}</span>
      </div>
      {enCours ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--azul)', fontWeight: 700 }}>
          <Loader2 size={12} className="animate-spin" /> {r.status === 'running' ? 'Claude travaille…' : 'En attente du Pi…'}
        </div>
      ) : r.status === 'error' ? (
        <p style={{ fontSize: 12, color: 'var(--accent-brand)', lineHeight: 1.45 }}>{r.error}</p>
      ) : (
        <div style={{ fontSize: 12.5, color: WHEAT, lineHeight: 1.5, opacity: 0.92 }}><Markdown texte={r.reply ?? ''} /></div>
      )}
    </div>
  )
}

/**
 * Parler à Claude depuis le poste : la question part dans work.agent_requests,
 * l'agent du Pi la prend à la seconde, la réponse revient en Realtime. Le
 * bouton « Claude » d'un mail passe par ici avec le mail en contexte.
 */
export function Claude({ demandes }: { demandes: ReturnType<typeof useAgentRequests> }) {
  const { requests, ask, enCours, error } = demandes
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    const q = texte.trim()
    if (!q || envoi) return
    setEnvoi(true)
    try { await ask(q); setTexte('') } finally { setEnvoi(false) }
  }

  return (
    <section style={panneau()}>
      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>Claude</span>
        <span style={{ flex: 1 }} />
        {enCours && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--azul)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Loader2 size={11} className="animate-spin" /> en cours</span>}
      </div>

      <form onSubmit={envoyer} style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
        <input value={texte} onChange={e => setTexte(e.target.value)} placeholder="Une question rapide (sinon, Discord)…" aria-label="Question à Claude"
          style={{ flex: 1, minWidth: 0, background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', minHeight: 40, color: WHEAT, fontSize: 13 }} />
        <button type="submit" className="nb-press" disabled={envoi || !texte.trim()} style={bouton('var(--azul)', 'var(--ink-light)', { padding: '10px 12px' })} aria-label="Envoyer">
          {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </form>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, borderTop: '2px solid var(--ink)' }}>
        {error && <p style={{ padding: 14, fontSize: 12, color: 'var(--accent-brand)' }}>{error}</p>}
        {requests.length === 0
          ? <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Pose une question, ou envoie un mail avec « Claude ».</p>
          : requests.map(r => <Echange key={r.id} r={r} />)}
      </div>
      <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <RotateCcw size={10} /> « → #salon » : la réponse est dans Discord, la suite se dit là-bas.
      </div>
    </section>
  )
}
