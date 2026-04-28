'use client'
import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useBudget, type NewTransaction, type NewCategory } from '@/hooks/useBudget'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
function fmtEur(n: number) { return n.toLocaleString('fr-BE', { style:'currency', currency:'EUR', minimumFractionDigits:0 }) }

export default function BudgetPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { transactions, categories, loading, addTransaction, addCategory } = useBudget(year, month)
  const [tab, setTab] = useState<'transactions'|'categories'|'objectifs'>('transactions')
  const [showTxForm, setShowTxForm] = useState(false)
  const [txForm, setTxForm] = useState<NewTransaction>({ amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'' })

  const income   = transactions.filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0)
  const expense  = transactions.filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0)
  const balance  = income - expense
  const savings  = income > 0 ? Math.round(balance/income*100) : 0

  const byCategory = categories.map(cat => ({
    ...cat,
    total: transactions.filter(t => t.budget_category_id === cat.id).reduce((s,t) => s+t.amount, 0),
  })).filter(c => c.total > 0).sort((a,b) => b.total-a.total)

  const monthName = new Date(year, month-1, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })

  function prevMonth() { if (month===1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  function nextMonth() { if (month===12) { setMonth(1); setYear(y=>y+1) } else setMonth(m=>m+1) }

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount) return
    await addTransaction(txForm)
    setShowTxForm(false); setTxForm({ amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'' })
  }

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle
        title="Budget"
        sub="Mensuel · Trimestiel · Prévision · Analyse"
        right={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} style={{ padding:'6px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-muted)', fontSize:12 }}>←</button>
            <span style={{ ...DF, fontWeight:700, fontSize:12, color:'var(--wheat)', textTransform:'capitalize', minWidth:120, textAlign:'center' }}>{monthName}</span>
            <button onClick={nextMonth} style={{ padding:'6px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-muted)', fontSize:12 }}>→</button>
            <button onClick={()=>setShowTxForm(!showTxForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background:'#F2542D', color:'#fff', ...DF, fontWeight:700, fontSize:12 }}>
              <Plus size={14} /> Transaction
            </button>
          </div>
        }
      />

      <KpiGrid>
        <KpiCard label="Dépenses du mois"  value={fmtEur(expense)}   sub={`${byCategory.length} catégorie${byCategory.length!==1?'s':''}`} color="#F2542D" />
        <KpiCard label="Revenus du mois"   value={fmtEur(income)}    sub={`${transactions.filter(t=>t.type==='income').length} transactions`} color="#0E9594" />
        <KpiCard label="Trésorerie"        value={fmtEur(balance)}   sub={balance>=0?'Positif':'Négatif'} color={balance>=0?'#0E9594':'#F2542D'} />
        <KpiCard label="Taux d'épargne"    value={`${savings} %`}    sub="du revenu" color="#F5DFBB" />
      </KpiGrid>

      {/* Add tx form */}
      {showTxForm && (
        <form onSubmit={handleAddTx} className="flex gap-2 flex-wrap p-4 rounded-xl" style={{ background:'var(--bg-card)', border:'1px solid var(--border-active)' }}>
          <select value={txForm.type} onChange={e=>setTxForm(f=>({...f,type:e.target.value as 'income'|'expense'}))}
            style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:12 }}>
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>
          <input type="number" min="0" step="0.01" value={txForm.amount||''} onChange={e=>setTxForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} placeholder="Montant (€)" autoFocus
            style={{ width:130, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <input type="text" value={txForm.description||''} onChange={e=>setTxForm(f=>({...f,description:e.target.value}))} placeholder="Description…"
            style={{ flex:1, minWidth:160, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 }} />
          <input type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))}
            style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:12 }} />
          <select value={txForm.budget_category_id||''} onChange={e=>setTxForm(f=>({...f,budget_category_id:e.target.value||undefined}))}
            style={{ background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:12 }}>
            <option value="">Catégorie…</option>
            {categories.filter(c=>c.type===txForm.type).map(c=>(
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" style={{ background:'#F2542D', color:'#fff', borderRadius:8, padding:'8px 20px', ...DF, fontWeight:700, fontSize:12 }}>Ajouter</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Left+Center — main content */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          {/* Répartition dépenses */}
          <div style={{ background:'#11686A', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F0E4CC', textTransform:'uppercase', marginBottom:16 }}>Répartition des dépenses</p>
            {loading ? <p style={{ color:'rgba(240,228,204,0.5)', fontSize:12 }}>Chargement…</p>
            : byCategory.filter(c=>c.type==='expense').length === 0 ? (
              <p style={{ color:'rgba(240,228,204,0.5)', fontSize:12 }}>Aucune dépense ce mois</p>
            ) : (
              byCategory.filter(c=>c.type==='expense').slice(0,6).map(cat => {
                const pct = expense > 0 ? Math.round(cat.total/expense*100) : 0
                return (
                  <div key={cat.id} className="flex items-center gap-3 mb-3">
                    <div style={{ width:8, height:8, borderRadius:2, background:cat.color??'#F2542D', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'#F0E4CC', flex:1 }}>{cat.name}</span>
                    <span style={{ ...DF, fontSize:11, fontWeight:700, color:'#F0E4CC', width:60, textAlign:'right' }}>{fmtEur(cat.total)}</span>
                    <div style={{ width:80, height:4, borderRadius:99, background:'rgba(240,228,204,0.15)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, background: cat.color??'#F2542D', width:`${pct}%` }} />
                    </div>
                    <span style={{ fontSize:10, color:'rgba(240,228,204,0.6)', width:28, textAlign:'right' }}>{pct}%</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Transactions récentes */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Récentes transactions</p>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>{transactions.length} ce mois</span>
            </div>
            {loading ? <p className="p-5 text-xs" style={{ color:'var(--text-muted)' }}>Chargement…</p>
            : transactions.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune transaction ce mois</p>
                <button onClick={()=>setShowTxForm(true)} style={{ fontSize:11, color:'#F2542D', ...DF, fontWeight:700 }}>+ Ajouter</button>
              </div>
            ) : transactions.slice(0,10).map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background: tx.type==='income' ? 'rgba(14,149,148,0.15)' : 'rgba(242,84,45,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {tx.type==='income' ? <TrendingUp size={14} style={{ color:'#0E9594' }} /> : <TrendingDown size={14} style={{ color:'#F2542D' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize:13, color:'var(--wheat)' }}>{tx.description || 'Sans description'}</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>
                    {tx.budget_categories?.name ?? 'Autre'} · {new Date(tx.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                  </p>
                </div>
                <p style={{ ...DF, fontWeight:800, fontSize:15, color: tx.type==='income' ? '#0E9594' : '#F2542D', flexShrink:0 }}>
                  {tx.type==='income' ? '+' : '-'}{fmtEur(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-[10px]">
          {/* Synthèse */}
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Bilan du mois</p>
            <p style={{ ...DF, fontWeight:900, fontSize:36, color:'#1A0A0A', lineHeight:1 }}>{fmtEur(balance)}</p>
            <p style={{ fontSize:11, color:'rgba(26,10,10,0.7)', marginBottom:12 }}>{balance>=0?'Excédent':'Déficit'} ce mois</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span style={{ fontSize:11, color:'rgba(26,10,10,0.7)' }}>Revenus</span>
                <span style={{ ...DF, fontWeight:700, fontSize:12, color:'#1A0A0A' }}>{fmtEur(income)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize:11, color:'rgba(26,10,10,0.7)' }}>Dépenses</span>
                <span style={{ ...DF, fontWeight:700, fontSize:12, color:'#1A0A0A' }}>{fmtEur(expense)}</span>
              </div>
              {income > 0 && (
                <>
                  <div style={{ height:5, borderRadius:99, background:'rgba(0,0,0,0.2)', marginTop:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${Math.min(100,expense/income*100)}%` }} />
                  </div>
                  <p style={{ fontSize:9, color:'rgba(26,10,10,0.6)', textAlign:'right' }}>{Math.round(expense/income*100)}% du revenu dépensé</p>
                </>
              )}
            </div>
          </div>

          {/* Comptes */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:10 }}>Catégories revenus</p>
            {loading ? <p style={{ fontSize:12, color:'var(--text-muted)' }}>…</p>
            : byCategory.filter(c=>c.type==='income').length === 0 ? (
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucun revenu ce mois</p>
            ) : byCategory.filter(c=>c.type==='income').map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-2.5" style={{ borderBottom:'1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ width:7, height:7, borderRadius:2, background:cat.color??'#0E9594', flexShrink:0 }} />
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{cat.name}</span>
                </div>
                <span style={{ ...DF, fontWeight:700, fontSize:13, color:'#0E9594' }}>{fmtEur(cat.total)}</span>
              </div>
            ))}
          </div>

          {/* Objectifs financiers */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:10 }}>Objectifs financiers</p>
            {[
              { label:'Épargne mensuelle', target:500, current:Math.max(0,balance) },
              { label:'Budget courses',    target:300, current:byCategory.find(c=>c.name?.toLowerCase().includes('course'))?.total??0 },
            ].map(obj => (
              <div key={obj.label} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>{obj.label}</span>
                  <span style={{ ...DF, fontSize:11, fontWeight:700, color:'var(--wheat)' }}>{fmtEur(obj.current)} / {fmtEur(obj.target)}</span>
                </div>
                <div style={{ height:4, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background: obj.current>=obj.target?'#0E9594':'#F2542D', width:`${Math.min(100,obj.current/obj.target*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
