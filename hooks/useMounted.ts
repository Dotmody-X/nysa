'use client'

import { useEffect, useState } from 'react'

/**
 * Renvoie `false` au rendu serveur et au premier rendu client, puis `true`
 * après le montage. À utiliser pour différer toute logique dépendante du
 * navigateur (ex. localStorage / mode démo) afin que le HTML serveur et le
 * premier rendu client soient identiques → évite les erreurs d'hydratation
 * (pages qui restaient bloquées sans contenu).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}
