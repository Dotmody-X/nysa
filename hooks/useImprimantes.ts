'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Imprimante, ClientAcces } from '@/types'

export function useImprimantes() {
  const [imprimantes, setImprimantes] = useState<Imprimante[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // Le magasin rattaché arrive avec la ligne : sans lui, une imprimante
    // n'est qu'un numéro de série.
    const { data, error } = await supabase
      .from('imprimantes')
      .select('*, client:clients(id, name, ville)')
      .order('magasin', { ascending: true })
    if (error) setError(error.message)
    else setImprimantes((data ?? []) as Imprimante[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Partial<Imprimante> & { magasin: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('imprimantes')
      .insert({ ...payload, user_id: user!.id })
      .select('*, client:clients(id, name, ville)').single()
    if (!error && data) await fetch()
    return { data, error }
  }

  async function update(id: string, payload: Partial<Imprimante>) {
    const { data, error } = await supabase
      .from('imprimantes').update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select('*, client:clients(id, name, ville)').single()
    if (!error && data) setImprimantes(l => l.map(x => x.id === id ? data as Imprimante : x))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('imprimantes').delete().eq('id', id)
    if (!error) setImprimantes(l => l.filter(x => x.id !== id))
    return { error }
  }

  return { imprimantes, loading, error, create, update, remove, refetch: fetch }
}

/**
 * Identifiants d'accès d'un client, chargés à la demande.
 *
 * Volontairement séparés de `useClients` : ces données ne doivent être lues
 * que sur la fiche qui les affiche, jamais embarquées dans chaque liste de
 * clients de l'application.
 */
export function useClientAcces(clientId?: string) {
  const [acces, setAcces] = useState<ClientAcces | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!clientId) { setAcces(null); return }
    setLoading(true)
    const { data } = await supabase
      .from('client_acces')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle()
    setAcces((data as ClientAcces) ?? null)
    setLoading(false)
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function save(payload: Partial<ClientAcces>) {
    if (!clientId) return { data: null, error: new Error('client_id requis') }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('client_acces')
      .upsert(
        { ...payload, client_id: clientId, service: payload.service ?? 'site-etiquettes', user_id: user!.id },
        { onConflict: 'client_id,service' },
      )
      .select().single()
    if (!error && data) setAcces(data as ClientAcces)
    return { data, error }
  }

  return { acces, loading, save, refetch: fetch }
}
