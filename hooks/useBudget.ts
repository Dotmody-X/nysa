'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type BudgetCategory = {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string | null
  icon: string | null
  budget_monthly: number | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  budget_category_id: string | null
  amount: number
  type: 'income' | 'expense'
  description: string | null
  date: string
  is_recurring: boolean
  created_at: string
  budget_categories?: BudgetCategory | null
}

export type NewTransaction = {
  amount: number
  type: 'income' | 'expense'
  description?: string
  date: string
  budget_category_id?: string
  is_recurring?: boolean
}

export type NewCategory = {
  name: string
  type: 'income' | 'expense'
  color?: string
  budget_monthly?: number
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useBudget(year: number, month: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories]     = useState<BudgetCategory[]>([])
  const [loading, setLoading]           = useState(true)

  const monthStr  = `${year}-${String(month).padStart(2, '0')}`
  const dateStart = `${monthStr}-01`
  const dateEnd   = new Date(year, month, 1).toISOString().slice(0, 10)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const [{ data: tx }, { data: cats }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, budget_categories(*)')
        .gte('date', dateStart)
        .lt('date', dateEnd)
        .order('date', { ascending: false }),
      supabase
        .from('budget_categories')
        .select('*')
        .order('name', { ascending: true }),
    ])
    setTransactions(tx ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addTransaction(t: NewTransaction): Promise<Transaction | null> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...t, user_id: user.id })
      .select('*, budget_categories(*)')
      .single()
    if (error || !data) return null
    setTransactions(prev => [data, ...prev])
    return data
  }

  async function removeTransaction(id: string) {
    const supabase = getSupabase()
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function addCategory(c: NewCategory): Promise<BudgetCategory | null> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('budget_categories')
      .insert({ ...c, user_id: user.id })
      .select()
      .single()
    if (error || !data) return null
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance      = totalIncome - totalExpense

  const byCategory = categories
    .filter(c => c.type === 'expense')
    .map(cat => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.budget_category_id === cat.id)
        .reduce((s, t) => s + t.amount, 0)
      return { ...cat, spent }
    })
    .filter(c => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)

  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = `${monthStr}-${String(i + 1).padStart(2, '0')}`
    const income  = transactions.filter(t => t.date === day && t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.date === day && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { day: i + 1, income, expense }
  })

  return {
    transactions, categories, loading,
    addTransaction, removeTransaction, addCategory,
    totalIncome, totalExpense, balance,
    byCategory, dailyData,
  }
}
