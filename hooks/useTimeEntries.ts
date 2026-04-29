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

  async function stop(id: string, startedAt: string, options?: { addToCalendar?: boolean }) {
    const endedAt  = new Date()
    const duration = Math.floor((endedAt.getTime() - new Date(startedAt).getTime()) / 1000)
    const { data, error } = await supabase
      .from('time_entries')
      .update({ ended_at: endedAt.toISOString(), duration_seconds: duration })
      .eq('id', id)
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(e => e.map(x => x.id === id ? data as TimeEntry : x))

    // Création automatique d'un événement calendrier si demandé
    let calendarEvent = null
    if (!error && data && options?.addToCalendar) {
      const entry = data as TimeEntry & { projects?: { name: string; color: string } }
      const { data: { user } } = await supabase.auth.getUser()
      const { data: ev } = await supabase.from('events').insert({
        user_id:    user!.id,
        title:      entry.description || 'Session de travail',
        start_at:   entry.started_at,
        end_at:     endedAt.toISOString(),
        all_day:    false,
        source:     'manual',
        project_id: entry.project_id ?? null,
        // Catégorie = nom du projet (pour correspondre au calendrier Apple)
        category:   entry.category ?? entry.projects?.name ?? null,
      }).select().single()
      calendarEvent = ev
      // Push vers Apple Calendar
      if (ev) {
        window.fetch('/api/calendar/apple/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: ev }),
        }).catch(() => {})
      }
    }

    return { data, error, calendarEvent }
  }

  async function update(id: string, patch: Partial<Pick<TimeEntry, 'description' | 'project_id' | 'category' | 'started_at' | 'ended_at' | 'is_billable'>>) {
    // Recalculate duration if times changed
    const payload: Record<string, unknown> = { ...patch }
    const entry = entries.find(e => e.id === id)
    if (entry && (patch.started_at || patch.ended_at)) {
      const s = patch.started_at ?? entry.started_at
      const e = patch.ended_at   ?? entry.ended_at
      if (s && e) payload.duration_seconds = Math.floor((new Date(e).getTime() - new Date(s).getTime()) / 1000)
    }
    const { data, error } = await supabase
      .from('time_entries')
      .update(payload)
      .eq('id', id)
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(prev => prev.map(x => x.id === id ? data as TimeEntry : x))
    return { data, error }
  }

  async function remove(id: string) {
    await supabase.from('time_entries').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  async function createManual(patch: {
    description?: string
    project_id?: string
    category?: string
    is_billable?: boolean
    started_at: string
    ended_at?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    const duration = patch.ended_at
      ? Math.floor((new Date(patch.ended_at).getTime() - new Date(patch.started_at).getTime()) / 1000)
      : undefined
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id:          user!.id,
        description:      patch.description ?? null,
        project_id:       patch.project_id ?? null,
        category:         patch.category ?? null,
        is_billable:      patch.is_billable ?? true,
        started_at:       patch.started_at,
        ended_at:         patch.ended_at ?? null,
        duration_seconds: duration ?? null,
      })
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(prev => [data as TimeEntry, ...prev])
    return { data, error }
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
    start, stop, update, remove, createManual,
    totalSecondsToday, totalSecondsWeek,
  }
}
