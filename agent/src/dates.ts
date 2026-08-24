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

/** Décalage du fuseau par rapport à UTC, à un instant donné (gère l'heure d'été). */
function decalageMs(instant: Date, timezone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map(p => [p.type, p.value]),
  ) as Record<string, string>

  const commeUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return commeUTC - instant.getTime()
}

/**
 * Convertit une heure locale (« 14:45 » le 2026-08-24, à Bruxelles) en instant
 * UTC. Indispensable pour la saisie rétroactive : l'utilisateur parle en heure
 * locale, la base stocke en UTC, et le Pi peut tourner dans un autre fuseau.
 */
export function localToISO(dateISO: string, hhmm: string, timezone: string): string {
  const [h = '0', m = '0'] = hhmm.split(':')
  const approx = new Date(
    `${dateISO}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`,
  )
  if (Number.isNaN(approx.getTime())) throw new Error(`Heure illisible : ${hhmm}`)
  return new Date(approx.getTime() - decalageMs(approx, timezone)).toISOString()
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
