'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { userKey } from '@/lib/userStore'

const KEY = 'nysa_time_categories'

/**
 * Catégories de Time tracker, propres au compte (localStorage). La liste
 * affichée = catégories enregistrées ∪ catégories déjà utilisées sur les
 * entrées (dédupliquées sans tenir compte de la casse) → choix dans un menu
 * déroulant plutôt qu'à la main, tout en pouvant en ajouter.
 */
export function useTimeCategories(used: (string | null | undefined)[]) {
  const [saved, setSaved] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(userKey(KEY)); if (s) setSaved(JSON.parse(s)) } catch { /* ignore */ }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(userKey(KEY), JSON.stringify(saved)) } catch { /* ignore */ }
  }, [saved, hydrated])

  const add = useCallback((name: string) => {
    const v = name.trim()
    if (!v) return
    setSaved(prev => prev.some(s => s.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v])
  }, [])
  const remove = useCallback((name: string) => setSaved(prev => prev.filter(s => s !== name)), [])

  const usedKey = (used.filter(Boolean) as string[]).join('|')
  const categories = useMemo(() => {
    const map = new Map<string, string>() // clé minuscule → libellé affiché
    for (const c of [...saved, ...(used.filter(Boolean) as string[])]) {
      const k = c.toLowerCase()
      if (!map.has(k)) map.set(k, c)
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'fr'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, usedKey])

  return { categories, add, remove }
}
