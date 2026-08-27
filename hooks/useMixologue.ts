'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Les chiffres de la marque, pour l'accueil. */
export interface ChiffresMixologue {
  clients: number
  demandesEnCours: number
  demandesTotal: number
  machines: number
  magasinsEquipes: number
  accesSite: number
  etiquettesARenvoyer: number
  commandesOuvertes: number
  /** Saveurs dont le visuel a changé, pour les nommer sans ouvrir l'écran. */
  aRenvoyer: string[]
}

/**
 * Ne rapatrie que des compteurs.
 *
 * Chaque appel demande `count: 'exact', head: true` : Postgres compte, aucune
 * ligne ne traverse le réseau. L'accueil n'a besoin de rien d'autre — le détail
 * vit dans les écrans dédiés, et le dupliquer ici le ferait diverger.
 */
export function useMixologue() {
  const [chiffres, setChiffres] = useState<ChiffresMixologue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let vivant = true

    ;(async () => {
      const compte = (t: string) => supabase.from(t).select('*', { count: 'exact', head: true })

      const [clients, demTotal, demCours, machines, acces, cmd, saveurs] = await Promise.all([
        compte('clients'),
        compte('demandes'),
        supabase.from('demandes').select('*', { count: 'exact', head: true })
          .in('statut', ['nouvelle', 'en_cours']),
        supabase.from('imprimantes').select('client_id', { count: 'exact' }),
        compte('client_acces'),
        supabase.from('etiquette_commandes').select('*', { count: 'exact', head: true })
          .in('statut', ['brouillon', 'confirmee', 'en_production']),
        supabase.from('etiquettes').select('saveur').eq('etat_fichier', 'modifie').order('saveur'),
      ])

      if (!vivant) return
      const noms = (saveurs.data ?? []).map(x => x.saveur as string)
      setChiffres({
        clients: clients.count ?? 0,
        demandesTotal: demTotal.count ?? 0,
        demandesEnCours: demCours.count ?? 0,
        machines: machines.count ?? 0,
        magasinsEquipes: new Set((machines.data ?? []).map(x => x.client_id).filter(Boolean)).size,
        accesSite: acces.count ?? 0,
        etiquettesARenvoyer: noms.length,
        commandesOuvertes: cmd.count ?? 0,
        aRenvoyer: noms,
      })
      setLoading(false)
    })()

    return () => { vivant = false }
  }, [])

  return { chiffres, loading }
}
