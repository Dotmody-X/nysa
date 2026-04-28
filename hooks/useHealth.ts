'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HealthMetric, RunningActivity } from '@/types'

export function useHealth() {
  const [metrics,    setMetrics]    = useState<HealthMetric[]>([])
  const [activities, setActivities] = useState<RunningActivity[]>([])
  const [loading,    setLoading]    = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from('health_metrics').select('*').order('date', { ascending: false }).limit(30),
      supabase.from('running_activities').select('*').order('date', { ascending: false }).limit(20),
    ])
    setMetrics(m ?? [])
    setActivities(a ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function addWeight(date: string, weight_kg: number, notes?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('health_metrics')
      .upsert({ user_id: user!.id, date, weight_kg, notes }, { onConflict: 'user_id,date' })
      .select().single()
    if (!error && data) {
      setMetrics(m => {
        const exists = m.find(x => x.date === date)
        return exists
          ? m.map(x => x.date === date ? data as HealthMetric : x)
          : [data as HealthMetric, ...m]
      })
    }
    return { error }
  }

  async function addRun(payload: Partial<RunningActivity>) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('running_activities')
      .insert({ ...payload, user_id: user!.id, source: 'manual' })
      .select().single()
    if (!error && data) setActivities(a => [data as RunningActivity, ...a])
    return { data: data as RunningActivity | null, error }
  }

  const latestWeight = metrics[0]?.weight_kg ?? null
  const weightTrend  = metrics.length >= 2
    ? (metrics[0].weight_kg ?? 0) - (metrics[1].weight_kg ?? 0)
    : null

  return {
    metrics, activities, loading, refetch: fetch,
    addWeight, addRun,
    latestWeight, weightTrend,
  }
}
