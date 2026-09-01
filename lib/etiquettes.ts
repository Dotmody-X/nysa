/**
 * Comparaison entre le devis et la facture d'une commande d'étiquettes.
 *
 * Le devis engage l'imprimeur ; la facture est ce qu'il réclame vraiment. Une
 * facture supérieure au devis est le seul cas qui demande une réaction — les
 * deux autres n'appellent qu'un coup d'œil.
 */
export type EcartDevis = 'sans_devis' | 'sans_facture' | 'conforme' | 'economie' | 'depassement'

export function ecartDevis(totalDevis: number, totalFacture: number): EcartDevis {
  if (!totalDevis && !totalFacture) return 'sans_devis'
  if (!totalDevis) return 'sans_devis'
  if (!totalFacture) return 'sans_facture'
  // Un centime d'écart vient de l'arrondi, pas d'un désaccord.
  const delta = totalFacture - totalDevis
  if (Math.abs(delta) < 0.01) return 'conforme'
  return delta < 0 ? 'economie' : 'depassement'
}

/** L'année civile d'une date ISO, ou de l'année en cours si absente. */
export function anneeDe(date?: string | null): number {
  return date ? Number(date.slice(0, 4)) : new Date().getFullYear()
}
