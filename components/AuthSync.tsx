'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setActiveUser } from '@/lib/userStore'

/**
 * Synchronise le compte actif (pour le cloisonnement localStorage) avec la
 * session Supabase : au chargement et à chaque changement de session.
 */
export function AuthSync() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setActiveUser(data.user?.id ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveUser(session?.user?.id ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return null
}
