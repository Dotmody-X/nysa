'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'

export function useTasks(projectId?: string) {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*')
      .neq('status', 'cancelled')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (projectId) query = query.eq('project_id', projectId)

    const { data } = await query
    setTasks(data ?? [])
    setLoading(false)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Partial<Task>) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: user!.id, status: 'todo' })
      .select().single()
    if (!error && data) setTasks(t => [...t, data as Task])
    return { data, error }
  }

  async function toggle(id: string, current: Task['status']) {
    const next = current === 'done' ? 'todo' : 'done'
    const patch: Partial<Task> = {
      status:       next,
      completed_at: next === 'done' ? new Date().toISOString() : undefined,
    }
    const { data, error } = await supabase
      .from('tasks').update(patch).eq('id', id).select().single()
    if (!error && data) setTasks(t => t.map(x => x.id === id ? data as Task : x))
    return { error }
  }

  async function update(id: string, payload: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks').update(payload).eq('id', id).select().single()
    if (!error && data) setTasks(t => t.map(x => x.id === id ? data as Task : x))
    return { error }
  }

  async function remove(id: string) {
    await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  return { tasks, loading, refetch: fetch, create, toggle, update, remove }
}
