'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Rappelle `onChange` à chaque insertion, mise à jour ou suppression dans une
 * table publiée dans `supabase_realtime` (migration 20260918140000). C'est ce
 * qui fait qu'un compteur arrêté depuis Discord s'arrête aussi sur l'iPad,
 * sans rechargement. La RLS filtre côté serveur : on ne reçoit que ses lignes.
 *
 * `onChange` doit être stable (useCallback), sinon l'abonnement se refait à
 * chaque rendu.
 */
export function useRealtimeTable(table: string, onChange: () => void, schema = 'public') {
  // Un nom de canal par instance : deux hooks sur la même table dans la même
  // page se partageraient sinon le même canal, et le premier démonté
  // couperait l'autre.
  const suffixe = useRef(Math.random().toString(36).slice(2, 8))
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`rt:${schema}.${table}:${suffixe.current}`)
      .on('postgres_changes', { event: '*', schema, table }, () => onChange())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [table, schema, onChange])
}
