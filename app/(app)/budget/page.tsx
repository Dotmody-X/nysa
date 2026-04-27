'use client'

import { useState } from 'react'
import { Plus, X, Trash2, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useBudget, NewTransaction } from '@/hooks/useBudget'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

function fmt(n: number) {
  return n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
}

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const DEFAULT_COLORS = ['#F2542D','#0E9594','#F5DFBB','#562C2C','#11686A','#888','#e67e22','#9b59b6']

export default function BudgetPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const {
    transactions, categories, loading,
    addTransaction, removeTransaction,
    totalIncome, totalExpense, balance,
    byCategory, dailyData,
  } = useBudget(year, month)

  // Form state
  const [tab,     setTab]     = useState<'expense' | 'income'>('expense')
  const [form,    setForm]    = useState({ amount: '', description: '', date: now.toISOString().slice(0,10), budget_category_id: '' })
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Category modal
  const [catModal, setCatModal] = useState(false)
  const [catForm,  setCatForm]  = useState({ name: '', type: 'expense' as 'income'|'expense', color: '#F2542D', budget_monthly: '' })

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  async function handleAdd() {
    if (!form.amount || parseFloat(form.amount) <= 0) return
    setSaving(true)
    const t: NewTransaction = {
      amount: parseFloat(form.amount),
      type: tab,
      description: form.description || undefined,
      date: form.date,
      budget_category_id: form.budget_category_id || undefined,
    }
    await addTransaction(t)
    setForm(f => ({ ...f, amount: '', description: '', budget_category_id: '' }))
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await removeTransaction(id)
    setDeleting(null)
  }

  // Chart data — last 15 days with activity
  const chartData = dailyData.filter(d => d.income > 0 || d.expense > 0)

  const catColors: Record<string, string> = {}
  categories.forEach((c, i) => { catColors[c.id] = c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] })

  const expenseCats  = categories.filter(c => c.type === 'expense')
  const incomeCats   = categories.filter(c => c.type === 'income')
  const relevantCats = tab === 'expense' ? expenseCats : incomeCats

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <PageHeader
        title="Budget"
        sub="Transactions · Catégories · Rapport mensuel"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setCatModal(true)}>
            <Plus size={13} /> Catégorie
          </Button>
        }
      />

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronLeft size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--wheat)' }}>{MONTH_NAMES[month-1]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-[6px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: '#0E9594' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Revenus</span>
          </div>
          <p className="text-2xl font-black" style={{ color: '#0E9594' }}>{fmt(totalIncome)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} style={{ color: '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Dépenses</span>
          </div>
          <p className="text-2xl font-black" style={{ color: '#F2542D' }}>{fmt(totalExpense)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} style={{ color: balance >= 0 ? '#0E9594' : '#F2542D' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Solde</span>
          </div>
          <p className="text-2xl font-black" style={{ color: balance >= 0 ? '#0E9594' : '#F2542D' }}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">

        {/* Left col */}
        <div className="flex flex-col gap-5">

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Activité du mois</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barGap={2}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'var(--text-muted)' }}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Bar dataKey="income"  fill="#0E9594" radius={[3,3,0,0]} name="Revenus" />
                  <Bar dataKey="expense" fill="#F2542D" radius={[3,3,0,0]} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Dépenses par catégorie */}
          {byCategory.length > 0 && (
            <Card>
              <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Dépenses par catégorie</p>
              <div className="flex flex-col gap-2">
                {byCategory.map((cat, i) => {
                  const pct = totalExpense > 0 ? (cat.spent / totalExpense) * 100 : 0
                  const color = cat.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                  return (
                    <div key={cat.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-xs" style={{ color: 'var(--wheat)' }}>{cat.name}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color }}>{fmt(cat.spent)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Transactions list */}
          <Card padding="none">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Transactions ({transactions.length})
              </p>
            </div>
            {loading ? (
              <p className="text-xs p-4" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs p-4" style={{ color: 'var(--text-muted)' }}>Aucune transaction ce mois-ci.</p>
            ) : transactions.map(tx => {
              const cat = tx.budget_categories
              const color = cat?.color ?? (tx.type === 'income' ? '#0E9594' : '#F2542D')
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--wheat)' }}>
                      {tx.description || cat?.name || (tx.type === 'income' ? 'Revenu' : 'Dépense')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })}
                      {cat ? ` · ${cat.name}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: tx.type === 'income' ? '#0E9594' : '#F2542D' }}>
                    {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    className="flex-shrink-0 opacity-30 hover:opacity-80 transition-opacity"
                  >
                    <Trash2 size={11} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              )
            })}
          </Card>
        </div>

        {/* Right col — form */}
        <div className="flex flex-col gap-4">
          <Card>
            {/* Tabs */}
            <div className="flex gap-0 mb-4 rounded-[8px] overflow-hidden p-1" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all"
                  style={{ background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? (t === 'income' ? '#0E9594' : '#F2542D') : 'var(--text-muted)' }}>
                  {t === 'income' ? '＋ Revenu' : '－ Dépense'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Montant (€) *</label>
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Loyer, courses…"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
                <select value={form.budget_category_id}
                  onChange={e => setForm(f => ({ ...f, budget_category_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
                  <option value="">— Aucune —</option>
                  {relevantCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}
                />
              </div>
              <Button variant="primary" size="sm" loading={saving} onClick={handleAdd} className="w-full justify-center">
                <Plus size={13} /> Ajouter
              </Button>
            </div>
          </Card>

          {/* Categories list */}
          {categories.length > 0 && (
            <Card padding="none">
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Catégories</p>
              </div>
              {categories.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
                  <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--wheat)' }}>{c.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: c.type === 'income' ? '#0E9594' + '22' : '#F2542D' + '22', color: c.type === 'income' ? '#0E9594' : '#F2542D' }}>
                    {c.type === 'income' ? 'revenu' : 'dépense'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Category modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setCatModal(false)}>
          <div className="w-full max-w-xs rounded-[14px] p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--wheat)' }}>Nouvelle catégorie</p>
              <button onClick={() => setCatModal(false)}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Nom *</label>
                <input autoFocus type="text" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Loyer, Salaire…"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                <select value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value as 'income'|'expense' }))}
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }}>
                  <option value="expense">Dépense</option>
                  <option value="income">Revenu</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{catForm.color}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Budget mensuel (€)</label>
                <input type="number" min="0" step="0.01" value={catForm.budget_monthly}
                  onChange={e => setCatForm(f => ({ ...f, budget_monthly: e.target.value }))}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-[8px] text-sm outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setCatModal(false)}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={async () => {
                if (!catForm.name.trim()) return
                await (async () => {
                  const supabase = (await import('@/lib/supabase/client')).createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  await supabase.from('budget_categories').insert({
                    name: catForm.name,
                    type: catForm.type,
                    color: catForm.color,
                    budget_monthly: catForm.budget_monthly ? parseFloat(catForm.budget_monthly) : null,
                    user_id: user.id,
                  })
                })()
                setCatModal(false)
                window.location.reload()
              }}>Créer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
