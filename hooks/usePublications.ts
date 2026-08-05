'use client'

// ─────────────────────────────────────────────────────────────────────────────
// usePublications — calendrier éditorial (table public.publications).
// Réutilise le client Supabase authentifié existant (RLS filtre par auth.uid()).
// INSERT : ne jamais renseigner user_id (défaut auth.uid()). UPDATE : ne jamais
// toucher user_id. published_at est rempli par un trigger DB au passage published.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PubStatus = 'idea' | 'draft' | 'scheduled' | 'published' | 'cancelled'

export interface Publication {
  id: number
  brand: string | null
  title: string | null
  channel: string | null
  status: PubStatus
  publish_date: string | null   // 'YYYY-MM-DD'
  published_at: string | null
  link: string | null
  notes: string | null
  project_id: string | null
  task_id: string | null
  mix_id: number | null
  featured: string | null        // lecture seule (mix de la semaine)
}

// Champs éditables depuis le front (jamais user_id, jamais featured/published_at)
export interface PublicationInput {
  title?: string | null
  brand?: string | null
  channel?: string | null
  status?: PubStatus
  publish_date?: string | null
  link?: string | null
  notes?: string | null
  project_id?: string | null
  task_id?: string | null
}

const COLUMNS = 'id, brand, title, channel, status, publish_date, published_at, link, notes, project_id, task_id, mix_id, featured'

export function usePublications() {
  const [publications, setPublications] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('publications').select(COLUMNS)
      .order('publish_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setPublications((data as Publication[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  // CREATE — user_id se remplit tout seul (défaut auth.uid()), on ne l'envoie pas.
  const create = useCallback(async (input: PublicationInput) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('publications').insert(input).select(COLUMNS).single()
    if (error) return { error: error.message }
    setPublications(prev => [data as Publication, ...prev])
    return { data: data as Publication }
  }, [])

  // UPDATE — on ne touche jamais user_id.
  const update = useCallback(async (id: number, patch: PublicationInput) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('publications').update(patch).eq('id', id).select(COLUMNS).single()
    if (error) return { error: error.message }
    setPublications(prev => prev.map(p => (p.id === id ? (data as Publication) : p)))
    return { data: data as Publication }
  }, [])

  const remove = useCallback(async (id: number) => {
    const supabase = createClient()
    const { error } = await supabase.from('publications').delete().eq('id', id)
    if (error) return { error: error.message }
    setPublications(prev => prev.filter(p => p.id !== id))
    return {}
  }, [])

  return { publications, loading, error, refetch, create, update, remove }
}
