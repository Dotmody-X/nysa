'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from './useRealtimeTable'
import type { TimeEntry } from '@/types'

// Calendrier iCloud qui reçoit une session quand aucun label n'est choisi.
// Le nom du projet ne sert pas de repli : « [AE] Site Web » ne correspond à
// aucun calendrier, et la route push retombait alors sur le premier
// calendrier iCloud (Dou&Dou).
export const DEFAULT_TIME_CALENDAR = 'Mixologue'

export function useTimeEntries(fromDate?: string, toDate?: string) {
  const [entries,  setEntries]  = useState<TimeEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const supabase = createClient()

  // Fenêtre par défaut : lundi de la semaine courante
  const defaultFrom = (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  })()

  const effectiveFrom = fromDate ?? defaultFrom

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('time_entries')
        .select('*, projects(name, color)')
        .gte('started_at', effectiveFrom)
        .order('started_at', { ascending: false })
      if (toDate) query = query.lte('started_at', toDate)
      const { data, error } = await query
      
      if (error) {
        console.error('[useTimeEntries] Supabase error:', error)
        setEntries([])
      } else {
        console.log('[useTimeEntries] Fetched entries:', data?.length ?? 0)
        setEntries(data ?? [])
      }
    } catch (err) {
      console.error('[useTimeEntries] Catch error:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [effectiveFrom, toDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])
  // Un compteur démarré ou arrêté ailleurs (Discord, iPad, autre onglet) se
  // reflète ici sans rechargement.
  useRealtimeTable('time_entries', fetch)

  async function start(projectId: string | null, description: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id:     user!.id,
        project_id:  projectId,
        description,
        started_at:  new Date().toISOString(),
      })
      .select('*, projects(name, color)')
      .single()
    if (!error && data) setEntries(e => [data as TimeEntry, ...e])
    return { data, error }
  }

  async function stop(id: string, startedAt: string, options?: { addToCalendar?: boolean; calendarLabel?: string }) {
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
      const entry = data as TimeEntry
      const { data: { user } } = await supabase.auth.getUser()
      // Label : choix utilisateur, sinon le calendrier par défaut. `||` et non
      // `??` : le sélecteur transmet '' quand rien n'est choisi.
      const category = options.calendarLabel?.trim() || DEFAULT_TIME_CALENDAR
      const { data: ev } = await supabase.from('events').insert({
        user_id:    user!.id,
        title:      entry.description || 'Session de travail',
        start_at:   entry.started_at,
        end_at:     endedAt.toISOString(),
        all_day:    false,
        source:     'manual',
        project_id: entry.project_id ?? null,
        category,
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

  async function update(id: string, patch: Partial<Pick<TimeEntry, 'description' | 'project_id' | 'category' | 'started_at' | 'ended_at'>>) {
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
