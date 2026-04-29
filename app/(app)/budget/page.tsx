'use client'
import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Zap, CreditCard, Calendar } from 'lucide-react'
import { useBudget, type NewTransaction } from '@/hooks/useBudget'

const ORANGE   = '#F2542D'
const TEAL     = '#0E9594'
const TEAL_BG  = '#11686A'
const WHEAT    = '#F0E4CC'
const DARK     = '#16162A'
const PALETTE  = ['#F2542D','#0E9594','#F0E4CC','#7C6FAF','#E8A838','#3ABCB8','#E46A45','#5E9C8F','#C45E3E','#9B72CF']
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0 })
}

/* ── Donut SVG (stroke-dasharray) ── */
function DonutChart({ segments, total, size = 150 }: {
  segments: { value: number; color: string }[]
  total: number
  size?: number
}) {
  const cx   = size / 2
  const cy   = size / 2
  const R    = size / 2 - 10
  const sw   = size * 0.2
  const circ = 2 * Math.PI * R
  let cumulative = 0

  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      {total === 0
        ? <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(240,228,204,0.08)" strokeWidth={sw} />
        : segments.map((seg, i) => {
            const dash   = (seg.value / total) * circ
            const offset = circ - cumulative
            cumulative  += dash
            return (
              <circle key={i} cx={cx} cy={cy} r={R}
                fill="none" stroke={seg.color} strokeWidth={sw}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
              />
            )
          })
      }
      <circle cx={cx} cy={cy} r={R * 0.58} fill={DARK} />
    </svg>
  )
}

