'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ── Types ──────────────────────────────────────────────────────────────────
export type CategorySubtype = 'income' | 'expense' | 'bill' | 'savings' | 'debt'

export type BudgetCategory = {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  subtype: CategorySubtype
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
  account: string | null
  person: string | null
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
  account?: string
  person?: string
}

export type NewCategory = {
  name: string
  type: 'income' | 'expense'
  subtype?: CategorySubtype
  color?: string
  icon?: string
  budget_monthly?: number
}

export type MonthSummary = {
  key: string          // "2026-04"
  label: string        // "Avr."
  income: number
  expense: number
  balance: number
}

// ── Catégories Excel par défaut ────────────────────────────────────────────
export const EXCEL_CATEGORIES: NewCategory[] = [
  // Revenus
  { name:'Le Mixologue',      type:'income',  subtype:'income',  color:'#0E9594', icon:'💼', budget_monthly:2300 },
  // Charges fixes (bills)
  { name:'Loyé & Charges',    type:'expense', subtype:'bill',    color:'#7C6FAF', icon:'🏠', budget_monthly:960  },
  { name:'Gaz & Electricité', type:'expense', subtype:'bill',    color:'#F2542D', icon:'⚡', budget_monthly:100  },
  { name:'Assurance',         type:'expense', subtype:'bill',    color:'#5E9C8F', icon:'🛡', budget_monthly:25   },
  { name:'Mutuel. NG',        type:'expense', subtype:'bill',    color:'#3ABCB8', icon:'🏥', budget_monthly:50   },
  { name:'Internet',          type:'expense', subtype:'bill',    color:'#E8A838', icon:'📡', budget_monthly:45   },
  { name:'Eau',               type:'expense', subtype:'bill',    color:'#9B72CF', icon:'💧', budget_monthly:25   },
  { name:'Frais',             type:'expense', subtype:'bill',    color:'#C45E3E', icon:'🏦', budget_monthly:3.5  },
  { name:'Outils',            type:'expense', subtype:'bill',    color:'#E46A45', icon:'🔧', budget_monthly:75   },
  // Investissement (classé bill car récurrent)
  { name:'Invest',            type:'expense', subtype:'bill',    color:'#0E9594', icon:'📈', budget_monthly:290  },
  // Dépenses variables
  { name:'Course',            type:'expense', subtype:'expense', color:'#F2542D', icon:'🛒', budget_monthly:400  },
  { name:'Restaurant',        type:'expense', subtype:'expense', color:'#E8A838', icon:'🍽', budget_monthly:50   },
  { name:'Vêtements',         type:'expense', subtype:'expense', color:'#7C6FAF', icon:'👕', budget_monthly:50   },
  { name:'Maison',            type:'expense', subtype:'expense', color:'#5E9C8F', icon:'🪴', budget_monthly:50   },
  { name:'Divertissement',    type:'expense', subtype:'expense', color:'#E46A45', icon:'🎮', budget_monthly:100  },
  { name:'Santé',             type:'expense', subtype:'expense', color:'#3ABCB8', icon:'💊', budget_monthly:100  },
  { name:'Mixo Course',       type:'expense', subtype:'expense', color:'#9B72CF', icon:'🍸', budget_monthly:100  },
  { name:'Autres',            type:'expense', subtype:'expense', color:'#C45E3E', icon:'📦', budget_monthly:50   },
  // Épargne
  { name:'Ep. Nath',          type:'expense', subtype:'savings', color:'#0E9594', icon:'💰', budget_monthly:500  },
  { name:'Ep. Rev Nath',      type:'expense', subtype:'savings', color:'#3ABCB8', icon:'💰', budget_monthly:50   },
  { name:'Ep. Couple',        type:'expense', subtype:'savings', color:'#7C6FAF', icon:'💰', budget_monthly:0    },
]

// Comptes bancaires initiaux (localStorage)
export const INITIAL_COMPTES = [
  { id:'argenta',        name:'Argenta',        balance:79.78,   type:'bank',   icon:'🏦' },
  { id:'bnp',            name:'BNP',            balance:43.84,   type:'bank',   icon:'🏛' },
  { id:'rev',            name:'Revolut',        balance:39.35,   type:'bank',   icon:'💳' },
  { id:'argenta_couple', name:'Argenta Couple', balance:221.32,  type:'bank',   icon:'👫' },
  { id:'rev_couple',     name:'Rev Couple',     balance:11.31,   type:'bank',   icon:'💑' },
  { id:'cash_nathan',    name:'Cash Nathan',    balance:1470,    type:'cash',   icon:'💵' },
]

