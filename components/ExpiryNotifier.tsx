'use client'

import { useEffect } from 'react'
import { loadNotifPrefs } from '@/lib/notifPrefs'
import { itemExpiry, type ExpBatch } from '@/lib/expiry'

type Inv = { name: string; expirations?: ExpBatch[] }

/**
 * Rappel de péremption : au chargement de l'app, si la préférence « Péremptions »
 * est active et que les notifications navigateur sont autorisées, envoie UNE
 * notification (max 1×/jour) pour les produits périmés ou périmant sous 2 jours.
 * Rend concrètes les préférences de notifications des réglages.
 */
export function ExpiryNotifier() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (!loadNotifPrefs().expiry) return

    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem('nysa_expiry_notified') === today) return

    let items: Inv[] = []
    try { items = JSON.parse(localStorage.getItem('nysa_inventaire') || '[]') } catch { return }

    const due: { name: string; days: number }[] = []
    for (const it of items) {
      const e = itemExpiry(it.expirations)
      if (e && e.days <= 2) due.push({ name: it.name, days: e.days }) // périmé / aujourd'hui / demain / J+2
    }
    if (due.length === 0) return

    due.sort((a, b) => a.days - b.days)
    const names = due.slice(0, 4).map(d => d.name).join(', ')
    const expired = due.filter(d => d.days < 0).length
    const body = expired > 0
      ? `${expired} périmé${expired > 1 ? 's' : ''} · à surveiller : ${names}`
      : `${due.length} produit${due.length > 1 ? 's' : ''} bientôt périmé${due.length > 1 ? 's' : ''} : ${names}`

    try {
      new Notification('NYSA · Péremptions', { body, icon: '/icon.svg', tag: 'nysa-expiry' })
      localStorage.setItem('nysa_expiry_notified', today)
    } catch { /* ignore */ }
  }, [])

  return null
}
