'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useDailyNote — note libre du jour (table public.notes).
// Réutilise le client Supabase authentifié existant (RLS : chacun ne voit/écrit
// que ses propres notes ; user_id se remplit via auth.uid()). Aucune clé service.
// Charge la note du jour, sauvegarde en UPSERT avec debounce, expose l'historique.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NoteHistoryItem { note_date: string; content: string }

// Date locale au format YYYY-MM-DD (cohérent avec le reste de l'app).
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useDailyNote() {
  const [content, setContentState] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedAt, setSavedAt]   = useState<Date | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const [history, setHistory]               = useState<NoteHistoryItem[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded   = useRef(false)   // n'auto-sauve qu'après le chargement initial
  const date     = todayStr()

  // ── Chargement de la note d'aujourd'hui ──
  useEffect(() => {
    let active = true
    ;(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes').select('content').eq('note_date', date).maybeSingle()
      if (!active) return
      if (error) setError(error.message)
      else if (data?.content) setContentState(data.content)
      setLoading(false)
      loaded.current = true
    })()
    return () => { active = false; if (timer.current) clearTimeout(timer.current) }
  }, [date])

  // ── Sauvegarde (UPSERT sur user_id+note_date) ──
  const save = useCallback(async (value: string) => {
    setSaving(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('notes')
      .upsert({ note_date: date, content: value }, { onConflict: 'user_id,note_date' })
    if (error) setError(error.message)
    else setSavedAt(new Date())
    setSaving(false)
  }, [date])

  // ── Frappe → debounce 800 ms ──
  const setContent = useCallback((value: string) => {
    setContentState(value)
    if (!loaded.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(value), 800)
  }, [save])

  // ── Historique repliable (14 derniers jours antérieurs) ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notes').select('note_date, content')
      .lt('note_date', date).order('note_date', { ascending: false }).limit(14)
    if (!error) setHistory((data as NoteHistoryItem[] | null) ?? [])
    setHistoryLoading(false)
  }, [date])

  return { content, setContent, loading, saving, savedAt, error, history, historyLoading, loadHistory }
}
