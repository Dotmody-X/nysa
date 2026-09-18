'use client'

import { useState } from 'react'
import { Zap, Loader2, Check, Send } from '@/components/ui/icons'
import type { useAgentRequests } from '@/hooks/useAgentRequests'
import { ACTIONS } from '@/lib/poste/actions'
import { DF, WHEAT, panneau, titrePanneau, boutonDiscret } from './ui'

/**
 * Les gestes qui déclenchent quelque chose dans Discord : un appui ici, la
 * réponse de Claude dans le salon qui va bien, et la suite se dit là-bas.
 * Rien à taper.
 */
export function Actions({ demandes }: { demandes: ReturnType<typeof useAgentRequests> }) {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [dernier, setDernier] = useState<Record<string, number>>({})

  async function lancer(id: string) {
    const action = ACTIONS.find(a => a.id === id)
    if (!action || enCours) return
    setEnCours(id)
    try {
      await demandes.ask(action.question, { deliver: 'discord', channel: action.channel, action: action.id })
      setDernier(d => ({ ...d, [id]: Date.now() }))
    } finally {
      setEnCours(null)
    }
  }

  // La dernière demande de chaque action, pour afficher où elle en est.
  const etatDe = (id: string) => {
    const r = demandes.requests.find(x => x.context?.action === id)
    if (!r) return null
    return r.status
  }

  return (
    <section style={panneau()}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>Actions</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>réponse dans Discord</span>
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ACTIONS.map(a => {
          const etat = etatDe(a.id)
          const actif = enCours === a.id || etat === 'pending' || etat === 'running'
          const fini = !actif && etat === 'done' && dernier[a.id] && Date.now() - dernier[a.id]! < 120_000
          return (
            <button key={a.id} className="nb-press" disabled={Boolean(enCours)} onClick={() => lancer(a.id)}
              style={{ ...boutonDiscret({ minHeight: 50, padding: '6px 14px', justifyContent: 'flex-start', textTransform: 'none', letterSpacing: 0, fontSize: 14, color: WHEAT, gap: 10, background: actif ? 'var(--bg)' : 'var(--bg-input)', boxShadow: '3px 3px 0 var(--ink)' }) }}>
              <span className="nb-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: fini ? 'var(--azul)' : 'var(--bg-card)', boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 }}>
                {actif ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--azul)' }} /> : fini ? <Check size={16} style={{ color: 'var(--ink-light)' }} /> : <Send size={16} style={{ color: 'var(--azul)' }} />}
              </span>
              <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ display: 'block', ...DF, fontWeight: 800 }}>{a.label}</span>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>{actif ? 'Claude travaille…' : fini ? 'Posté' : 'réponse dans'} #{a.channel}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
