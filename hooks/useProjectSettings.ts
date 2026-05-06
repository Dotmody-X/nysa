'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProjectSetting {
  id: string
  project_id: string
  key: string
  value: any
  created_at: string
  updated_at: string
}

export function useProjectSettings(projectId: string) {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', projectId)
    
    if (error) setError(error.message)
    else {
      const settingsMap: Record<string, any> = {}
      data?.forEach(s => { settingsMap[s.key] = s.value })
      setSettings(settingsMap)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  async function set(key: string, value: any) {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('project_settings')
      .upsert({ project_id: projectId, user_id: user!.id, key, value }, { onConflict: 'project_id,key' })
      .select().single()
    
    if (!error) {
      setSettings(s => ({ ...s, [key]: value }))
    }
    return { data, error }
  }

  async function remove(key: string) {
    const { error } = await supabase
      .from('project_settings')
      .delete()
      .eq('project_id', projectId)
      .eq('key', key)
    
    if (!error) {
      setSettings(s => {
        const newS = { ...s }
        delete newS[key]
        return newS
      })
    }
    return { error }
  }

  return { settings, loading, error, refetch: fetch, set, remove }
}
