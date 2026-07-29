'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DigestKind = 'brief' | 'debrief'
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low'

// Contrat stable du payload (garanti par les tâches planifiées). Tout est
// rendu défensivement : les tableaux peuvent manquer, on ne casse jamais.
export interface DigestStat    { label: string; value: string | number; tone?: Tone }
export interface DigestItem    { text: string; brand?: string; badge?: string; tone?: Tone }
export interface DigestSection { title: string; icon?: string; items?: DigestItem[] }
export interface DigestPriority { title: string; brand?: string; due?: string; priority?: PriorityLevel; note?: string }
export interface DigestFlag    { tone?: Tone; text: string }
export interface DigestPayload {
  v?: number
  date?: string
  title?: string
  headline?: string
  stats?: DigestStat[]
  sections?: DigestSection[]
  priorities?: DigestPriority[]
  flags?: DigestFlag[]
}

export interface Digest {
  id: number
  kind: string          // 'brief' | 'debrief' (la vue ne renvoie que ces deux-là)
  content: string       // markdown (secours)
  generated_at: string  // ISO timestamptz
  payload: DigestPayload | null  // structuré, à privilégier
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
      .select('id, kind, content, generated_at, payload')
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
