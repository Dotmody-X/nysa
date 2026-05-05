'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type DashboardData = {
  // Today tasks
  todayTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    due_time: string | null
    project_id: string | null
    project_name: string | null
    project_color: string | null
    estimated_minutes: number | null
  }>
  lateTasks: number
  urgentTasks: number
  // Today time entries
  todayEntries: Array<{
    id: string
    description: string | null
    project_id: string | null
    project_name: string | null
    project_color: string | null
    duration_seconds: number | null
    is_billable: boolean
    started_at: string
  }>
  todaySeconds: number
  weekSeconds: number
  // Active projects
  activeProjects: Array<{
    id: string
    name: string
    color: string
    progress: number
    deadline: string | null
    status: string
  }>
  // Today events
  todayEvents: Array<{
    id: string
    title: string
    start_at: string
    end_at: string
    category: string | null
    color: string | null
  }>
  // Health
  latestWeight: number | null
  lastRun: { distance_km: number; duration_seconds: number | null; date: string } | null
  // Budget (current month)
  monthIncome: number
  monthExpense: number
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useDashboard() {
  const [data, setData]     = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const supabase = getSupabase()
      const now      = new Date()
      const todayStr = now.toISOString().slice(0, 10)

      // Week boundaries (Mon–Sun)
      const dayOfWeek = now.getDay()
      const diffMon   = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monDate   = new Date(now); monDate.setDate(now.getDate() + diffMon); monDate.setHours(0,0,0,0)
      const sunDate   = new Date(monDate); sunDate.setDate(monDate.getDate() + 7)

      // Month boundaries
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
      const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 1).toISOString().slice(0,10)

      const [
        { data: tasks },
        { data: projects },
        { data: todayEntriesRaw },
        { data: weekEntriesRaw },
        { data: events },
        { data: weights },
        { data: runs },
        { data: transactions },
      ] = await Promise.all([
        supabase.from('tasks').select('id,title,status,priority,due_date,due_time,project_id,estimated_minutes')
          .eq('due_date', todayStr).neq('status', 'cancelled'),
        supabase.from('projects').select('id,name,color,progress,deadline,status').eq('status', 'active').order('deadline', { ascending: true }),
        supabase.from('time_entries').select('id,description,project_id,duration_seconds,is_billable,started_at')
          .gte('started_at', todayStr + 'T00:00:00').lt('started_at', todayStr + 'T23:59:59').order('started_at', { ascending: false }),
        supabase.from('time_entries').select('duration_seconds')
          .gte('started_at', monDate.toISOString()).lt('started_at', sunDate.toISOString()),
        supabase.from('events').select('id,title,start_at,end_at,category,color')
          .gte('start_at', todayStr + 'T00:00:00').lt('start_at', todayStr + 'T23:59:59').order('start_at', { ascending: true }),
        supabase.from('health_metrics').select('weight_kg').order('date', { ascending: false }).limit(1),
        supabase.from('running_activities').select('date,distance_km,duration_seconds').order('date', { ascending: false }).limit(1),
        supabase.from('transactions').select('amount,type').gte('date', monthStart).lt('date', monthEnd),
      ])

      // Build project map
      const projectMap: Record<string, { name: string; color: string }> = {}
      ;(projects ?? []).forEach(p => { projectMap[p.id] = { name: p.name, color: p.color ?? '#F2542D' } })

      // Tasks for today
      const todayTasks = (tasks ?? []).map(t => ({
        ...t,
        project_name:  t.project_id ? (projectMap[t.project_id]?.name ?? null) : null,
        project_color: t.project_id ? (projectMap[t.project_id]?.color ?? null) : null,
      }))

      const allTasks = tasks ?? []
      const lateTasks   = allTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length
      const urgentTasks = allTasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length

      // Time entries today
      const todayEntries = (todayEntriesRaw ?? []).map(e => ({
        ...e,
        project_name:  e.project_id ? (projectMap[e.project_id]?.name ?? null) : null,
        project_color: e.project_id ? (projectMap[e.project_id]?.color ?? null) : null,
      }))
      const todaySeconds = todayEntries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
      const weekSeconds  = (weekEntriesRaw ?? []).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

      // Health
      const latestWeight = weights?.[0]?.weight_kg ?? null
      const lastRun      = runs?.[0] ?? null

      // Budget
      const txs         = transactions ?? []
      const monthIncome  = txs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0)
      const monthExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      setData({
        todayTasks,
        lateTasks,
        urgentTasks,
        todayEntries,
        todaySeconds,
        weekSeconds,
        activeProjects: projects ?? [],
        todayEvents: events ?? [],
        latestWeight,
        lastRun,
        monthIncome,
        monthExpense,
      })
      setLoading(false)
    }
    fetch()
  }, [])

  return { data, loading }
}
