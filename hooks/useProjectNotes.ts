'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProjectNote {
  id: string
  project_id: string
  title: string
  content: string
  color: string
  created_at: string
  updated_at: string
}

export function useProjectNotes(projectId: string) {
  const [notes, setNotes] = useState<ProjectNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setNotes(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  async function create(title: string, content: string, color: string = '#F2F2F0') {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('project_notes')
      .insert({ title, content, color, project_id: projectId, user_id: user!.id })
      .select().single()
    if (!error && data) setNotes(n => [data as ProjectNote, ...n])
    return { data, error }
  }

  async function update(id: string, payload: Partial<ProjectNote>) {
    const { data, error } = await supabase
      .from('project_notes').update(payload).eq('id', id).select().single()
    if (!error && data) setNotes(n => n.map(x => x.id === id ? data as ProjectNote : x))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('project_notes').delete().eq('id', id)
    if (!error) setNotes(n => n.filter(x => x.id !== id))
    return { error }
  }

  return { notes, loading, error, refetch: fetch, create, update, remove }
}
