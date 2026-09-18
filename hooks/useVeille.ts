'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type VeilleBrand = 'E-Smoker' | 'Aeterna'
export type VeilleCategory = 'loi' | 'marche' | 'tendance' | 'news'
export type VeilleCountry = 'BE' | 'FR' | 'LU' | 'CH' | 'IT' | 'EU'

export interface VeilleItem {
  id: number
  brand: VeilleBrand
  category: VeilleCategory
  country: VeilleCountry | null
  title: string
  summary: string
  url: string | null
  source: string | null
  published_at: string | null   // AAAA-MM-JJ
  effective_at: string | null   // entrée en vigueur (lois)
  importance: 1 | 2 | 3
  tags: string[]
  captured_at: string           // ISO timestamptz — la semaine où la veille l'a trouvé
}

export const CATEGORIE_LABEL: Record<VeilleCategory, string> = {
  loi: 'Lois', marche: 'Marché', tendance: 'Tendances', news: 'Actualité',
}
export const PAYS_LABEL: Record<VeilleCountry, string> = {
  BE: 'Belgique', FR: 'France', LU: 'Luxembourg', CH: 'Suisse', IT: 'Italie', EU: 'Union européenne',
}

/**
 * Les éléments de veille d'une marque — LECTURE SEULE via public.v_veille_items
 * (work.veille_items filtrée sur l'utilisateur). La tâche du lundi écrit ;
 * l'application ne fait que lire.
 */
export function useVeille(brand: VeilleBrand) {
  const [items, setItems] = useState<VeilleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('v_veille_items')
      .select('id, brand, category, country, title, summary, url, source, published_at, effective_at, importance, tags, captured_at')
      .eq('brand', brand)
      .order('captured_at', { ascending: false })
      .order('importance', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    else setItems((data as VeilleItem[]) ?? [])
    setLoading(false)
  }, [brand])

  useEffect(() => { fetchItems() }, [fetchItems])

  return { items, loading, error, refetch: fetchItems }
}
