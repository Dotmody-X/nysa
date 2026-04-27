'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type CalendarEvent = {
  id: string
  user_id: string
  task_id?: string | null
  project_id?: string | null
  title: string
  description?: string | null
  start_at: string
  end_at: string
  all_day: boolean
  category?: string | null
  color?: string | null
  location?: string | null
  source: string
  created_at: string
}

export type NewEvent = {
  title: string
  description?: string
  start_at: string
  end_at: string
  all_day?: boolean
  category?: string
  color?: string
  location?: string
  task_id?: string
  project_id?: string
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useCalendar(weekStart: Date) {
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_at', weekStart.toISOString())
      .lt('start_at', weekEnd.toISOString())
      .order('start_at', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.toISOString()])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function addEvent(ev: NewEvent): Promise<CalendarEvent | null> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('events')
      .insert({ ...ev, user_id: user.id, source: 'manual' })
      .select()
      .single()
    if (error || !data) return null
    setEvents(prev => [...prev, data].sort((a, b) => a.start_at.localeCompare(b.start_at)))
    return data
  }

  async function updateEvent(id: string, patch: Partial<NewEvent>) {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('events')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (data) setEvents(prev => prev.map(e => e.id === id ? data : e))
  }

  async function removeEvent(id: string) {
    const supabase = getSupabase()
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  return { events, loading, addEvent, updateEvent, removeEvent, refetch: fetchEvents }
}
