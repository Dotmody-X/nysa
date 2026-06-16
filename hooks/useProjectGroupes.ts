'use client'

import { useState, useEffect, useCallback } from 'react'
import { userKey } from '@/lib/userStore'

export type Groupe = { value: string; color: string }

const KEY = 'nysa_projet_marques'
const PALETTE = ['#2d5bff', '#18b26b', '#ff5c35', '#8b5cf6', '#ffc23d', '#ff4d8d', '#12b5a5', '#6c5ce7', '#737a4e', '#111111']

/**
 * Marques / catégories de projets, propres à chaque compte (localStorage).
 * VIDE par défaut — aucune marque codée en dur : l'utilisateur crée les siennes.
 */
export function useProjectGroupes() {
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(userKey(KEY)); if (s) setGroupes(JSON.parse(s)) } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(userKey(KEY), JSON.stringify(groupes)) } catch { /* ignore */ }
  }, [groupes, hydrated])

  const add = useCallback((value: string, color?: string) => {
    const v = value.trim()
    if (!v) return
    setGroupes(prev => prev.some(g => g.value.toLowerCase() === v.toLowerCase())
      ? prev
      : [...prev, { value: v, color: color || PALETTE[prev.length % PALETTE.length] }])
  }, [])

  const update = useCallback((oldValue: string, patch: Partial<Groupe>) => {
    setGroupes(prev => prev.map(g => g.value === oldValue
      ? { ...g, ...patch, value: (patch.value ?? g.value).trim() || g.value }
      : g))
  }, [])

  const remove = useCallback((value: string) => {
    setGroupes(prev => prev.filter(g => g.value !== value))
  }, [])

  const colorOf = useCallback((v?: string) => groupes.find(g => g.value === v)?.color ?? '#6B7280', [groupes])

  return { groupes, hydrated, add, update, remove, colorOf, setGroupes }
}
