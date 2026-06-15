'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const pad2 = (n: number) => String(n).padStart(2, '0')
// Formate une Date en 'YYYY-MM-DD' en heure LOCALE (évite le décalage UTC).
const ymdLocal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

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
  { name:'Le Mixologue',      type:'income',  subtype:'income',  color:'var(--azul)', icon:'💼', budget_monthly:2300 },
  // Charges fixes (bills)
  { name:'Loyé & Charges',    type:'expense', subtype:'bill',    color:'#7C6FAF', icon:'🏠', budget_monthly:960  },
  { name:'Gaz & Electricité', type:'expense', subtype:'bill',    color:'var(--accent-budget)', icon:'⚡', budget_monthly:100  },
  { name:'Assurance',         type:'expense', subtype:'bill',    color:'#5E9C8F', icon:'🛡', budget_monthly:25   },
  { name:'Mutuel. NG',        type:'expense', subtype:'bill',    color:'#3ABCB8', icon:'🏥', budget_monthly:50   },
  { name:'Internet',          type:'expense', subtype:'bill',    color:'#E8A838', icon:'📡', budget_monthly:45   },
  { name:'Eau',               type:'expense', subtype:'bill',    color:'#9B72CF', icon:'💧', budget_monthly:25   },
  { name:'Frais',             type:'expense', subtype:'bill',    color:'#C45E3E', icon:'🏦', budget_monthly:3.5  },
  { name:'Outils',            type:'expense', subtype:'bill',    color:'#E46A45', icon:'🔧', budget_monthly:75   },
  // Investissement (classé bill car récurrent)
  { name:'Invest',            type:'expense', subtype:'bill',    color:'var(--azul)', icon:'📈', budget_monthly:290  },
  // Dépenses variables
  { name:'Course',            type:'expense', subtype:'expense', color:'var(--accent-budget)', icon:'🛒', budget_monthly:400  },
  { name:'Restaurant',        type:'expense', subtype:'expense', color:'#E8A838', icon:'🍽', budget_monthly:50   },
  { name:'Vêtements',         type:'expense', subtype:'expense', color:'#7C6FAF', icon:'👕', budget_monthly:50   },
  { name:'Maison',            type:'expense', subtype:'expense', color:'#5E9C8F', icon:'🪴', budget_monthly:50   },
  { name:'Divertissement',    type:'expense', subtype:'expense', color:'#E46A45', icon:'🎮', budget_monthly:100  },
  { name:'Santé',             type:'expense', subtype:'expense', color:'#3ABCB8', icon:'💊', budget_monthly:100  },
  { name:'Mixo Course',       type:'expense', subtype:'expense', color:'#9B72CF', icon:'🍸', budget_monthly:100  },
  { name:'Autres',            type:'expense', subtype:'expense', color:'#C45E3E', icon:'📦', budget_monthly:50   },
  // Épargne
  { name:'Ep. Nath',          type:'expense', subtype:'savings', color:'var(--azul)', icon:'💰', budget_monthly:500  },
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
/**
 * @param sharedCategories — pour le mois précédent (ou tout calcul auxiliaire),
 *   on injecte les catégories déjà chargées par l'instance principale afin
 *   d'éviter une requête `budget_categories` redondante à chaque rendu.
 */
export function useBudget(year: number, month: number, sharedCategories?: BudgetCategory[]) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [ownCategories, setOwnCategories] = useState<BudgetCategory[]>([])
  const [loading,      setLoading]      = useState(true)

  const usesShared = sharedCategories !== undefined
  const categories = sharedCategories ?? ownCategories

  const monthStr  = `${year}-${pad2(month)}`
  const dateStart = `${monthStr}-01`
  // Premier jour du mois suivant, en chaîne locale (pas de conversion UTC)
  const dateEnd   = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const txReq = supabase
      .from('transactions')
      .select('*, budget_categories(*)')
      .gte('date', dateStart)
      .lt('date', dateEnd)
      .order('date', { ascending: false })

    if (usesShared) {
      const { data: tx } = await txReq
      setTransactions(tx ?? [])
    } else {
      const [{ data: tx }, { data: cats }] = await Promise.all([
        txReq,
        supabase.from('budget_categories').select('*').order('name', { ascending: true }),
      ])
      setTransactions(tx ?? [])
      setOwnCategories(cats ?? [])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr, usesShared])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Pas de pré-remplissage : l'utilisateur crée ses propres catégories.
  // (EXCEL_CATEGORIES reste exporté comme modèles optionnels à proposer dans
  //  l'UI, mais rien n'est inséré automatiquement → "rien de déjà noté".)

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
    setOwnCategories(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
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
    setOwnCategories(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  // ── Computed values (mémoïsé : un seul passage O(n) sur les transactions) ──
  const computed = useMemo(() => {
    const catById = new Map(categories.map(c => [c.id, c]))

    // Cumuls en une passe
    let totalIncome = 0, totalExpense = 0
    let totalVariableExpense = 0, totalBills = 0, totalSavings = 0
    const spentByCategory: Record<string, number> = {}
    const byDay: Record<string, { income: number; expense: number }> = {}

    for (const t of transactions) {
      if (t.type === 'income') totalIncome += t.amount
      else {
        totalExpense += t.amount
        if (t.budget_category_id) {
          spentByCategory[t.budget_category_id] = (spentByCategory[t.budget_category_id] ?? 0) + t.amount
          const sub = catById.get(t.budget_category_id)?.subtype
          if (sub === 'expense') totalVariableExpense += t.amount
          else if (sub === 'bill') totalBills += t.amount
          else if (sub === 'savings') totalSavings += t.amount
        }
      }
      const d = byDay[t.date] ?? (byDay[t.date] = { income: 0, expense: 0 })
      if (t.type === 'income') d.income += t.amount; else d.expense += t.amount
    }

    const totalBillsBudget = categories
      .filter(c => c.subtype === 'bill')
      .reduce((s, c) => s + (c.budget_monthly ?? 0), 0)

    const byCategory = categories
      .filter(c => c.type === 'expense')
      .map(cat => ({ ...cat, spent: spentByCategory[cat.id] ?? 0 }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)

    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const e = byDay[`${monthStr}-${pad2(i + 1)}`] ?? { income: 0, expense: 0 }
      return { day: i + 1, income: e.income, expense: e.expense }
    })

    return {
      totalIncome, totalExpense, balance: totalIncome - totalExpense,
      totalVariableExpense, totalBills, totalSavings, totalBillsBudget,
      byCategory, dailyData, spentByCategory,
    }
  }, [transactions, categories, monthStr, year, month])

  return {
    transactions, categories, loading,
    addTransaction, removeTransaction, updateTransaction,
    addCategory, updateCategory,
    ...computed,
    refetch: fetchAll,
  }
}

// ── Hook multi-mois (flux de trésorerie 6 mois) ────────────────────────────
export function useMultiMonthSummary(year: number, month: number, count = 6): MonthSummary[] {
  const [data, setData] = useState<MonthSummary[]>([])

  useEffect(() => {
    async function fetch() {
      const supabase = getSupabase()
      // Bornes en chaîne locale (pas de conversion UTC qui décale d'un jour)
      const startDate = new Date(year, month - 1 - count + 1, 1)
      const endDate   = new Date(year, month, 1) // 1er du mois suivant
      const { data: rows } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .gte('date', ymdLocal(startDate))
        .lt('date',  ymdLocal(endDate))
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
