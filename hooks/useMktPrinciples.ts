'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useMktPrinciples — programme des principes (vue public.v_mkt_principles).
// LECTURE SEULE : c'est la tâche automatique du lundi qui met à jour les
// principes. Réutilise le client Supabase authentifié (RLS filtre par user).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PrincipleApplication { brand: string; action: string }

export interface MktPrinciple {
  id: number
  seq: number
  pillar: string
  principle: string
  status: 'pending' | 'done'
  week_of: string | null
  summary: string | null
  applications: PrincipleApplication[] | null
}

const COLUMNS = 'id, seq, pillar, principle, status, week_of, summary, applications'

export function useMktPrinciples() {
  const [principles, setPrinciples] = useState<MktPrinciple[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('v_mkt_principles').select(COLUMNS)
      .order('seq', { ascending: true })
    if (error) setError(error.message)
    else setPrinciples((data as MktPrinciple[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const doneCount = principles.filter(p => p.status === 'done').length
  // Prochain principe à venir = plus petit seq encore 'pending'
  const nextPendingId = principles
    .filter(p => p.status === 'pending')
    .sort((a, b) => a.seq - b.seq)[0]?.id ?? null

  return { principles, loading, error, refetch, doneCount, nextPendingId }
}
