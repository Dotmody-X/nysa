// Dates de péremption (DLC) des articles d'inventaire.
// Un article peut avoir PLUSIEURS lots (achats à des dates différentes),
// chacun avec sa propre date. Rappels : J-10, J-2, la veille, le jour même,
// puis « périmé » une fois la date dépassée.

export type ExpBatch = { id: string; date: string; qty?: string } // date = 'YYYY-MM-DD'

export type ExpLevel = 'expired' | 'today' | 'tomorrow' | 'soon2' | 'soon10' | 'ok'

/** Jours entre aujourd'hui (minuit local) et la date (négatif = passé). */
export function daysUntil(dateISO: string): number {
  if (!dateISO) return Infinity
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateISO + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return Infinity
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

export function levelFromDays(days: number): ExpLevel {
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 2) return 'soon2'
  if (days <= 10) return 'soon10'
  return 'ok'
}

/** Un rappel est actif dès J-10 (et tant que ce n'est pas consommé). */
export const isReminder = (level: ExpLevel) => level !== 'ok'

const RED = '#EF4444', ORANGE = '#F59E0B', AMBER = '#D9A300'

export function expiryColor(level: ExpLevel): string {
  switch (level) {
    case 'expired':
    case 'today':    return RED
    case 'tomorrow':
    case 'soon2':    return ORANGE
    case 'soon10':   return AMBER
    default:         return 'var(--text-muted)'
  }
}

export function expiryLabel(days: number): string {
  if (days < 0) return days === -1 ? 'Périmé depuis 1 j' : `Périmé depuis ${-days} j`
  if (days === 0) return 'Périme aujourd\'hui'
  if (days === 1) return 'Périme demain'
  return `Périme dans ${days} j`
}

export type ItemExpiry = { date: string; days: number; level: ExpLevel; batchCount: number }

/** Lot le plus urgent d'un article (le plus proche/dépassé). null si aucune date. */
export function itemExpiry(batches?: ExpBatch[]): ItemExpiry | null {
  if (!batches || batches.length === 0) return null
  let best: { date: string; days: number } | null = null
  for (const b of batches) {
    if (!b.date) continue
    const days = daysUntil(b.date)
    if (best === null || days < best.days) best = { date: b.date, days }
  }
  if (!best) return null
  return { date: best.date, days: best.days, level: levelFromDays(best.days), batchCount: batches.length }
}

export const newBatch = (date = '', qty?: string): ExpBatch => ({
  id: Math.random().toString(36).slice(2), date, qty,
})