/* ── Page ── */
export default function BudgetPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showTxModal, setShowTxModal] = useState(false)
  const [txForm, setTxForm] = useState<NewTransaction>({
    amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'',
  })

  const {
    transactions, categories, loading,
    addTransaction, totalIncome, totalExpense, balance,
    byCategory, dailyData,
  } = useBudget(year, month)

  const savings      = totalIncome > 0 ? Math.round(balance / totalIncome * 100) : 0
  const totalBudget  = categories.filter(c => c.type === 'expense').reduce((s,c) => s + (c.budget_monthly ?? 0), 0)
  const monthName    = new Date(year, month-1, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
  const recurring    = transactions.filter(t => t.is_recurring)
  const dailyMax     = Math.max(...dailyData.map(d => Math.max(d.income, d.expense)), 1)

  const donutSegments = byCategory.map((cat, i) => ({
    value: cat.spent,
    color: cat.color ?? PALETTE[i % PALETTE.length],
  }))

  const goals = [
    { label:'Épargne mensuelle', target:500,  current:Math.max(0, balance),                                                                          color:TEAL   },
    { label:'Budget courses',    target:300,  current:byCategory.find(c => c.name?.toLowerCase().includes('course'))?.spent ?? 0,                    color:ORANGE },
    { label:'Fonds urgence',     target:2000, current:Math.min(2000, Math.max(0, balance) * 2),                                                       color:'#7C6FAF' },
  ]

  function prevMonth() { if (month===1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  function nextMonth() { if (month===12){ setMonth(1);  setYear(y=>y+1) } else setMonth(m=>m+1) }

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount) return
    await addTransaction(txForm)
    setShowTxModal(false)
    setTxForm({ amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'' })
  }

  /* ── shared styles ── */
  const CARD: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }
  const LABEL: React.CSSProperties = {
    ...DF,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  }
  const HDR_ROW: React.CSSProperties = {
    padding: '18px 22px 14px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  }

  return (
    <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:16, minHeight:'100%' }}>

      {/* ════════ HEADER ════════ */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
        {/* Title */}
        <div>
          <h1 style={{ ...DF, fontSize:42, fontWeight:900, color:WHEAT, letterSpacing:'-0.02em', lineHeight:1, marginBottom:4 }}>BUDGET.</h1>
          <p style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
            MAÎTRISEZ · PLANIFIEZ · ATTEIGNEZ VOS OBJECTIFS
          </p>
        </div>

        {/* Résumé du mois — orange card */}
        <div style={{ background:ORANGE, borderRadius:16, padding:'18px 26px', display:'flex', gap:0, flexShrink:0 }}>
          {[
            { label:'Revenus',  value:fmtEur(totalIncome),  sub:`${transactions.filter(t=>t.type==='income').length} transactions` },
            { label:'Dépenses', value:fmtEur(totalExpense), sub:`${byCategory.length} catégories` },
            { label:'Épargne',  value:`${savings} %`,        sub:'du revenu' },
            { label:'Solde',    value:fmtEur(balance),       sub: balance >= 0 ? 'Excédent' : 'Déficit' },
          ].map((kpi, i) => (
            <div key={i} style={{ borderLeft: i>0 ? '1px solid rgba(255,255,255,0.25)':undefined, paddingLeft: i>0 ? 24:undefined, paddingRight: i<3 ? 24:undefined }}>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{kpi.label}</p>
              <p style={{ ...DF, fontSize:20, fontWeight:900, color:'#fff', lineHeight:1 }}>{kpi.value}</p>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.65)', marginTop:3 }}>{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ FILTER BAR ════════ */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={prevMonth} style={{ width:32, height:32, borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ChevronLeft size={16}/>
        </button>
        <span style={{ ...DF, fontSize:12, fontWeight:700, color:WHEAT, textTransform:'capitalize', minWidth:140, textAlign:'center' }}>{monthName}</span>
        <button onClick={nextMonth} style={{ width:32, height:32, borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ChevronRight size={16}/>
        </button>
        <div style={{ flex:1 }} />
        <div style={{ padding:'7px 14px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
          <CreditCard size={12} style={{ color:'var(--text-muted)' }} />
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Tous les comptes</span>
        </div>
        <button onClick={() => setShowTxModal(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, fontSize:12, cursor:'pointer' }}>
          <Plus size={14}/> TRANSACTION
        </button>
      </div>

      {/* ════════ MAIN GRID ════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '300px 300px 500px 400px 260px',
        gap: 12,
        flex: 1,
      }}>

        {/* ── B1 Aperçu des dépenses (donut) ── col 1-2, row 1 */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'1/2', background:TEAL_BG, border:'none' }}>
          <div style={{ ...HDR_ROW, borderBottom:'1px solid rgba(240,228,204,0.1)' }}>
            <span style={{ ...LABEL, color:WHEAT }}>Aperçu des dépenses</span>
            <span style={{ fontSize:10, color:'rgba(240,228,204,0.45)' }}>{byCategory.length} catégorie{byCategory.length!==1?'s':''}</span>
          </div>
          <div style={{ flex:1, padding:'16px 22px', display:'flex', gap:20, alignItems:'center', overflow:'hidden' }}>
            {/* Donut + centre label */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <DonutChart segments={donutSegments} total={totalExpense} size={148}/>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                <p style={{ ...DF, fontSize:13, fontWeight:900, color:WHEAT, lineHeight:1 }}>{fmtEur(totalExpense)}</p>
                <p style={{ fontSize:8, color:'rgba(240,228,204,0.5)', marginTop:2 }}>total</p>
              </div>
            </div>
            {/* Legend */}
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', gap:7 }}>
              {byCategory.length === 0
                ? <p style={{ fontSize:12, color:'rgba(240,228,204,0.4)' }}>Aucune dépense ce mois</p>
                : byCategory.slice(0,8).map((cat,i) => {
                    const pct = totalExpense > 0 ? Math.round(cat.spent/totalExpense*100) : 0
                    return (
                      <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:cat.color ?? PALETTE[i%PALETTE.length], flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:'rgba(240,228,204,0.8)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                        <span style={{ ...DF, fontSize:10, fontWeight:700, color:WHEAT, flexShrink:0 }}>{fmtEur(cat.spent)}</span>
                        <span style={{ fontSize:9, color:'rgba(240,228,204,0.45)', width:26, textAlign:'right', flexShrink:0 }}>{pct}%</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* ── B2 Répartition vs Budget ── col 3-4, row 1 */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'1/2' }}>
          <div style={HDR_ROW}>
            <span style={{ ...LABEL, color:ORANGE }}>Répartition vs Budget</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>{totalBudget > 0 ? `Budget : ${fmtEur(totalBudget)}` : 'Aucun budget défini'}</span>
          </div>
          <div style={{ flex:1, padding:'14px 22px', overflow:'auto', display:'flex', flexDirection:'column', gap:11 }}>
            {loading
              ? <p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p>
              : categories.filter(c => c.type==='expense').length === 0
              ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.5 }}>
                  <Target size={26} style={{ color:'var(--text-muted)' }}/>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucun budget défini</p>
                </div>
              )
              : categories.filter(c => c.type==='expense').map(cat => {
                  const spent  = transactions.filter(t => t.budget_category_id===cat.id).reduce((s,t) => s+t.amount, 0)
                  const budget = cat.budget_monthly ?? 0
                  const pct    = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : (spent > 0 ? 100 : 0)
                  const over   = budget > 0 && spent > budget
                  return (
                    <div key={cat.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:7, height:7, borderRadius:2, background:cat.color ?? ORANGE }}/>
                          <span style={{ fontSize:11, color:'var(--text)' }}>{cat.name}</span>
                          {over && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'rgba(242,84,45,0.15)', color:ORANGE }}>Dépassé</span>}
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ ...DF, fontSize:11, fontWeight:700, color: over ? ORANGE : 'var(--text)' }}>{fmtEur(spent)}</span>
                          {budget > 0 && <span style={{ fontSize:10, color:'var(--text-muted)' }}>/ {fmtEur(budget)}</span>}
                        </div>
                      </div>
                      <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background: over ? ORANGE : (cat.color ?? TEAL), width:`${pct}%`, transition:'width 0.4s' }}/>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* ── B3 Flux de trésorerie ── col 1-3, row 2 */}
        <div style={{ ...CARD, gridColumn:'1/4', gridRow:'2/3' }}>
          <div style={HDR_ROW}>
            <span style={{ ...LABEL }}>Flux de trésorerie</span>
            <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{monthName}</span>
          </div>
          <div style={{ flex:1, padding:'16px 22px', display:'flex', gap:20, overflow:'hidden' }}>
            {/* Bar chart */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, overflow:'hidden', minWidth:0 }}>
              <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:2, paddingBottom:4 }}>
                {dailyData.map((d,i) => (
                  <div key={i} style={{ flex:1, display:'flex', gap:1, alignItems:'flex-end', minWidth:0 }}>
                    <div style={{ flex:1, height:`${dailyMax>0 ? Math.max(2, d.income/dailyMax*100) : 0}%`, background:TEAL, borderRadius:'2px 2px 0 0', opacity: d.income>0 ? 0.85 : 0.12, minHeight: d.income>0?3:2 }}/>
                    <div style={{ flex:1, height:`${dailyMax>0 ? Math.max(2, d.expense/dailyMax*100) : 0}%`, background:ORANGE, borderRadius:'2px 2px 0 0', opacity: d.expense>0 ? 0.85 : 0.12, minHeight: d.expense>0?3:2 }}/>
                  </div>
                ))}
              </div>
              {/* X-axis labels */}
              <div style={{ display:'flex', justifyContent:'space-between', paddingRight:2 }}>
                {[1,5,10,15,20,25,30].map(d => (
                  <span key={d} style={{ fontSize:8, color:'var(--text-muted)' }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Totals sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, justifyContent:'center', flexShrink:0, width:140 }}>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(14,149,148,0.1)', border:'1px solid rgba(14,149,148,0.2)' }}>
                <p style={{ fontSize:9, color:TEAL, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>Total revenus</p>
                <p style={{ ...DF, fontSize:20, fontWeight:900, color:TEAL }}>{fmtEur(totalIncome)}</p>
              </div>
              <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(242,84,45,0.1)', border:'1px solid rgba(242,84,45,0.2)' }}>
                <p style={{ fontSize:9, color:ORANGE, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>Total dépenses</p>
                <p style={{ ...DF, fontSize:20, fontWeight:900, color:ORANGE }}>{fmtEur(totalExpense)}</p>
              </div>
              <div style={{ display:'flex', gap:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:9, height:9, borderRadius:2, background:TEAL }}/>
                  <span style={{ fontSize:9, color:'var(--text-muted)' }}>Revenus</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:9, height:9, borderRadius:2, background:ORANGE }}/>
                  <span style={{ fontSize:9, color:'var(--text-muted)' }}>Dépenses</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── B4 Comptes ── col 4, row 2 */}
        <div style={{ ...CARD, gridColumn:'4/5', gridRow:'2/3' }}>
          <div style={{ ...HDR_ROW }}>
            <span style={{ ...LABEL, color:TEAL }}>Comptes</span>
          </div>
          <div style={{ flex:1, padding:'14px 18px', overflow:'auto', display:'flex', flexDirection:'column' }}>
            {[
              { name:'Compte courant', icon:'🏦', balance: totalIncome - totalExpense },
              { name:'Épargne',        icon:'💰', balance: Math.max(0, balance) * 0.45 },
              { name:'Livret A',       icon:'📈', balance: Math.max(0, balance) * 0.2  },
            ].map((acc, i, arr) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom: i<arr.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {acc.icon}
                  </div>
                  <span style={{ fontSize:11, color:'var(--text)' }}>{acc.name}</span>
                </div>
                <span style={{ ...DF, fontWeight:700, fontSize:14, color: acc.balance >= 0 ? TEAL : ORANGE }}>{fmtEur(acc.balance)}</span>
              </div>
            ))}
            <div style={{ marginTop:'auto', padding:'12px 0 0', borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>Patrimoine estimé</span>
                <span style={{ ...DF, fontWeight:900, fontSize:16, color:WHEAT }}>{fmtEur(Math.max(0,balance)*1.65)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── B5 Dernières transactions ── col 1-3, row 3 */}
        <div style={{ ...CARD, gridColumn:'1/4', gridRow:'3/4' }}>
          <div style={HDR_ROW}>
            <span style={{ ...LABEL }}>Dernières transactions</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>{transactions.length} ce mois</span>
          </div>
          {/* Table head */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 90px 110px', padding:'8px 22px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Description','Catégorie','Date','Montant'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {loading
              ? <div style={{ padding:24, textAlign:'center' }}><p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p></div>
              : transactions.length === 0
              ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8 }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune transaction ce mois</p>
                  <button onClick={() => setShowTxModal(true)} style={{ fontSize:11, color:ORANGE, background:'none', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>+ Ajouter</button>
                </div>
              )
              : transactions.slice(0,14).map((tx) => (
                <div key={tx.id} style={{ display:'grid', gridTemplateColumns:'1fr 130px 90px 110px', padding:'11px 22px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                  {/* Description */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background: tx.type==='income' ? 'rgba(14,149,148,0.15)' : 'rgba(242,84,45,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {tx.type==='income'
                        ? <TrendingUp  size={12} style={{ color:TEAL   }}/>
                        : <TrendingDown size={12} style={{ color:ORANGE }}/>
                      }
                    </div>
                    <span style={{ fontSize:12, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description || 'Sans description'}</span>
                  </div>
                  {/* Catégorie badge */}
                  <div>
                    {tx.budget_categories
                      ? <span style={{ fontSize:10, padding:'3px 8px', borderRadius:6, background:`${tx.budget_categories.color ?? ORANGE}22`, color:tx.budget_categories.color ?? ORANGE, fontWeight:600 }}>{tx.budget_categories.name}</span>
                      : <span style={{ fontSize:10, color:'var(--text-muted)' }}>—</span>
                    }
                  </div>
                  {/* Date */}
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {new Date(tx.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                  </span>
                  {/* Montant */}
                  <span style={{ ...DF, fontWeight:800, fontSize:14, color: tx.type==='income' ? TEAL : ORANGE }}>
                    {tx.type==='income' ? '+' : '-'}{fmtEur(tx.amount)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── B6 Paiements à venir ── col 4, row 3 */}
        <div style={{ ...CARD, gridColumn:'4/5', gridRow:'3/4' }}>
          <div style={{ ...HDR_ROW }}>
            <span style={{ ...LABEL }}>Paiements à venir</span>
            <Calendar size={13} style={{ color:'var(--text-muted)' }}/>
          </div>
          <div style={{ flex:1, padding:'12px 18px', overflow:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {recurring.length === 0
              ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.5 }}>
                  <Calendar size={26} style={{ color:'var(--text-muted)' }}/>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', lineHeight:1.5 }}>Aucun paiement récurrent.<br/>Marquez une transaction comme récurrente.</p>
                </div>
              )
              : recurring.slice(0,9).map(tx => (
                <div key={tx.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'var(--bg-input)', border:'1px solid var(--border)' }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description || 'Paiement récurrent'}</p>
                    <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>Mensuel</p>
                  </div>
                  <span style={{ ...DF, fontWeight:700, fontSize:13, color:ORANGE, flexShrink:0, marginLeft:8 }}>-{fmtEur(tx.amount)}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── B7 Planification budgétaire ── col 1-2, row 4 */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'4/5' }}>
          <div style={HDR_ROW}>
            <span style={{ ...LABEL }}>Planification budgétaire</span>
          </div>
          {/* Table head */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 76px 76px 76px 90px', padding:'8px 22px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Catégorie','Budget','Dépenses','Reste','Progression'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {categories.filter(c => c.type==='expense').length === 0
              ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune catégorie de dépense</p>
                </div>
              )
              : categories.filter(c => c.type==='expense').map(cat => {
                  const spent  = transactions.filter(t => t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
                  const budget = cat.budget_monthly ?? 0
                  const reste  = budget > 0 ? budget - spent : 0
                  const pct    = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : (spent>0?100:0)
                  const over   = budget > 0 && spent > budget
                  return (
                    <div key={cat.id} style={{ display:'grid', gridTemplateColumns:'1fr 76px 76px 76px 90px', padding:'11px 22px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:cat.color ?? ORANGE }}/>
                        <span style={{ fontSize:11, color:'var(--text)' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{budget>0 ? fmtEur(budget):'—'}</span>
                      <span style={{ ...DF, fontSize:11, fontWeight:700, color: over ? ORANGE : 'var(--text)' }}>{fmtEur(spent)}</span>
                      <span style={{ fontSize:11, color: reste>=0 ? TEAL : ORANGE }}>{budget>0 ? fmtEur(reste):'—'}</span>
                      <div>
                        {budget > 0
                          ? <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:99, background: over ? ORANGE : TEAL, width:`${pct}%` }}/>
                            </div>
                          : <span style={{ fontSize:9, color:'var(--text-muted)' }}>Non défini</span>
                        }
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* ── B8 Objectifs financiers ── col 3-4, row 4 */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'4/5' }}>
          <div style={HDR_ROW}>
            <span style={{ ...LABEL }}>Objectifs financiers</span>
            <Target size={13} style={{ color:'var(--text-muted)' }}/>
          </div>
          <div style={{ flex:1, padding:'18px 24px', overflow:'auto', display:'flex', flexDirection:'column', gap:22 }}>
            {goals.map((goal, i) => {
              const pct  = goal.target > 0 ? Math.min(100, Math.round(goal.current/goal.target*100)) : 0
              const done = goal.current >= goal.target
              return (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <p style={{ fontSize:13, color:'var(--text)', marginBottom:2 }}>{goal.label}</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtEur(goal.current)} sur {fmtEur(goal.target)}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ ...DF, fontSize:22, fontWeight:900, color: done ? TEAL : WHEAT }}>{pct}%</span>
                      {done && <span style={{ color:TEAL, fontSize:16 }}>✓</span>}
                    </div>
                  </div>
                  <div style={{ height:8, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background: done ? TEAL : goal.color, width:`${pct}%`, transition:'width 0.5s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:8, color:'var(--text-muted)' }}>0 €</span>
                    <span style={{ fontSize:8, color:'var(--text-muted)' }}>Objectif : {fmtEur(goal.target)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── B9 Insight Agent IA (footer) ── col 1-4, row 5 */}
        <div style={{ gridColumn:'1/5', gridRow:'5/6', background:TEAL_BG, borderRadius:16, display:'flex', alignItems:'center', padding:'28px 36px', gap:24, overflow:'hidden' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(240,228,204,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Zap size={24} style={{ color:WHEAT }}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ ...LABEL, color:WHEAT, marginBottom:8 }}>Insight de l'Agent IA</p>
            <p style={{ fontSize:14, color:'rgba(240,228,204,0.92)', lineHeight:1.65 }}>
              {loading
                ? 'Analyse en cours…'
                : balance < 0
                  ? `⚠ Attention : vos dépenses (${fmtEur(totalExpense)}) dépassent vos revenus (${fmtEur(totalIncome)}) ce mois. Identifiez les catégories à réduire pour retrouver un solde positif.`
                  : byCategory.length > 0
                    ? `Votre plus grosse dépense ce mois est « ${byCategory[0]?.name} » (${fmtEur(byCategory[0]?.spent)}). Taux d'épargne : ${savings}% — ${savings >= 20 ? '🎉 Excellent !' : savings >= 10 ? 'Bien, visez 20% pour une épargne solide.' : 'Essayez d\'atteindre 10–20% du revenu en épargne.'}`
                    : 'Aucune transaction enregistrée ce mois. Commencez par ajouter vos revenus et dépenses pour obtenir une analyse personnalisée de votre budget.'
              }
            </p>
          </div>
          <button onClick={() => setShowTxModal(true)}
            style={{ padding:'12px 22px', borderRadius:12, background:'rgba(240,228,204,0.15)', border:'1px solid rgba(240,228,204,0.25)', color:WHEAT, ...DF, fontWeight:700, fontSize:12, flexShrink:0, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <Plus size={14}/> Nouvelle transaction
          </button>
        </div>
      </div>

      {/* ════════ TRANSACTION MODAL ════════ */}
      {showTxModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(22,22,42,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-active)', padding:30, width:440, boxShadow:'0 24px 60px rgba(0,0,0,0.55)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
              <h3 style={{ ...DF, fontSize:20, fontWeight:900, color:WHEAT }}>Nouvelle transaction</h3>
              <button onClick={() => setShowTxModal(false)} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <form onSubmit={handleAddTx} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Type toggle */}
              <div style={{ display:'flex', gap:8 }}>
                {(['expense','income'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setTxForm(f=>({...f, type}))}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:`2px solid ${txForm.type===type ? (type==='expense'?ORANGE:TEAL) : 'var(--border)'}`, background: txForm.type===type ? (type==='expense'?'rgba(242,84,45,0.12)':'rgba(14,149,148,0.12)') : 'transparent', color: txForm.type===type ? (type==='expense'?ORANGE:TEAL) : 'var(--text-muted)', ...DF, fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.2s' }}>
                    {type==='expense' ? '↓ Dépense' : '↑ Revenu'}
                  </button>
                ))}
              </div>
              {/* Amount */}
              <input type="number" min="0" step="0.01" value={txForm.amount||''} onChange={e=>setTxForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} placeholder="Montant (€)" autoFocus
                style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:18, ...DF, fontWeight:700, boxSizing:'border-box' }}/>
              {/* Description */}
              <input type="text" value={txForm.description||''} onChange={e=>setTxForm(f=>({...f,description:e.target.value}))} placeholder="Description…"
                style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}/>
              {/* Date + Category */}
              <div style={{ display:'flex', gap:10 }}>
                <input type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}/>
                <select value={txForm.budget_category_id||''} onChange={e=>setTxForm(f=>({...f,budget_category_id:e.target.value||undefined}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}>
                  <option value="">Catégorie…</option>
                  {categories.filter(c=>c.type===txForm.type).map(c=>(
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Recurring */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={txForm.is_recurring??false} onChange={e=>setTxForm(f=>({...f,is_recurring:e.target.checked}))}
                  style={{ width:16, height:16, accentColor:TEAL }}/>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Paiement récurrent (mensuel)</span>
              </label>
              <button type="submit"
                style={{ padding:'13px', borderRadius:12, background: txForm.type==='expense' ? ORANGE : TEAL, color:'#fff', border:'none', ...DF, fontWeight:900, fontSize:14, cursor:'pointer', marginTop:4 }}>
                Ajouter la transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
