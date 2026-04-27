'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

export function useProjects() {
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProjects(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, user_id: user!.id })
      .select().single()
    if (!error && data) setProjects(p => [data as Project, ...p])
    return { data, error }
  }

  async function update(id: string, payload: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects').update(payload).eq('id', id).select().single()
    if (!error && data) setProjects(p => p.map(x => x.id === id ? data as Project : x))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(p => p.filter(x => x.id !== id))
    return { error }
  }

  return { projects, loading, error, refetch: fetch, create, update, remove }
}
