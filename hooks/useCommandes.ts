'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from './useRealtimeTable'
import type { InboxItem } from './useInbox'

/**
 * Les commandes WooCommerce des sept derniers jours (work.events, type
 * order), traitées ou non — pour la journée du poste. Même flux Realtime
 * que le courrier : une commande qui tombe apparaît sans rechargement.
 */
export function useCommandes(jours = 7) {
  const [tout, setTout] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const { data, error } = await createClient().rpc('get_work_courrier', { p_jours: jours })
    if (!error) setTout((data as InboxItem[]) ?? [])
    setLoading(false)
  }, [jours])

  useEffect(() => { fetchAll() }, [fetchAll])
  useRealtimeTable('events', fetchAll, 'work')

  const commandes = useMemo(() => tout.filter(i => i.type === 'order'), [tout])
  return { commandes, loading, refetch: fetchAll }
}
