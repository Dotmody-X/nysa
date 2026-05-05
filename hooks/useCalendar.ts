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
  external_id?: string | null
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

// Push silencieux vers Apple Calendar (fire & forget)
function pushToApple(event: CalendarEvent) {
  fetch('/api/calendar/apple/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {})
}

// Suppression silencieuse depuis Apple Calendar
function deleteFromApple(externalId: string | null | undefined) {
  if (!externalId) return
  fetch('/api/calendar/apple/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalId }),
  }).catch(() => {})
}

export function useCalendar(fromDate: Date, toDate: Date) {
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_at', fromDate.toISOString())
      .lt('start_at', toDate.toISOString())
      .order('start_at', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate.toISOString(), toDate.toISOString()])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Realtime : refetch quand un event est inséré/mis à jour (ex: depuis time tracker)
  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel('events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchEvents])

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
    // Push vers Apple Calendar si connecté
    pushToApple(data)
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
    if (data) {
      setEvents(prev => prev.map(e => e.id === id ? data : e))
      // Sync mise à jour vers Apple
      pushToApple(data)
    }
  }

  async function removeEvent(id: string) {
    const supabase = getSupabase()
    // Récupère l'external_id avant de supprimer
    const event = events.find(e => e.id === id)
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    // Supprime depuis Apple Calendar si l'événement y avait été pushé
    if (event?.external_id) deleteFromApple(event.external_id)
  }

  return { events, loading, addEvent, updateEvent, removeEvent, refetch: fetchEvents }
}
