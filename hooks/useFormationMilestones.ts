'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useFormationMilestones — parcours de formation (public.formation_milestones).
// Réutilise le client Supabase authentifié (RLS filtre par utilisateur).
// SEULE écriture autorisée : la colonne `status`. On ne touche jamais user_id
// ni done_at (un trigger DB remplit done_at). Jamais d'écriture dans public.tasks.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type MilestoneStatus = 'todo' | 'done'

export interface FormationMilestone {
  id: number
  phase: number
  title: string
  competence: string | null
  study: string | null
  deliverable: string | null
  due_date: string | null
  status: MilestoneStatus
  done_at: string | null
}

const COLUMNS = 'id, phase, title, competence, study, deliverable, due_date, status, done_at'

export function useFormationMilestones() {
  const [milestones, setMilestones] = useState<FormationMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('formation_milestones').select(COLUMNS)
      .order('phase', { ascending: true })
    if (error) setError(error.message)
    else setMilestones((data as FormationMilestone[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  // Met à jour UNIQUEMENT la colonne status. done_at est géré par un trigger DB.
  const setStatus = useCallback(async (id: number, status: MilestoneStatus) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('formation_milestones').update({ status }).eq('id', id)
      .select('id, status, done_at').single()
    if (error) return { error: error.message }
    setMilestones(prev => prev.map(m =>
      m.id === id ? { ...m, status: (data as any).status, done_at: (data as any).done_at } : m
    ))
    return {}
  }, [])

  const doneCount = milestones.filter(m => m.status === 'done').length

  return { milestones, loading, error, refetch, setStatus, doneCount }
}
