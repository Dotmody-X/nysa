'use client'

import { useState, useEffect, useCallback } from 'react'
import { norm, mergeQty, subtractQty, parseInvQty, formatQty } from '@/lib/stock'
import { userKey } from '@/lib/userStore'
import type { ExpBatch } from '@/lib/expiry'

export type InventStatus = 'ok' | 'low' | 'buy'

export interface InventItem {
  id: string
  name: string
  qty: string
  category: string
  status: InventStatus
  minQty?: string
  notes?: string
  /** Lots avec date de péremption (DLC) — achats à des dates différentes. */
  expirations?: ExpBatch[]
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
      const saved = localStorage.getItem(userKey(KEY))
      if (saved) setItems(JSON.parse(saved))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(userKey(KEY), JSON.stringify(items)) } catch { /* ignore */ }
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

  // Réapprovisionne le stock : ajoute l'article ou augmente sa quantité,
  // et repasse son statut à "ok". Utilisé quand une liste de courses est validée.
  const restock = useCallback((name: string, qty: string, category = 'Autre') => {
    setItems(prev => {
      const i = prev.findIndex(x => norm(x.name) === norm(name))
      if (i === -1) {
        return [...prev, { id: Math.random().toString(36).slice(2), name, qty: qty || '1', category, status: 'ok' as InventStatus }]
      }
      const copy = [...prev]
      copy[i] = { ...copy[i], qty: mergeQty(copy[i].qty, qty), status: 'ok' }
      return copy
    })
  }, [])

  // Consomme une quantité depuis les lots les plus proches de péremption (FEFO).
  function consumeFromBatches(batches: ExpBatch[], amount: string): ExpBatch[] {
    const amt = parseInvQty(amount)
    let remaining = amt.value
    const sorted = [...batches].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const out: ExpBatch[] = []
    for (const b of sorted) {
      if (remaining <= 0 || !b.qty) { out.push(b); continue }
      const bq = parseInvQty(b.qty)
      if (bq.base !== amt.base) { out.push(b); continue }
      if (bq.value <= remaining + 1e-9) { remaining -= bq.value } // lot épuisé → retiré
      else { out.push({ ...b, qty: formatQty(bq.value - remaining, bq.base) }); remaining = 0 }
    }
    return out
  }

  // Marque une quantité comme utilisée : diminue le stock, met à jour le statut
  // (faible/à racheter) et réduit les lots datés en priorité (FEFO).
  const consume = useCallback((id: string, amount: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it
      const newQty = subtractQty(it.qty, amount)
      const left = parseInvQty(newQty)
      const depleted = left.value <= 0
      let status = it.status
      if (depleted) status = 'buy'
      else if (it.minQty) {
        const min = parseInvQty(it.minQty)
        if (min.base === left.base && left.value <= min.value) status = 'low'
      }
      const expirations = it.expirations?.length
        ? (depleted ? [] : consumeFromBatches(it.expirations, amount))
        : it.expirations
      return { ...it, qty: depleted ? '0' : newQty, status, expirations }
    }))
  }, [])

  const toBuy = items.filter(i => i.status === 'buy')

  return { items, hydrated, setItems, upsert, remove, setStatus, restock, consume, toBuy }
}
