'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from './useRealtimeTable'

/** Une ligne de work.v_inbox (via get_work_inbox). */
export interface InboxItem {
  id: number
  brand: 'mixologue' | 'esmoker' | 'aeterna' | 'transverse' | null
  type: 'mail' | 'order' | 'appointment' | string
  source: string
  title: string | null
  expediteur: string | null
  urgency: 1 | 2 | 3
  occurred_at: string
  heures: number
  extrait: string | null
  boite: string | null
  pieces: number
  /** La fiche de triage de Claude (payload.ai), quand il est passé. */
  ai: InboxTriage | null
}

export interface InboxTriage {
  resume?: string
  categorie?: 'commande' | 'fournisseur' | 'client' | 'facture' | 'admin' | 'rdv' | 'pub' | 'spam' | 'autre'
  urgence?: 1 | 2 | 3
  action?: string
  lien?: string | null
  /** Le triage a échoué : on affiche le mail tel quel. */
  echec?: string
  le?: string
}

export interface InboxPulse {
  last_mail_at: string | null
  last_event_at: string | null
  unprocessed: number
  today: number
}

/**
 * L'inbox de travail — les événements non traités de work.events, surtout le
 * courrier déposé par nysa-mail — et son pouls. En Realtime : un mail qui
 * arrive sur le Pi est ici dans la seconde.
 */
export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [pulse, setPulse] = useState<InboxPulse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const [inbox, pouls] = await Promise.all([supabase.rpc('get_work_inbox'), supabase.rpc('get_work_pulse')])
    if (inbox.error) setError(inbox.error.message)
    else { setError(null); setItems((inbox.data as InboxItem[]) ?? []) }
    if (!pouls.error) setPulse(pouls.data as InboxPulse)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useRealtimeTable('events', fetchAll, 'work')

  /** « Traité » : la ligne sort de l'inbox, l'événement reste pour les briefs. */
  const marquerTraite = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    // Optimiste : la ligne disparaît tout de suite, le Realtime confirme.
    setItems(cur => cur.filter(i => !ids.includes(i.id)))
    const supabase = createClient()
    const { error } = await supabase.rpc('mark_work_events_processed', { p_ids: ids })
    if (error) { setError(error.message); await fetchAll() }
  }, [fetchAll])

  return { items, pulse, loading, error, refetch: fetchAll, marquerTraite }
}
