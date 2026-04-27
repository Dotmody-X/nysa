'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TimeEntry } from '@/types'

export function useTimeEntries() {
  const [entries,  setEntries]  = useState<TimeEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const supabase = createClient()

  // Fenêtre : cette semaine
  const weekStart = (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  })()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('time_entries')
      .select('*, projects(name, color)')
      .gte('started_at', weekStart)
      .order('started_at', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function start(projectId: string | null, description: string, isbillable = true) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id:     user!.id,
        project_id:  projectId,
        description,
        is_billable: isbillable,
        started_at:  new Date().toISOString(),
      })
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(e => [data as TimeEntry, ...e])
    return { data, error }
  }

  async function stop(id: string, startedAt: string) {
    const endedAt  = new Date()
    const duration = Math.floor((endedAt.getTime() - new Date(startedAt).getTime()) / 1000)
    const { data, error } = await supabase
      .from('time_entries')
      .update({ ended_at: endedAt.toISOString(), duration_seconds: duration })
      .eq('id', id)
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(e => e.map(x => x.id === id ? data as TimeEntry : x))
    return { data, error }
  }

  async function remove(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  // Helpers calculs
  const totalSecondsToday = entries
    .filter(e => e.started_at.startsWith(new Date().toISOString().slice(0, 10)) && e.duration_seconds)
    .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

  const totalSecondsWeek = entries
    .filter(e => e.duration_seconds)
    .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

  return {
    entries, loading, refetch: fetch,
    start, stop, remove,
    totalSecondsToday, totalSecondsWeek,
  }
}
