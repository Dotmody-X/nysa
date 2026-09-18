'use client'
import { useEffect } from 'react'

/**
 * Garde l'écran allumé tant que la page est visible — le poste iPad reste
 * ouvert toute la journée. Safari (16.4+) libère le verrou quand l'app passe
 * en arrière-plan : on le redemande au retour. Sans support, rien ne casse ;
 * le réglage « Verrouillage auto : Jamais » prend le relais.
 */
export function useWakeLock() {
  useEffect(() => {
    type Verrou = { release(): Promise<void> }
    type Nav = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Verrou> } }
    const nav = navigator as Nav
    if (!nav.wakeLock) return
    let verrou: Verrou | null = null
    const demander = async () => {
      try { verrou = await nav.wakeLock!.request('screen') } catch { /* refusé : pas grave */ }
    }
    const surVisibilite = () => { if (document.visibilityState === 'visible') void demander() }
    void demander()
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite)
      void verrou?.release()
    }
  }, [])
}
