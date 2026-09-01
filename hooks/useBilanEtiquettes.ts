'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface BilanEtiquettes {
  annee: number
  commandes: number
  etiquettes: number
  depense: number
  /** Ce qui a été devisé mais pas encore facturé : la dépense à venir. */
  devise: number
}

/**
 * Bilan des commandes d'étiquettes sur une année civile.
 *
 * L'année civile et non les 365 derniers jours : c'est l'exercice comptable
 * qui fait sens, et une commande de janvier ne doit pas sortir du total parce
 * qu'on est arrivé en décembre.
 *
 * Les brouillons et les commandes annulées sont exclus — ils n'engagent rien.
 */
export function useBilanEtiquettes(annee: number) {
  const [bilan, setBilan] = useState<BilanEtiquettes | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let vivant = true

    ;(async () => {
      setLoading(true)
      const debut = `${annee}-01-01`
      const fin = `${annee}-12-31`

      const { data: commandes } = await supabase
        .from('etiquette_commandes')
        .select('id, statut')
        .gte('date_commande', debut).lte('date_commande', fin)
        .not('statut', 'in', '(brouillon,annulee)')

      const ids = (commandes ?? []).map(c => c.id as string)
      if (!vivant) return
      if (ids.length === 0) {
        setBilan({ annee, commandes: 0, etiquettes: 0, depense: 0, devise: 0 })
        setLoading(false)
        return
      }

      const [lignes, docs] = await Promise.all([
        supabase.from('etiquette_commande_lignes').select('quantite').in('commande_id', ids),
        supabase.from('etiquette_documents').select('categorie, montant').in('commande_id', ids),
      ])
      if (!vivant) return

      const somme = (cat: string) => (docs.data ?? [])
        .filter(d => d.categorie === cat)
        .reduce((s, d) => s + (Number(d.montant) || 0), 0)

      setBilan({
        annee,
        commandes: ids.length,
        etiquettes: (lignes.data ?? []).reduce((s, l) => s + (l.quantite as number), 0),
        depense: somme('facture'),
        devise: somme('devis'),
      })
      setLoading(false)
    })()

    return () => { vivant = false }
  }, [annee])

  return { bilan, loading }
}
