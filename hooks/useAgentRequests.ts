'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from './useRealtimeTable'

export type AgentRequestStatus = 'pending' | 'running' | 'done' | 'error'

export interface AgentRequest {
  id: number
  source: string
  question: string
  context: Record<string, unknown>
  status: AgentRequestStatus
  reply: string | null
  error: string | null
  created_at: string
  started_at: string | null
  done_at: string | null
}

/**
 * Les demandes à Claude déposées depuis l'application et traitées par l'agent
 * du Pi (work.agent_requests, via les wrappers public). La ligne change de
 * statut en Realtime : pending → running → done, la réponse arrive sur l'écran
 * sans rechargement.
 */
export function useAgentRequests(source = 'poste', limite = 20) {
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('v_agent_requests')
      .select('id, source, question, context, status, reply, error, created_at, started_at, done_at')
      .eq('source', source)
      .order('created_at', { ascending: false })
      .limit(limite)
    if (error) setError(error.message)
    else { setError(null); setRequests((data as AgentRequest[]) ?? []) }
    setLoading(false)
  }, [source, limite])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useRealtimeTable('agent_requests', fetchRequests, 'work')

  /** Dépose une demande ; la réponse arrivera par le Realtime. */
  const ask = useCallback(async (question: string, context: Record<string, unknown> = {}) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('ask_agent', { p_question: question, p_context: context, p_source: source })
    if (error) throw new Error(error.message)
    await fetchRequests()
    return data as number
  }, [source, fetchRequests])

  const enCours = requests.some(r => r.status === 'pending' || r.status === 'running')

  return { requests, loading, error, ask, enCours, refetch: fetchRequests }
}
