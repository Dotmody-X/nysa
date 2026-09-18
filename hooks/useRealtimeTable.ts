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
export type EtatRealtime = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'

export function useRealtimeTable(table: string, onChange: () => void, schema = 'public', onStatus?: (etat: EtatRealtime) => void) {
  // Un nom de canal par instance : deux hooks sur la même table dans la même
  // page se partageraient sinon le même canal, et le premier démonté
  // couperait l'autre.
  const suffixe = useRef(Math.random().toString(36).slice(2, 8))
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`rt:${schema}.${table}:${suffixe.current}`)
      .on('postgres_changes', { event: '*', schema, table }, () => onChange())
      .subscribe(status => onStatus?.(status as EtatRealtime))
    // L'iPad met Safari en veille : au réveil, la socket peut avoir raté des
    // événements. On recharge quand la page redevient visible ou que le
    // réseau revient — c'est ce qui rend le poste fiable toute la journée.
    const reveil = () => { if (document.visibilityState === 'visible') onChange() }
    document.addEventListener('visibilitychange', reveil)
    window.addEventListener('online', reveil)
    return () => {
      document.removeEventListener('visibilitychange', reveil)
      window.removeEventListener('online', reveil)
      supabase.removeChannel(channel)
    }
  }, [table, schema, onChange, onStatus])
}
