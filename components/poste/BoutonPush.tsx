'use client'

import { Bell, Loader2 } from '@/components/ui/icons'
import { usePush } from '@/hooks/usePush'
import { boutonDiscret } from './ui'

const LIBELLE: Record<string, string> = {
  indisponible: 'Push indisponible ici',
  installer: 'Ajoute Nysa à l’écran d’accueil pour les notifications',
  refuse: 'Notifications refusées — à rouvrir dans Réglages',
  inactif: 'Activer les notifications',
  actif: 'Notifications actives',
}

/**
 * Le bouton qui active les notifications push sur cet appareil. Il faut un
 * geste de l'utilisateur pour demander la permission : c'est lui.
 */
export function BoutonPush() {
  const { etat, occupe, erreur, activer, desactiver } = usePush()
  if (!etat) return null
  const actif = etat === 'actif'
  const possible = etat === 'inactif' || actif

  return (
    <button className="nb-press" disabled={!possible || occupe}
      onClick={() => (actif ? desactiver() : activer())}
      title={erreur ?? LIBELLE[etat]}
      style={boutonDiscret({
        color: actif ? 'var(--ink-light)' : possible ? 'var(--text)' : 'var(--text-muted)',
        background: actif ? 'var(--azul)' : 'var(--bg-input)',
        boxShadow: actif ? '2px 2px 0 var(--ink)' : 'none',
        opacity: possible ? 1 : 0.7, cursor: possible ? 'pointer' : 'default',
      })}>
      {occupe ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
      {erreur ? 'Erreur push' : actif ? 'Notifs actives' : etat === 'inactif' ? 'Activer les notifs' : etat === 'installer' ? 'Écran d’accueil d’abord' : etat === 'refuse' ? 'Notifs refusées' : 'Pas de push'}
    </button>
  )
}
