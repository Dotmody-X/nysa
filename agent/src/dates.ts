/**
 * « Aujourd'hui » dépend du fuseau de l'utilisateur, pas de celui du serveur.
 * Le Pi5 peut très bien tourner en UTC — sans ça, les échéances basculent
 * d'un jour entre 00h et 02h.
 */
export function todayISO(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Formate une date/heure pour l'affichage dans Discord. */
export function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