// ── Supabase client ────────────────────────────────────────────────────────
function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useBudget(year: number, month: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories,   setCategories]   = useState<BudgetCategory[]>([])
  const [loading,      setLoading]      = useState(true)

  const monthStr  = `${year}-${String(month).padStart(2,'0')}`
  const dateStart = `${monthStr}-01`
  const dateEnd   = new Date(year, month, 1).toISOString().slice(0,10)

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

  // ── Seed les catégories Excel au premier lancement ─────────────────────
  useEffect(() => {
    async function seedIfEmpty() {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('budget_categories')
        .select('id', { count:'exact', head:true })
        .eq('user_id', user.id)
      if ((count ?? 0) > 0) return
      // Créer les catégories Excel par défaut
      const rows = EXCEL_CATEGORIES.map(c => ({ ...c, user_id: user.id }))
      await supabase.from('budget_categories').insert(rows)
      await fetchAll()
    }
    seedIfEmpty()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── CRUD transactions ──────────────────────────────────────────────────
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

  async function updateTransaction(id: string, updates: Partial<NewTransaction>): Promise<Transaction | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, budget_categories(*)')
      .single()
    if (error || !data) return null
    setTransactions(prev => prev.map(t => t.id === id ? data : t))
    return data
  }

  // ── CRUD catégories ────────────────────────────────────────────────────
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
    setCategories(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateCategory(id: string, updates: Partial<NewCategory>): Promise<BudgetCategory | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('budget_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) return null
    setCategories(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  // ── Computed values ────────────────────────────────────────────────────
  const totalIncome  = transactions.filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0)
  const totalExpense = transactions.filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0)
  const balance      = totalIncome - totalExpense

  // Dépenses variables seulement (pas bills, pas savings)
  const totalVariableExpense = transactions
    .filter(t => t.type==='expense')
    .filter(t => {
      const cat = categories.find(c => c.id === t.budget_category_id)
      return cat?.subtype === 'expense'
    })
    .reduce((s,t) => s+t.amount, 0)

  // Bills payées ce mois
  const totalBills = transactions
    .filter(t => t.type==='expense')
    .filter(t => {
      const cat = categories.find(c => c.id === t.budget_category_id)
      return cat?.subtype === 'bill'
    })
    .reduce((s,t) => s+t.amount, 0)

  // Épargne ce mois
  const totalSavings = transactions
    .filter(t => t.type==='expense')
    .filter(t => {
      const cat = categories.find(c => c.id === t.budget_category_id)
      return cat?.subtype === 'savings'
    })
    .reduce((s,t) => s+t.amount, 0)

  // Budget total des charges fixes
  const totalBillsBudget = categories
    .filter(c => c.subtype === 'bill')
    .reduce((s,c) => s + (c.budget_monthly ?? 0), 0)

  // byCategory (expenses) avec montant dépensé
  const byCategory = categories
    .filter(c => c.type==='expense')
    .map(cat => {
      const spent = transactions
        .filter(t => t.type==='expense' && t.budget_category_id===cat.id)
        .reduce((s,t) => s+t.amount, 0)
      return { ...cat, spent }
    })
    .filter(c => c.spent > 0)
    .sort((a,b) => b.spent-a.spent)

  // dailyData pour le graphique
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyData = Array.from({ length: daysInMonth }, (_,i) => {
    const day = `${monthStr}-${String(i+1).padStart(2,'0')}`
    const income  = transactions.filter(t => t.date===day && t.type==='income').reduce((s,t)=>s+t.amount, 0)
    const expense = transactions.filter(t => t.date===day && t.type==='expense').reduce((s,t)=>s+t.amount, 0)
    return { day: i+1, income, expense }
  })

  return {
    transactions, categories, loading,
    addTransaction, removeTransaction, updateTransaction,
    addCategory, updateCategory,
    totalIncome, totalExpense, balance,
    totalVariableExpense, totalBills, totalBillsBudget, totalSavings,
    byCategory, dailyData,
    refetch: fetchAll,
  }
}

// ── Hook multi-mois (flux de trésorerie 6 mois) ────────────────────────────
export function useMultiMonthSummary(year: number, month: number, count = 6): MonthSummary[] {
  const [data, setData] = useState<MonthSummary[]>([])

  useEffect(() => {
    async function fetch() {
      const supabase = getSupabase()
      // Date de départ : count mois avant le mois actuel
      const startDate = new Date(year, month - 1 - count + 1, 1)
      const endDate   = new Date(year, month, 1)
      const { data: rows } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .gte('date', startDate.toISOString().slice(0,10))
        .lt('date',  endDate.toISOString().slice(0,10))
      if (!rows) return

      // Agréger par mois
      const byMonth: Record<string, { income:number; expense:number }> = {}
      for (const r of rows) {
        const key = (r.date as string).slice(0,7)
        if (!byMonth[key]) byMonth[key] = { income:0, expense:0 }
        if (r.type === 'income') byMonth[key].income += r.amount
        else byMonth[key].expense += r.amount
      }

      // Construire le tableau des count derniers mois
      const result: MonthSummary[] = []
      for (let i = count - 1; i >= 0; i--) {
        const d   = new Date(year, month - 1 - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const lbl = d.toLocaleDateString('fr-FR', { month:'short' })
        const m   = byMonth[key] ?? { income:0, expense:0 }
        result.push({ key, label: lbl.replace('.',''), income: m.income, expense: m.expense, balance: m.income - m.expense })
      }
      setData(result)
    }
    fetch()
  }, [year, month, count])

  return data
}
