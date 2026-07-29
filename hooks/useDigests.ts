'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DigestKind = 'brief' | 'debrief'

export interface Digest {
  id: number
  kind: string          // 'brief' | 'debrief' (la vue ne renvoie que ces deux-là)
  content: string
  generated_at: string  // ISO timestamptz
}

/**
 * Briefs & débriefs quotidiens — LECTURE SEULE via la vue public.v_digests
 * (fenêtre curée sur work.digests, déjà filtrée sur kind ∈ {brief, debrief}).
 * Réutilise le client Supabase existant (anon, RLS respectée). On n'écrit jamais.
 */
export function useDigests() {
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDigests = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('v_digests')
      .select('id, kind, content, generated_at')
      .order('generated_at', { ascending: false })
    if (error) setError(error.message)
    else setDigests((data as Digest[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDigests() }, [fetchDigests])

  const latestBrief   = digests.find(d => d.kind === 'brief')   ?? null
  const latestDebrief = digests.find(d => d.kind === 'debrief') ?? null

  return { digests, loading, error, refetch: fetchDigests, latestBrief, latestDebrief }
}
