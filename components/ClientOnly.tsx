'use client'

import { useMounted } from '@/hooks/useMounted'

/**
 * Ne rend ses enfants qu'APRÈS le montage client. Le rendu serveur et le
 * premier rendu client sont donc identiques (rien), ce qui élimine toutes
 * les erreurs d'hydratation des pages — qui dépendent du localStorage
 * (mode démo) et du formatage local des nombres/dates (ex. "10 000" vs
 * "10,000"). C'était la cause des pages bloquées sans contenu.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useMounted()
  return mounted ? <>{children}</> : null
}
