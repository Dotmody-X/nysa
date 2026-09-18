'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Ce que Claude a fait aujourd'hui : demandes (poste, Discord) et triages de mails. */
export function useClaudeUsage(rafraichirMs = 5 * 60_000) {
  const [usage, setUsage] = useState<{ demandes: number; triages: number } | null>(null)

  const fetchUsage = useCallback(async () => {
    const { data, error } = await createClient().rpc('get_claude_usage', { p_jours: 1 })
    if (!error && data) setUsage(data as { demandes: number; triages: number })
  }, [])

  useEffect(() => {
    fetchUsage()
    const t = setInterval(fetchUsage, rafraichirMs)
    return () => clearInterval(t)
  }, [fetchUsage, rafraichirMs])

  return { usage, refetch: fetchUsage }
}
