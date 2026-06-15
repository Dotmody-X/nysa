'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker (hors-ligne) en production.
 * Inactif en développement pour éviter les soucis de cache pendant le dev.
 */
export function PWA() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    const onLoad = () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* noop */ }) }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}
