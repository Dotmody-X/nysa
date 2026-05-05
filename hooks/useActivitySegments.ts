// Hook pour charger les détails km-par-km d'une activité

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ActivitySegment {
  id: string
  km_index: number
  km_start: number
  km_end: number
  time_seconds: number
  altitude_start: number
  altitude_end: number
  elevation_gain: number
  pace_sec_per_km: number
  heart_rate_avg: number
  heart_rate_min: number
  heart_rate_max: number
  cadence_avg: number
  power_avg: number
  temperature_avg: number
  grade_avg: number
  lat_start: number
  lon_start: number
  lat_end: number
  lon_end: number
}

export function useActivitySegments(activityId: string | null) {
  const [segments, setSegments] = useState<ActivitySegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activityId) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const supabase = await createClient()
        const { data, error: queryError } = await supabase
          .from('activity_segments')
          .select('*')
          .eq('activity_id', activityId)
          .order('km_index', { ascending: true })

        if (queryError) {
          setError(queryError.message)
          setSegments([])
        } else {
          setSegments(data || [])
        }
      } catch (e) {
        setError(String(e))
        setSegments([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activityId])

  return { segments, loading, error }
}
