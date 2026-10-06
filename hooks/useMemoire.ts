'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Une règle apprise par Nysa (table public.memoire, voir agent/src/memoire.ts). */
export interface Regle {
  id: number
  type: 'alias' | 'regle' | 'preference' | 'erreur'
  cle: string
  valeur: string
  exemple: string | null
  origine: 'correction' | 'explicite' | 'deduit' | 'lexique'
  confiance: number
  utilisations: number
  derniere_utilisation: string | null
  statut: 'active' | 'a_confirmer' | 'retiree'
  created_at: string
  updated_at: string
}

/** Une correction brute (table public.erreurs). */
export interface Correction {
  id: number
  demande: string
  compris: string | null
  voulu: string
  created_at: string
}

/**
 * Ce que Nysa a appris. On ne supprime rien : « retirer » passe la règle en
 * `retiree` (la base n'accorde d'ailleurs aucun droit de suppression), et
 * « remettre » la réactive.
 */
export function useMemoire() {
  const [regles, setRegles] = useState<Regle[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [r, c] = await Promise.all([
      supabase.from('memoire').select('*').order('utilisations', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('erreurs').select('id, demande, compris, voulu, created_at').order('created_at', { ascending: false }).limit(20),
    ])
    if (r.error || c.error) setError((r.error ?? c.error)!.message)
    else {
      setRegles((r.data ?? []) as Regle[])
      setCorrections((c.data ?? []) as Correction[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function changerStatut(id: number, statut: Regle['statut']) {
    const { data, error } = await supabase
      .from('memoire').update({ statut, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (!error && data) setRegles(rs => rs.map(x => (x.id === id ? (data as Regle) : x)))
    return { error }
  }

  return {
    regles, corrections, loading, error, refetch: fetch,
    retirer: (id: number) => changerStatut(id, 'retiree'),
    remettre: (id: number) => changerStatut(id, 'active'),
    confirmer: (id: number) => changerStatut(id, 'active'),
  }
}
