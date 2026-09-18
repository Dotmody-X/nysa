// Le radar mensuel tombe le premier lundi du mois. Ces deux fonctions servent
// la page Radar : dire quand arrive le prochain, et nommer le mois qu'un
// radar couvre (il paraît début septembre mais parle d'août).

/** Premier lundi du mois de `annee`/`mois` (mois 0-11), à minuit local. */
export function premierLundi(annee: number, mois: number): Date {
  const premier = new Date(annee, mois, 1)
  const decalage = (8 - premier.getDay()) % 7 // dimanche=0 … samedi=6
  return new Date(annee, mois, 1 + decalage)
}

/** Le prochain premier lundi strictement après le jour de `depuis`. */
export function prochainPremierLundi(depuis: Date = new Date()): Date {
  const jour = new Date(depuis.getFullYear(), depuis.getMonth(), depuis.getDate())
  const ceMois = premierLundi(jour.getFullYear(), jour.getMonth())
  if (ceMois > jour) return ceMois
  return premierLundi(jour.getFullYear(), jour.getMonth() + 1)
}

/** « lundi 5 octobre » */
export function fmtJour(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Le mois couvert par un radar généré à `iso` : le mois précédent. « août 2026 » */
export function moisCouvert(iso: string): string {
  const d = new Date(iso)
  const prec = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return prec.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

/** Le prochain lundi strictement après le jour de `depuis` — la veille tombe le lundi. */
export function prochainLundi(depuis: Date = new Date()): Date {
  const jour = new Date(depuis.getFullYear(), depuis.getMonth(), depuis.getDate())
  const decalage = ((8 - jour.getDay()) % 7) || 7
  return new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() + decalage)
}

/** Lundi de la semaine d'une date ISO, à minuit local — pour grouper la veille par semaine. */
export function lundiDe(iso: string): Date {
  const d = new Date(iso)
  const recul = (d.getDay() + 6) % 7 // lundi=0 … dimanche=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - recul)
}
