/**
 * Contrôle d'un code-barres EAN-13.
 *
 * Le treizième chiffre est une clé : les douze premiers, pondérés
 * alternativement 1 et 3, doivent la retrouver. Un code dont la clé est fausse
 * ne passe pas en caisse — c'est le seul défaut qui bloque réellement la vente.
 */
export function cleEanValide(code?: string | null): boolean {
  if (!code || !/^\d{13}$/.test(code)) return false
  let somme = 0
  for (let i = 0; i < 12; i++) somme += Number(code[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (somme % 10)) % 10 === Number(code[12])
}

/** 370 et 376 sont les préfixes attribués à la marque. */
export function prefixeConnu(code?: string | null): boolean {
  return !!code && (code.startsWith('370') || code.startsWith('376'))
}

export type SanteCode = 'absent' | 'conforme' | 'cle_invalide' | 'prefixe' | 'partage'

/**
 * Le défaut le plus grave d'abord : une clé fausse rend le code inutilisable,
 * là où un partage n'est qu'une ambiguïté de caisse.
 */
export function santeCode(code: string | undefined | null, portee: number): SanteCode {
  if (!code) return 'absent'
  if (!cleEanValide(code)) return 'cle_invalide'
  if (!prefixeConnu(code)) return 'prefixe'
  if (portee > 1) return 'partage'
  return 'conforme'
}
