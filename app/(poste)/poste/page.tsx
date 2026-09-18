'use client'

import { useCallback, useEffect, useState } from 'react'
import { NysaLogo } from '@/components/ui/NysaLogo'
import { Activite } from '@/components/poste/Activite'
import { Courrier } from '@/components/poste/Courrier'
import { Journee } from '@/components/poste/Journee'
import { Claude } from '@/components/poste/Claude'
import { Raccourcis } from '@/components/poste/Raccourcis'
import { BoutonPush } from '@/components/poste/BoutonPush'
import { useAgentRequests } from '@/hooks/useAgentRequests'
import { useTasks } from '@/hooks/useTasks'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useInbox, type InboxItem } from '@/hooks/useInbox'
import { DF, WHEAT, BRAND_LABEL } from '@/components/poste/ui'

/**
 * Le poste : l'iPad Pro 11" en paysage sur le bras du bureau, allumé toute
 * la journée. Quatre zones qui bougent toutes seules — activité, courrier,
 * journée, Claude — et rien qui demande de recharger.
 *
 * Dessiné pour 1194 × 834 ; tient aussi sur un écran d'ordinateur.
 */
export default function PostePage() {
  useWakeLock()
  const demandes = useAgentRequests('poste')
  const { create } = useTasks()
  const inbox = useInbox()
  const { marquerTraite } = inbox
  const [heure, setHeure] = useState('')

  useEffect(() => {
    const maj = () => setHeure(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    maj()
    const t = setInterval(maj, 15_000)
    return () => clearInterval(t)
  }, [])

  // « → Tâche » : le sujet devient une tâche due aujourd'hui ; le mail sort de l'inbox.
  const versTache = useCallback(async (item: InboxItem) => {
    const aujourdhui = new Date(); aujourdhui.setMinutes(aujourdhui.getMinutes() - aujourdhui.getTimezoneOffset())
    const { error } = await create({
      title: item.title || `Répondre à ${item.expediteur ?? 'un mail'}`,
      description: [item.expediteur && `De : ${item.expediteur}`, item.extrait].filter(Boolean).join('\n'),
      priority: item.urgency === 1 ? 'high' : 'medium',
      due_date: aujourdhui.toISOString().slice(0, 10),
    })
    if (!error) await marquerTraite([item.id])
  }, [create, marquerTraite])

  // « → Claude » : le mail part avec son contexte ; Claude a les tools pour agir.
  const versClaude = useCallback(async (item: InboxItem) => {
    const marque = item.brand ? BRAND_LABEL[item.brand] : null
    const question = `Mail reçu${marque ? ` (${marque})` : ''} : « ${item.title || '(sans objet)'} » de ${item.expediteur ?? '?'}. ` +
      "Dis-moi en trois lignes ce que c'est, ce que ça implique, et ce que tu proposes de faire."
    await demandes.ask(question, {
      event_id: item.id,
      brand: item.brand ?? undefined,
      from: item.expediteur ?? undefined,
      subject: item.title ?? undefined,
      mailbox: item.boite ?? undefined,
      extrait: item.extrait ?? undefined,
      recu_le: item.occurred_at,
      ...(item.ai?.resume ? { triage: item.ai.resume, action_proposee: item.ai.action } : {}),
    })
  }, [demandes])

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 12, padding: '12px 16px 14px', boxSizing: 'border-box' }}>
      {/* En-tête : mince, il ne sert qu'à situer */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <NysaLogo size={26} />
        <span style={{ ...DF, fontSize: 15, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: WHEAT }}>Poste</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>Nysa · l’écran du bureau</span>
        <span style={{ flex: 1 }} />
        <BoutonPush />
        <span style={{ ...DF, fontSize: 22, fontWeight: 900, color: WHEAT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginLeft: 6 }}>{heure}</span>
      </header>

      <div className="poste-grille" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 300px) minmax(0, 1fr) minmax(300px, 340px)', gap: 12, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 12, minHeight: 0 }}>
          <Activite />
          <Raccourcis />
        </div>
        <Courrier inbox={inbox} onTache={versTache} onClaude={versClaude} />
        <div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, minHeight: 0 }}>
          <Journee />
          <Claude demandes={demandes} />
        </div>
      </div>
    </div>
  )
}
