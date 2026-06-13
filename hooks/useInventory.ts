'use client'

import { useState, useEffect, useCallback } from 'react'

export type InventStatus = 'ok' | 'low' | 'buy'

export interface InventItem {
  id: string
  name: string
  qty: string
  category: string
  status: InventStatus
  minQty?: string
  notes?: string
}

const KEY = 'nysa_inventaire'

/**
 * Source de vérité partagée de l'inventaire maison (localStorage).
 * Consommée par /courses/inventaire (CRUD) ET /courses (résumé + "à racheter").
 * Démarre VIDE — aucune donnée de démonstration.
 */
export function useInventory() {
  const [items, setItems] = useState<InventItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items, hydrated])

  const upsert = useCallback((item: InventItem) => {
    setItems(prev => {
      const i = prev.findIndex(x => x.id === item.id)
      if (i === -1) return [...prev, item]
      const copy = [...prev]; copy[i] = item; return copy
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(x => x.id !== id))
  }, [])

  const setStatus = useCallback((id: string, status: InventStatus) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, status } : x))
  }, [])

  const toBuy = items.filter(i => i.status === 'buy')

  return { items, hydrated, setItems, upsert, remove, setStatus, toBuy }
}
