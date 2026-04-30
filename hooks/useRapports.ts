'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type RapportPeriod = 'week' | 'month' | '3months' | 'year'

export type ProjectStat = {
  project_id: string | null
  project_name: string
  color: string
  total_seconds: number
  billable_seconds: number
  entries_count: number
}

export type DayStat = {
  date: string
  label: string
  seconds: number
  tasks_done: number
}

export type RapportData = {
  // Time
  totalSeconds: number
  billableSeconds: number
  projectStats: ProjectStat[]
  dailyStats: DayStat[]
  // Tasks
  tasksDone: number
  tasksTotal: number
  tasksLate: number
  // Budget
  totalIncome: number
  totalExpense: number
  // Health
  totalRuns: number
  totalKm: number
  latestWeight: number | null
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getRange(period: RapportPeriod, ref: Date): { start: string; end: string; days: number } {
  if (period === 'week') {
    const day = ref.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(ref)
    mon.setDate(ref.getDate() + diff)
    mon.setHours(0, 0, 0, 0)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 7)
    return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10), days: 7 }
  }
  if (period === 'month') {
    const start = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
    const end = endDate.toISOString().slice(0, 10)
    const days = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
    return { start, end, days }
  }
  if (period === '3months') {
    const endD = new Date(ref)
    endD.setDate(endD.getDate() + 1)
    const startD = new Date(ref)
    startD.setDate(ref.getDate() - 89)
    return { start: startD.toISOString().slice(0, 10), end: endD.toISOString().slice(0, 10), days: 90 }
  }
  // year
  const year = ref.getFullYear()
  const startD = new Date(year, 0, 1)
  const endD   = new Date(year + 1, 0, 1)
  const days   = Math.ceil((endD.getTime() - startD.getTime()) / 86400000)
  return { start: `${year}-01-01`, end: endD.toISOString().slice(0, 10), days }
}

export function useRapports(period: RapportPeriod, ref: Date) {
  const [data, setData]       = useState<RapportData | null>(null)
  const [loading, setLoading] = useState(true)

  const { start, end, days } = getRange(period, ref)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()

    const [
      { data: timeEntries },
      { data: projects },
      { data: tasks },
      { data: transactions },
      { data: runs },
      { data: weights },
    ] = await Promise.all([
      supabase.from('time_entries').select('*').gte('started_at', start + 'T00:00:00').lt('started_at', end + 'T00:00:00'),
      supabase.from('projects').select('id, name, color'),
      supabase.from('tasks').select('id, status, due_date, completed_at').gte('created_at', start + 'T00:00:00').lt('created_at', end + 'T23:59:59'),
      supabase.from('transactions').select('amount, type').gte('date', start).lt('date', end),
      supabase.from('running_activities').select('date, distance_km, duration_seconds').gte('date', start).lt('date', end),
      supabase.from('health_metrics').select('date, weight_kg').order('date', { ascending: false }).limit(1),
    ])

    const projectMap: Record<string, { name: string; color: string }> = {}
    ;(projects ?? []).forEach(p => { projectMap[p.id] = { name: p.name, color: p.color ?? '#F2542D' } })

    // ── Time ──
    const entries          = timeEntries ?? []
    const totalSeconds     = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
    const billableSeconds  = entries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

    const projectStatsMap: Record<string, ProjectStat> = {}
    entries.forEach(e => {
      const key = e.project_id ?? '__none__'
      if (!projectStatsMap[key]) {
        const proj = e.project_id ? projectMap[e.project_id] : null
        projectStatsMap[key] = {
          project_id:       e.project_id,
          project_name:     proj?.name ?? 'Sans projet',
          color:            proj?.color ?? '#888',
          total_seconds:    0,
          billable_seconds: 0,
          entries_count:    0,
        }
      }
      projectStatsMap[key].total_seconds    += e.duration_seconds ?? 0
      projectStatsMap[key].billable_seconds += e.is_billable ? (e.duration_seconds ?? 0) : 0
      projectStatsMap[key].entries_count    += 1
    })
    const projectStats = Object.values(projectStatsMap).sort((a, b) => b.total_seconds - a.total_seconds)

    // ── Daily stats ──
    const dailyStats: DayStat[] = Array.from({ length: days }, (_, i) => {
      const d = new Date(start + 'T12:00:00')
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      let label: string
      if (period === 'week') {
        label = d.toLocaleDateString('fr-BE', { weekday: 'short' })
      } else if (period === 'month') {
        label = String(i + 1)
      } else if (period === '3months') {
        label = i % 7 === 0 ? `S${Math.floor(i / 7) + 1}` : ''
      } else {
        label = i % 30 === 0 ? d.toLocaleDateString('fr-FR', { month: 'short' }) : ''
      }
      const seconds = entries
        .filter(e => e.started_at?.slice(0, 10) === dateStr)
        .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
      const tasks_done = (tasks ?? [])
        .filter(t => t.completed_at?.slice(0, 10) === dateStr).length
      return { date: dateStr, label, seconds, tasks_done }
    })

    // ── Tasks ──
    const allTasks   = tasks ?? []
    const tasksDone  = allTasks.filter(t => t.status === 'done').length
    const tasksTotal = allTasks.length
    const today      = new Date().toISOString().slice(0, 10)
    const tasksLate  = allTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length

    // ── Budget ──
    const txs         = transactions ?? []
    const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    // ── Health ──
    const runList      = runs ?? []
    const totalRuns    = runList.length
    const totalKm      = runList.reduce((s, r) => s + (r.distance_km ?? 0), 0)
    const latestWeight = weights?.[0]?.weight_kg ?? null

    setData({
      totalSeconds, billableSeconds, projectStats, dailyStats,
      tasksDone, tasksTotal, tasksLate,
      totalIncome, totalExpense,
      totalRuns, totalKm, latestWeight,
    })
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, days, period])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { data, loading, range: { start, end } }
}
