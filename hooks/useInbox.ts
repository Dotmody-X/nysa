'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable, type EtatRealtime } from './useRealtimeTable'

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
  /** Le mail entier (jusqu'à 3 000 caractères), quand nysa-mail l'a gardé. */
  texte: string | null
  /** Les pièces jointes rangées dans le bucket `courrier`. */
  fichiers: { name: string; path: string; size: number; type: string }[] | null
  /** Présent seulement quand on affiche aussi les traités. */
  processed?: boolean
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
export function useInbox(avecTraites = false) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [pulse, setPulse] = useState<InboxPulse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** La connexion temps réel : si elle tombe, le poste doit le dire. */
  const [direct, setDirect] = useState<EtatRealtime | null>(null)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    // Avec les traités : les sept derniers jours, tout compris ; sinon l'inbox.
    const inboxQ = avecTraites ? supabase.rpc('get_work_courrier', { p_jours: 7 }) : supabase.rpc('get_work_inbox')
    const [inbox, pouls] = await Promise.all([inboxQ, supabase.rpc('get_work_pulse')])
    if (inbox.error) setError(inbox.error.message)
    else { setError(null); setItems((inbox.data as InboxItem[]) ?? []) }
    if (!pouls.error) setPulse(pouls.data as InboxPulse)
    setLoading(false)
  }, [avecTraites])

  useEffect(() => { fetchAll() }, [fetchAll])
  useRealtimeTable('events', fetchAll, 'work', setDirect)

  /** « Traité » : la ligne sort de l'inbox, l'événement reste pour les briefs. */
  const marquerTraite = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    // Optimiste : la ligne disparaît (ou passe en « traité »), le Realtime confirme.
    setItems(cur => avecTraites ? cur.map(i => ids.includes(i.id) ? { ...i, processed: true } : i) : cur.filter(i => !ids.includes(i.id)))
    const supabase = createClient()
    const { error } = await supabase.rpc('mark_work_events_processed', { p_ids: ids })
    if (error) { setError(error.message); await fetchAll() }
  }, [fetchAll, avecTraites])

  return { items, pulse, loading, error, direct, refetch: fetchAll, marquerTraite }
}
