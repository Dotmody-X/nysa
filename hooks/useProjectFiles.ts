'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProjectFile {
  id: string
  project_id: string
  filename: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}

export function useProjectFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setFiles(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  async function upload(file: File) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `projects/${projectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, file)
      
      if (uploadError) {
        setError(uploadError.message)
        return { error: uploadError }
      }

      const { data, error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          user_id: user!.id,
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        })
        .select().single()
      
      if (!error && data) setFiles(f => [data as ProjectFile, ...f])
      return { data, error }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { error: { message } }
    }
  }

  async function remove(id: string, filePath: string) {
    const { error: deleteError } = await supabase.storage
      .from('project_files')
      .remove([filePath])
    
    if (deleteError) {
      setError(deleteError.message)
      return { error: deleteError }
    }

    const { error } = await supabase.from('project_files').delete().eq('id', id)
    if (!error) setFiles(f => f.filter(x => x.id !== id))
    return { error }
  }

  function getDownloadUrl(filePath: string) {
    const { data } = supabase.storage.from('project_files').getPublicUrl(filePath)
    return data.publicUrl
  }

  return { files, loading, error, refetch: fetch, upload, remove, getDownloadUrl }
}
