'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setClients(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Partial<Client> & { name: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...payload, user_id: user!.id })
      .select().single()
    if (!error && data) setClients(c => [...c, data as Client].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function update(id: string, payload: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients').update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (!error && data) setClients(c => c.map(x => x.id === id ? data as Client : x))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) setClients(c => c.filter(x => x.id !== id))
    return { error }
  }

  return { clients, loading, error, create, update, remove, refetch: fetch }
}
