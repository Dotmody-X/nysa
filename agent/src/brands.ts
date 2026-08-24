/**
 * Le salon Discord porte le contexte : un message dans #mixologue n'a pas
 * besoin de préciser la marque, l'agent la déduit du nom du canal.
 *
 * `groupe` correspond à `public.projects.groupe`, `brand` à l'enum
 * `work.brand_t`. Les deux nomenclatures coexistent dans la base.
 */
export type Brand = {
  /** Valeur exacte de public.projects.groupe */
  groupe: string
  /** Valeur exacte de l'enum work.brand_t, si elle existe */
  brand: 'mixologue' | 'esmoker' | 'aeterna' | 'transverse' | null
  label: string
}

export const BRANDS: Record<string, Brand> = {
  mixologue: { groupe: 'Le Mixologue', brand: 'mixologue', label: 'Le Mixologue (e-liquides)' },
  esmoker: { groupe: 'E-Smoker', brand: 'esmoker', label: 'The e-Smoker (boutique vape)' },
  aeterna: { groupe: 'Aeterna', brand: 'aeterna', label: 'Aeterna (bijoux permanents)' },
  interne: { groupe: 'Interne', brand: null, label: 'Interne' },
  transverse: { groupe: 'Transverse', brand: 'transverse', label: 'Transverse' },
}

/**
 * Déduit la marque à partir du nom du salon. Les noms Discord sont libres :
 * on cherche une sous-chaîne, donc #mixologue-contenu fonctionne aussi.
 * Retourne null pour les salons transverses (#brief, #taches…), où l'agent
 * doit rester sur l'ensemble des marques.
 */
export function brandFromChannel(channelName: string | null | undefined): Brand | null {
  if (!channelName) return null
  const n = channelName.toLowerCase()

  if (n.includes('mixologue')) return BRANDS.mixologue!
  if (n.includes('esmoker') || n.includes('e-smoker') || n.includes('smoker')) return BRANDS.esmoker!
  if (n.includes('aeterna')) return BRANDS.aeterna!
  if (n.includes('interne')) return BRANDS.interne!

  return null
}

export const BRAND_LIST = Object.values(BRANDS)
  .map(b => `${b.groupe}${b.brand ? ` (work.brand_t = ${b.brand})` : ''}`)
  .join(', ')
