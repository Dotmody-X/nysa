'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NysaLogo } from '@/components/ui/NysaLogo'
import { Activite } from '@/components/poste/Activite'
import { Courrier } from '@/components/poste/Courrier'
import { Journee } from '@/components/poste/Journee'
import { Claude } from '@/components/poste/Claude'
import { Actions } from '@/components/poste/Actions'
import { BoutonPush } from '@/components/poste/BoutonPush'
import { Toasts, type Toast } from '@/components/poste/Toast'
import { useAgentRequests } from '@/hooks/useAgentRequests'
import { useTasks } from '@/hooks/useTasks'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useInbox, type InboxItem } from '@/hooks/useInbox'
import { brandColor } from '@/lib/digestStyle'
import { salonDe, carteMail, contexteMail, QUESTION_MAIL_DISCORD, QUESTION_BROUILLON } from '@/lib/poste/actions'
import { armerSon, jouerSon } from '@/lib/poste/son'
import { DF, WHEAT, BRAND_LABEL, BRAND_NAME } from '@/components/poste/ui'

/**
 * Le poste : l'iPad Pro 11" en paysage sur le bras du bureau, allumé toute
 * la journée. Un visuel et des boutons — rien à taper : ce qui demande des
 * mots part dans Discord, où Claude reprend le fil du salon.
 *
 * Dessiné pour 1194 × 834 ; tient aussi sur un écran d'ordinateur.
 */
export default function PostePage() {
  useWakeLock()
  const demandes = useAgentRequests('poste')
  const { create } = useTasks()
  const [avecTraites, setAvecTraites] = useState(false)
  const inbox = useInbox(avecTraites)
  const { marquerTraite } = inbox
  const [heure, setHeure] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const vus = useRef<Set<number> | null>(null)

  useEffect(() => {
    const maj = () => setHeure(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    maj()
    const t = setInterval(maj, 15_000)
    armerSon()
    return () => clearInterval(t)
  }, [])

  // Un mail qui n'était pas là au dernier passage : bannière et petit son.
  useEffect(() => {
    if (inbox.loading) return
    const ids = new Set(inbox.items.map(i => i.id))
    if (vus.current === null) { vus.current = ids; return }
    // Basculer « voir traités » change la liste sans qu'un mail soit arrivé.
    const nouveaux = inbox.items.filter(i => !vus.current!.has(i.id) && !i.processed && Date.now() - new Date(i.occurred_at).getTime() < 10 * 60_000)
    vus.current = ids
    if (nouveaux.length === 0) return
    jouerSon()
    const ajout: Toast[] = nouveaux.slice(0, 3).map(i => ({
      id: i.id,
      titre: `${i.brand ? BRAND_LABEL[i.brand] : 'Courrier'} · ${i.type === 'order' ? 'commande' : i.type === 'appointment' ? 'rendez-vous' : 'nouveau mail'}`,
      texte: `${(i.expediteur ?? '').replace(/\s*<[^>]*>\s*$/, '') || '?'} — ${i.title || '(sans objet)'}`,
      couleur: i.brand ? brandColor(BRAND_NAME[i.brand]) : 'var(--azul)',
    }))
    setToasts(cur => [...ajout, ...cur].slice(0, 4))
    for (const t of ajout) setTimeout(() => setToasts(cur => cur.filter(x => x.id !== t.id)), 8_000)
  }, [inbox.items, inbox.loading])

  // « Tâche » : le sujet devient une tâche due aujourd'hui ; le mail sort de l'inbox.
  const versTache = useCallback(async (item: InboxItem) => {
    const aujourdhui = new Date(); aujourdhui.setMinutes(aujourdhui.getMinutes() - aujourdhui.getTimezoneOffset())
    const { error } = await create({
      title: item.title || `Répondre à ${item.expediteur ?? 'un mail'}`,
      description: [item.expediteur && `De : ${item.expediteur}`, item.ai?.resume ?? item.extrait].filter(Boolean).join('\n'),
      priority: item.urgency === 1 ? 'high' : 'medium',
      due_date: aujourdhui.toISOString().slice(0, 10),
    })
    if (!error) await marquerTraite([item.id])
  }, [create, marquerTraite])

  // « Discord » : la carte du mail part dans le salon de la marque, Claude y répond, la suite se dit là-bas.
  const versDiscord = useCallback(async (item: InboxItem) => {
    await demandes.ask(QUESTION_MAIL_DISCORD, { ...contexteMail(item), deliver: 'discord', channel: salonDe(item), annonce: carteMail(item) })
  }, [demandes])

  // « Brouillon » : même chemin, Claude rédige la réponse dans le salon.
  const brouillon = useCallback(async (item: InboxItem) => {
    await demandes.ask(QUESTION_BROUILLON, { ...contexteMail(item), deliver: 'discord', channel: salonDe(item), annonce: carteMail(item) })
  }, [demandes])

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 12, padding: '12px 16px 14px', boxSizing: 'border-box' }}>
      <Toasts toasts={toasts} fermer={id => setToasts(cur => cur.filter(t => t.id !== id))} />

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
          <Claude demandes={demandes} />
        </div>
        <Courrier inbox={inbox} avecTraites={avecTraites} setAvecTraites={setAvecTraites} onTache={versTache} onDiscord={versDiscord} onBrouillon={brouillon} />
        <div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', gap: 12, minHeight: 0 }}>
          <Journee demandes={demandes} />
          <Actions demandes={demandes} />
        </div>
      </div>
    </div>
  )
}
