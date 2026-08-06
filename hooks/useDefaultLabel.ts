'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Label par défaut des activités — préférence PAR UTILISATEUR (localStorage,
// cloisonné par compte via userKey, comme les catégories de Time Tracker).
// Appliqué automatiquement à la création d'un événement (Calendrier) et à
// l'ajout d'une activité à l'agenda (Time Tracker).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { userKey } from '@/lib/userStore'

export const DEFAULT_LABEL_KEY = 'nysa_default_label'

/** Lecture synchrone (pour initialiser un formulaire). '' si non défini. */
export function readDefaultLabel(): string {
  try { return localStorage.getItem(userKey(DEFAULT_LABEL_KEY)) ?? '' } catch { return '' }
}

/** Hook pour l'écran Réglages : lit et écrit la préférence. */
export function useDefaultLabel() {
  const [label, setLabelState] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLabelState(readDefaultLabel())
    setHydrated(true)
  }, [])

  const setLabel = useCallback((value: string) => {
    const v = value.trim()
    setLabelState(v)
    try {
      if (v) localStorage.setItem(userKey(DEFAULT_LABEL_KEY), v)
      else   localStorage.removeItem(userKey(DEFAULT_LABEL_KEY))
    } catch { /* ignore */ }
  }, [])

  return { label, setLabel, hydrated }
}
