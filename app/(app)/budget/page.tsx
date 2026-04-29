'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Target, Zap, Calendar, MoreVertical, ExternalLink, CreditCard,
  Edit2, X, Check,
} from 'lucide-react'
import { useBudget, useMultiMonthSummary, INITIAL_COMPTES, type NewTransaction } from '@/hooks/useBudget'

// ── Constantes ──────────────────────────────────────────────────────────────
const ORANGE  = '#F2542D'
const TEAL    = '#0E9594'
const TEAL_BG = '#11686A'
const WHEAT   = '#F0E4CC'
const DARK    = '#16162A'
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Compte = { id:string; name:string; balance:number; type:string; icon:string }
type Goal   = { id:string; label:string; target:number; current:number; color:string; icon:string }

function fmtEur(n: number, sign = false) {
  const s = Math.abs(n).toLocaleString('fr-BE', { minimumFractionDigits:0, maximumFractionDigits:0 })
  return (sign && n > 0 ? '+' : sign && n < 0 ? '-' : '') + s + ' €'
}
function fmtK(n: number) {
  if (Math.abs(n) >= 1000) return `${Math.round(n/100)/10}k €`
  return fmtEur(n)
}

// ── Donut SVG ───────────────────────────────────────────────────────────────
function DonutChart({ segments, total, size = 150 }: {
  segments: { value:number; color:string }[]
  total: number
  size?: number
}) {
  const cx = size/2, cy = size/2, R = size/2 - 10, sw = size * 0.2
  const circ = 2 * Math.PI * R
  let cum = 0
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      {total === 0
        ? <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(240,228,204,0.08)" strokeWidth={sw}/>
        : segments.map((s,i) => {
            const dash = (s.value/total)*circ
            const offset = circ - cum
            cum += dash
            return <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color}
              strokeWidth={sw} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}/>
          })
      }
      <circle cx={cx} cy={cy} r={R*0.58} fill={DARK}/>
    </svg>
  )
}

// ── Footer link ─────────────────────────────────────────────────────────────
function FooterLink({ label }: { label:string }) {
  return (
    <div style={{ padding:'12px 22px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, marginTop:'auto' }}>
      <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</span>
      <ExternalLink size={11} style={{ color:'var(--text-muted)' }}/>
    </div>
  )
}

// ── Flux bar chart ──────────────────────────────────────────────────────────
function FluxChart({ months }: { months: { label:string; income:number; expense:number; balance:number }[] }) {
  if (!months.length) return null
  const max     = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1)
  const maxBal  = Math.max(...months.map(m => Math.abs(m.balance)), 1)
  const H = 120

  return (
    <svg width="100%" height={H+28} style={{ overflow:'visible' }}>
      {/* Y-axis guides */}
      {[0,.5,1].map(p => (
        <line key={p} x1="0" x2="100%" y1={H - p*H} y2={H - p*H}
          stroke="rgba(240,228,204,0.07)" strokeWidth="1"/>
      ))}
      {months.map((m, i) => {
        const x = `${(i/(months.length-1||1))*90+5}%`
        const barW = `${80/months.length*0.4}%`
        const iH = (m.income/max)*H
        const eH = (m.expense/max)*H
        const by = H - (m.balance/maxBal)*0.5*H
        return (
          <g key={i}>
            {/* Income bar */}
            <rect x={`${(i/(months.length-1||1))*90+5 - 2}%`} y={H - iH} width={barW} height={iH}
              fill={TEAL} opacity="0.8" rx="2"/>
            {/* Expense bar */}
            <rect x={`${(i/(months.length-1||1))*90+5 + 1.5}%`} y={H - eH} width={barW} height={eH}
              fill={ORANGE} opacity="0.8" rx="2"/>
            {/* Month label */}
            <text x={x} y={H+18} textAnchor="middle" fill="rgba(240,228,204,0.4)" fontSize="9" style={{ fontFamily:'var(--font-display)' }}>
              {m.label}
            </text>
            {/* Balance dot */}
            <circle cx={x} cy={by} r="3" fill={WHEAT} opacity="0.9"/>
          </g>
        )
      })}
      {/* Balance line */}
      {months.length > 1 && (
        <polyline
          points={months.map((m,i) => {
            const x = `${(i/(months.length-1))*90+5}`
            const y = H - (m.balance/maxBal)*0.5*H
            return `${x}%,${y}`
          }).join(' ')}
          fill="none" stroke={WHEAT} strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2"/>
      )}
    </svg>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function BudgetPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)

  // ── Mois précédent (pour deltas) ──
  const prevYear  = month===1 ? year-1 : year
  const prevMonth = month===1 ? 12 : month-1

  const cur  = useBudget(year, month)
  const prev = useBudget(prevYear, prevMonth)
  const multiMonth = useMultiMonthSummary(year, month, 6)

  // ── État UI ──
  const [showTxModal,   setShowTxModal]   = useState(false)
  const [showCompteModal, setShowCompteModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [txForm, setTxForm] = useState<NewTransaction>({
    amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'',
  })

  // ── Comptes (localStorage) ──
  const [comptes, setComptes] = useState<Compte[]>([])
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('nysa_comptes_v2')
    setComptes(saved ? JSON.parse(saved) : INITIAL_COMPTES)
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (hydrated) localStorage.setItem('nysa_comptes_v2', JSON.stringify(comptes))
  }, [comptes, hydrated])

  // ── Objectifs (localStorage) ──
  const [goals, setGoals] = useState<Goal[]>([])
  useEffect(() => {
    const saved = localStorage.getItem('nysa_objectifs_v2')
    setGoals(saved ? JSON.parse(saved) : [
      { id:'ep_nath',     label:'Ep. Nath',     target:5000,  current:500,   color:TEAL,     icon:'💰' },
      { id:'ep_rev_nath', label:'Ep. Rev Nath', target:3000,  current:250,   color:'#7C6FAF',icon:'📈' },
      { id:'ep_couple',   label:'Ep. Couple',   target:10000, current:0,     color:'#E8A838',icon:'👫' },
      { id:'urgence',     label:'Fonds urgence',target:6000,  current:3000,  color:'#3ABCB8',icon:'🛡' },
    ])
  }, [])
  useEffect(() => {
    if (hydrated) localStorage.setItem('nysa_objectifs_v2', JSON.stringify(goals))
  }, [goals, hydrated])

  // ── Computed ──
  const monthName = new Date(year, month-1, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
  const savings   = cur.totalIncome > 0 ? Math.round((cur.balance/cur.totalIncome)*100) : 0
  const totalComptes = comptes.reduce((s,c) => s+c.balance, 0)

  const deltaIncome  = cur.totalIncome  - prev.totalIncome
  const deltaExpense = cur.totalExpense - prev.totalExpense
  const deltaSavings = cur.totalSavings - prev.totalSavings

  // Résumé Épargne/Invest = savings + invest category
  const investBudget = cur.transactions
    .filter(t => t.budget_categories?.name === 'Invest')
    .reduce((s,t) => s+t.amount, 0)
  const totalSavingsInvest = cur.totalSavings + investBudget

  // Upcoming payments = upcoming bills (recurring) + transactions futures
  const upcomingBills = cur.categories
    .filter(c => c.subtype==='bill')
    .map(cat => {
      const budget = cat.budget_monthly ?? 0
      const paid = cur.transactions.filter(t => t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
      const isPaid = paid >= budget * 0.8
      // Due dates from Excel pattern
      const dueDay = ['Internet'].includes(cat.name) ? 23
                   : ['Frais'].includes(cat.name) ? 30
                   : 1
      const dueDate = new Date(year, month-1, dueDay)
      if (dueDate < new Date() && isPaid) return null // déjà passé et payé
      return { cat, budget, paid, isPaid, dueDate }
    })
    .filter(Boolean)
    .slice(0,8) as { cat: typeof cur.categories[0]; budget:number; paid:number; isPaid:boolean; dueDate:Date }[]

  // Tx filtrées par compte sélectionné
  const filteredTx = selectedAccount === 'all'
    ? cur.transactions
    : cur.transactions.filter(t => t.account === selectedAccount)

  function prevMo() { if (month===1) { setMonth(12); setYear(y=>y-1) } else setMonth(m=>m-1) }
  function nextMo() { if (month===12){ setMonth(1);  setYear(y=>y+1) } else setMonth(m=>m+1) }

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount) return
    await cur.addTransaction(txForm)
    setShowTxModal(false)
    setTxForm({ amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'' })
  }

  // ── Styles partagés ──
  const CARD: React.CSSProperties = {
    background:'var(--bg-card)', borderRadius:16,
    border:'1px solid var(--border)', overflow:'hidden',
    display:'flex', flexDirection:'column',
  }
  const LBL: React.CSSProperties = {
    ...DF, fontSize:10, fontWeight:800, letterSpacing:'0.13em', textTransform:'uppercase',
  }
  const HDR: React.CSSProperties = {
    padding:'16px 20px 12px', borderBottom:'1px solid var(--border)',
    display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
  }

  const PALETTE = ['#F2542D','#0E9594','#E8A838','#7C6FAF','#3ABCB8','#E46A45','#9B72CF','#C45E3E','#5E9C8F']

  return (
    <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:14, minHeight:'100%' }}>

      {/* ════════ HEADER ════════ */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
        <div>
          <h1 style={{ ...DF, fontSize:44, fontWeight:900, color:WHEAT, letterSpacing:'-0.02em', lineHeight:1, marginBottom:3 }}>BUDGET.</h1>
          <p style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
            MAÎTRISEZ · PLANIFIEZ · ATTEIGNEZ VOS OBJECTIFS
          </p>
        </div>

        {/* ── Orange Résumé card ── */}
        <div style={{ background:ORANGE, borderRadius:16, padding:'14px 20px', display:'flex', gap:0, flexShrink:0, position:'relative', minWidth:500 }}>
          <div style={{ flex:1, paddingRight:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ ...LBL, fontSize:9, color:'rgba(255,255,255,0.8)' }}>RÉSUMÉ DU MOIS</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', textTransform:'capitalize' }}>{monthName}</span>
                <MoreVertical size={13} style={{ color:'rgba(255,255,255,0.6)' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:0 }}>
              {[
                { label:'Revenus',       value:fmtEur(cur.totalIncome),     delta:deltaIncome,   pos: deltaIncome >= 0 },
                { label:'Dépenses',      value:fmtEur(cur.totalExpense),    delta:-deltaExpense, pos: deltaExpense <= 0 },
                { label:'Épargne / Inv.',value:fmtEur(totalSavingsInvest),  delta:deltaSavings,  pos: deltaSavings >= 0 },
              ].map((kpi,i) => (
                <div key={i} style={{ borderLeft: i>0 ? '1px solid rgba(255,255,255,0.22)':undefined, paddingLeft: i>0?18:undefined, paddingRight:18 }}>
                  <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginBottom:3 }}>{kpi.label}</p>
                  <p style={{ ...DF, fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{kpi.value}</p>
                  {!cur.loading && (
                    <p style={{ fontSize:9, color: kpi.pos ? 'rgba(255,255,255,0.9)' : 'rgba(255,220,200,0.9)', marginTop:2 }}>
                      {fmtEur(Math.abs(kpi.delta), true)} vs mois préc.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Solde — panneau droit */}
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.22)', paddingLeft:18, display:'flex', flexDirection:'column', justifyContent:'center', minWidth:110 }}>
            <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Solde</p>
            <p style={{ ...DF, fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>{fmtEur(cur.balance)}</p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginTop:3 }}>
              {cur.balance >= 0 ? '✓ Excédent' : '⚠ Déficit'}
            </p>
          </div>
        </div>
      </div>

      {/* ════════ FILTER BAR ════════ */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={prevMo} style={{ width:32, height:32, borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ChevronLeft size={15}/>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <Calendar size={12} style={{ color:'var(--text-muted)' }}/>
          <span style={{ ...DF, fontSize:12, fontWeight:700, color:WHEAT, textTransform:'capitalize', minWidth:110 }}>{monthName}</span>
          <ChevronRight size={12} style={{ color:'var(--text-muted)' }}/>
        </div>
        <button onClick={nextMo} style={{ width:32, height:32, borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ChevronRight size={15}/>
        </button>

        {/* Account selector */}
        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:11, cursor:'pointer', appearance:'none' }}>
          <option value="all">Tous les comptes</option>
          {comptes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ flex:1 }}/>
        <button onClick={() => setShowTxModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, fontSize:12, cursor:'pointer' }}>
          <Plus size={14}/> + TRANSACTION
        </button>
      </div>

      {/* ════════ MAIN GRID ════════ */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(4, 1fr)',
        gridTemplateRows:'300px 300px 500px 400px 260px',
        gap:12,
        flex:1,
      }}>

        {/* ── B1 Aperçu des dépenses ── col 1-2, row 1 */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'1/2', background:TEAL_BG, border:'none' }}>
          <div style={{ ...HDR, borderBottom:'1px solid rgba(240,228,204,0.1)' }}>
            <span style={{ ...LBL, color:WHEAT }}>Aperçu des dépenses</span>
            <span style={{ fontSize:10, color:'rgba(240,228,204,0.45)' }}>{cur.byCategory.length} catégories</span>
          </div>
          <div style={{ flex:1, padding:'14px 20px', display:'flex', gap:16, alignItems:'center', overflow:'hidden' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <DonutChart size={140}
                segments={cur.byCategory.map((c,i) => ({ value:c.spent, color: c.color ?? PALETTE[i%PALETTE.length] }))}
                total={cur.totalExpense}/>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                <p style={{ ...DF, fontSize:13, fontWeight:900, color:WHEAT, lineHeight:1 }}>{fmtEur(cur.totalExpense)}</p>
                <p style={{ fontSize:8, color:'rgba(240,228,204,0.5)', marginTop:1 }}>Total</p>
              </div>
            </div>
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', gap:6 }}>
              {cur.byCategory.length === 0
                ? <p style={{ fontSize:12, color:'rgba(240,228,204,0.4)' }}>Aucune dépense</p>
                : cur.byCategory.slice(0,8).map((cat,i) => {
                    const pct = cur.totalExpense > 0 ? Math.round(cat.spent/cur.totalExpense*100) : 0
                    return (
                      <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:cat.color??PALETTE[i%PALETTE.length], flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:'rgba(240,228,204,0.8)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                        <span style={{ ...DF, fontSize:10, fontWeight:700, color:WHEAT, flexShrink:0 }}>{fmtEur(cat.spent)}</span>
                        <span style={{ fontSize:9, color:'rgba(240,228,204,0.45)', width:26, textAlign:'right', flexShrink:0 }}>{pct}%</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
          <FooterLink label="Voir l'analyse complète"/>
        </div>

        {/* ── B2 Répartition vs Budget ── col 3-4, row 1 */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'1/2' }}>
          <div style={HDR}>
            <span style={{ ...LBL, color:ORANGE }}>Répartition vs Budget</span>
            <span style={{ fontSize:9, color:'var(--text-muted)' }}>
              {cur.totalExpense > 0 && cur.totalVariableExpense+cur.totalBills > 0
                ? `${Math.round((cur.totalExpense/(cur.totalVariableExpense+cur.totalBills+cur.totalSavings||1))*100)}% du budget utilisé`
                : 'Aucun budget défini'}
            </span>
          </div>
          <div style={{ flex:1, padding:'12px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:9 }}>
            {cur.loading
              ? <p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p>
              : cur.categories.filter(c => c.type==='expense' && (c.budget_monthly??0)>0).length === 0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.5 }}>
                  <Target size={26} style={{ color:'var(--text-muted)' }}/>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucun budget mensuel défini</p>
                </div>
              : cur.categories.filter(c => c.type==='expense' && (c.budget_monthly??0)>0).map(cat => {
                  const spent  = cur.transactions.filter(t => t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
                  const budget = cat.budget_monthly!
                  const pct    = Math.min(100, Math.round(spent/budget*100))
                  const over   = spent > budget
                  return (
                    <div key={cat.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:13 }}>{cat.icon ?? '●'}</span>
                          <span style={{ fontSize:11, color:'var(--text)' }}>{cat.name}</span>
                          {over && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:4, background:'rgba(242,84,45,0.15)', color:ORANGE }}>Dépassé</span>}
                        </div>
                        <div style={{ display:'flex', gap:5, alignItems:'baseline' }}>
                          <span style={{ ...DF, fontSize:11, fontWeight:700, color: over ? ORANGE : 'var(--text)' }}>{fmtEur(spent)}</span>
                          <span style={{ fontSize:9, color:'var(--text-muted)' }}>/ {fmtEur(budget)}</span>
                        </div>
                      </div>
                      <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background: over ? ORANGE : (cat.color??TEAL), width:`${pct}%`, transition:'width 0.4s' }}/>
                      </div>
                    </div>
                  )
                })
            }
          </div>
          <FooterLink label="Gérer mon budget"/>
        </div>

        {/* ── B3 Comptes ── col 1, row 2 */}
        <div style={{ ...CARD, gridColumn:'1/2', gridRow:'2/3' }}>
          <div style={{ ...HDR }}>
            <span style={{ ...LBL, color:TEAL }}>Comptes</span>
            <span style={{ fontSize:9, color:'var(--text-muted)', ...DF, fontWeight:700 }}>Solde</span>
          </div>
          <div style={{ flex:1, padding:'8px 16px', overflow:'auto' }}>
            {comptes.map((c, i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom: i<comptes.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                    {c.icon}
                  </div>
                  <span style={{ fontSize:11, color:'var(--text)' }}>{c.name}</span>
                </div>
                <span style={{ ...DF, fontWeight:700, fontSize:13, color: c.balance < 0 ? ORANGE : TEAL }}>
                  {c.balance < 0 ? '-' : ''}{fmtEur(Math.abs(c.balance))}
                </span>
              </div>
            ))}
          </div>
          {/* Total */}
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>Total</span>
            <span style={{ ...DF, fontWeight:900, fontSize:15, color:WHEAT }}>{fmtEur(totalComptes)}</span>
          </div>
          <FooterLink label="Voir tous les comptes"/>
        </div>

        {/* ── B4 Flux de trésorerie ── col 2-4, row 2 */}
        <div style={{ ...CARD, gridColumn:'2/5', gridRow:'2/3' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Flux de trésorerie</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>6 derniers mois</span>
              <ChevronRight size={11} style={{ color:'var(--text-muted)' }}/>
            </div>
          </div>
          <div style={{ flex:1, padding:'14px 20px', display:'flex', gap:16, overflow:'hidden' }}>
            {/* Legend */}
            <div style={{ display:'flex', gap:12, position:'absolute', marginTop:-10, marginLeft:2 }}>
              {[{c:TEAL,l:'Revenus'},{c:ORANGE,l:'Dépenses'},{c:WHEAT,l:'Solde'}].map(({c,l}) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                  <span style={{ fontSize:9, color:'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div style={{ flex:1, paddingTop:14, overflow:'hidden' }}>
              {multiMonth.length > 0
                ? <FluxChart months={multiMonth}/>
                : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity:0.4 }}>
                    <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune donnée disponible</p>
                  </div>
              }
            </div>
            {/* Sidebar totals */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center', flexShrink:0, width:130 }}>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(14,149,148,0.1)', border:'1px solid rgba(14,149,148,0.2)' }}>
                <p style={{ fontSize:8, color:TEAL, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Revenus totaux</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:TEAL }}>
                  {fmtK(multiMonth.reduce((s,m)=>s+m.income,0))}
                </p>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(242,84,45,0.1)', border:'1px solid rgba(242,84,45,0.2)' }}>
                <p style={{ fontSize:8, color:ORANGE, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Dépenses totales</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:ORANGE }}>
                  {fmtK(multiMonth.reduce((s,m)=>s+m.expense,0))}
                </p>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:10, background:TEAL_BG, border:'none' }}>
                <p style={{ fontSize:8, color:WHEAT, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, opacity:0.7 }}>Solde</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:WHEAT }}>
                  {fmtK(multiMonth.reduce((s,m)=>s+m.balance,0))}
                </p>
              </div>
            </div>
          </div>
          <FooterLink label="Voir le rapport de trésorerie"/>
        </div>

        {/* ── B5 Dernières transactions ── col 1-3, row 3 */}
        <div style={{ ...CARD, gridColumn:'1/4', gridRow:'3/4' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Dernières transactions</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>{filteredTx.length} ce mois</span>
          </div>
          {/* Table head */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 110px', padding:'7px 20px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Description','Catégorie','Compte','Montant'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {cur.loading
              ? <div style={{ padding:24, textAlign:'center' }}><p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p></div>
              : filteredTx.length === 0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8 }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune transaction</p>
                  <button onClick={()=>setShowTxModal(true)} style={{ fontSize:11, color:ORANGE, background:'none', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>+ Ajouter</button>
                </div>
              : filteredTx.slice(0,16).map((tx) => (
                  <div key={tx.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 110px', padding:'10px 20px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: tx.type==='income' ? 'rgba(14,149,148,0.15)' : 'rgba(242,84,45,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {tx.type==='income' ? <TrendingUp size={11} style={{ color:TEAL }}/> : <TrendingDown size={11} style={{ color:ORANGE }}/>}
                      </div>
                      <span style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description || 'Sans description'}</span>
                    </div>
                    <div>
                      {tx.budget_categories
                        ? <span style={{ fontSize:9, padding:'3px 7px', borderRadius:5, background:`${tx.budget_categories.color??ORANGE}22`, color:tx.budget_categories.color??ORANGE, fontWeight:600 }}>{tx.budget_categories.name}</span>
                        : <span style={{ fontSize:10, color:'var(--text-muted)' }}>—</span>
                      }
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{tx.account ?? '—'}</span>
                    <span style={{ ...DF, fontWeight:800, fontSize:13, color: tx.type==='income' ? TEAL : ORANGE }}>
                      {tx.type==='income' ? '+' : '-'}{fmtEur(tx.amount)}
                    </span>
                  </div>
                ))
            }
          </div>
          <FooterLink label="Voir toutes les transactions"/>
        </div>

        {/* ── B6 Paiements à venir ── col 4, row 3 */}
        <div style={{ ...CARD, gridColumn:'4/5', gridRow:'3/4' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Paiements à venir</span>
            <Calendar size={13} style={{ color:'var(--text-muted)' }}/>
          </div>
          <div style={{ flex:1, padding:'10px 16px', overflow:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {upcomingBills.length === 0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.4 }}>
                  <Calendar size={24} style={{ color:'var(--text-muted)' }}/>
                  <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>Aucun paiement à venir</p>
                </div>
              : upcomingBills.map(({ cat, budget, paid, isPaid, dueDate }) => (
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, background: isPaid ? 'rgba(14,149,148,0.06)' : 'var(--bg-input)', border:`1px solid ${isPaid ? 'rgba(14,149,148,0.2)' : 'var(--border)'}` }}>
                    <div style={{ textAlign:'center', minWidth:30, flexShrink:0 }}>
                      <p style={{ ...DF, fontSize:13, fontWeight:900, color: isPaid ? TEAL : WHEAT, lineHeight:1 }}>
                        {dueDate.getDate()}
                      </p>
                      <p style={{ fontSize:8, color:'var(--text-muted)', textTransform:'uppercase' }}>
                        {dueDate.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')}
                      </p>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:11, color: isPaid ? 'var(--text-muted)' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</p>
                      <p style={{ fontSize:8, color:'var(--text-muted)', marginTop:1 }}>
                        {cat.icon} {cat.subtype === 'bill' ? 'Charge fixe' : 'Épargne'}
                        {isPaid && ' · Payé'}
                      </p>
                    </div>
                    <span style={{ ...DF, fontWeight:700, fontSize:12, color: isPaid ? TEAL : ORANGE, flexShrink:0 }}>
                      {isPaid ? '+' : '-'}{fmtEur(budget)}
                    </span>
                  </div>
                ))
            }
          </div>
          <FooterLink label="Voir tous les paiements"/>
        </div>

        {/* ── B7 Planification budgétaire ── col 1-2, row 4 */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'4/5' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Planification budgétaire</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{monthName}</span>
              <ChevronRight size={11} style={{ color:'var(--text-muted)' }}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px 90px', padding:'6px 20px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Catégorie','Budget','Dépenses','Reste','Progression'].map(h => (
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {cur.categories.filter(c => c.type==='expense').length === 0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', opacity:0.5 }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune catégorie</p>
                </div>
              : cur.categories.filter(c => c.type==='expense').map(cat => {
                  const spent  = cur.transactions.filter(t => t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
                  const budget = cat.budget_monthly ?? 0
                  const reste  = budget - spent
                  const pct    = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : (spent>0?100:0)
                  const over   = budget > 0 && spent > budget
                  return (
                    <div key={cat.id} style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px 90px', padding:'9px 20px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12 }}>{cat.icon ?? '●'}</span>
                        <span style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{budget>0 ? fmtEur(budget):'—'}</span>
                      <span style={{ ...DF, fontSize:11, fontWeight:700, color: over ? ORANGE : 'var(--text)' }}>{fmtEur(spent)}</span>
                      <span style={{ fontSize:11, color: reste>=0 ? TEAL : ORANGE }}>{budget>0 ? fmtEur(reste):'—'}</span>
                      <div>
                        {budget>0
                          ? <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:99, background: over ? ORANGE : (cat.color??TEAL), width:`${pct}%` }}/>
                            </div>
                          : <span style={{ fontSize:9, color:'var(--text-muted)' }}>Non défini</span>
                        }
                      </div>
                    </div>
                  )
                })
            }
          </div>
          <FooterLink label="Modifier mon budget"/>
        </div>

        {/* ── B8 Objectifs financiers ── col 3-4, row 4 */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'4/5' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Objectifs financiers</span>
            <button style={{ width:24, height:24, borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Plus size={12}/>
            </button>
          </div>
          <div style={{ flex:1, padding:'14px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:18 }}>
            {goals.map((g) => {
              const pct  = g.target > 0 ? Math.min(100, Math.round(g.current/g.target*100)) : 0
              const done = g.current >= g.target
              return (
                <div key={g.id}>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${g.color}22`, border:`1px solid ${g.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {g.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                        <p style={{ fontSize:13, color:'var(--text)' }}>{g.label}</p>
                        <span style={{ ...DF, fontSize:20, fontWeight:900, color: done ? TEAL : WHEAT }}>{pct}%</span>
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{fmtEur(g.current)} sur {fmtEur(g.target)}</p>
                    </div>
                  </div>
                  <div style={{ height:7, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background: done ? TEAL : g.color, width:`${pct}%`, transition:'width 0.5s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                    <span style={{ fontSize:8, color:'var(--text-muted)' }}>0 €</span>
                    <span style={{ fontSize:8, color:'var(--text-muted)' }}>Objectif : {fmtEur(g.target)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <FooterLink label="Voir tous mes objectifs"/>
        </div>

        {/* ── B9 Insight Agent IA ── col 1-4, row 5 */}
        <div style={{ gridColumn:'1/5', gridRow:'5/6', background:TEAL_BG, borderRadius:16, display:'flex', alignItems:'center', padding:'0 36px', gap:24, overflow:'hidden' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(240,228,204,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Zap size={22} style={{ color:WHEAT }}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ ...LBL, color:WHEAT, opacity:0.7, marginBottom:6 }}>Insight de l'Agent IA</p>
            <p style={{ fontSize:14, color:'rgba(240,228,204,0.93)', lineHeight:1.6 }}>
              {cur.loading ? 'Analyse en cours…'
               : cur.balance < 0
                 ? `⚠ Vos dépenses (${fmtEur(cur.totalExpense)}) dépassent vos revenus (${fmtEur(cur.totalIncome)}) ce mois. Réduisez les dépenses variables pour retrouver un solde positif.`
                 : cur.byCategory.length > 0
                   ? `Votre plus grosse dépense est « ${cur.byCategory[0]?.name} » (${fmtEur(cur.byCategory[0]?.spent)}). Taux d'épargne : ${savings}% — ${savings>=20?'🎉 Excellent !':savings>=10?'Bien, visez 20%.':'Visez 10–20% du revenu en épargne.'}`
                   : 'Ajoutez vos premières transactions pour obtenir une analyse personnalisée de votre budget mensuel.'}
            </p>
          </div>
          <button onClick={() => setShowTxModal(true)}
            style={{ padding:'11px 20px', borderRadius:11, background:'rgba(240,228,204,0.15)', border:'1px solid rgba(240,228,204,0.25)', color:WHEAT, ...DF, fontWeight:700, fontSize:11, flexShrink:0, display:'flex', alignItems:'center', gap:7, cursor:'pointer' }}>
            <Plus size={13}/> Voir l'analyse détaillée
          </button>
        </div>
      </div>

      {/* ════════ MODAL TRANSACTION ════════ */}
      {showTxModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(22,22,42,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-active)', padding:28, width:460, boxShadow:'0 24px 60px rgba(0,0,0,0.55)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ ...DF, fontSize:20, fontWeight:900, color:WHEAT }}>Nouvelle transaction</h3>
              <button onClick={()=>setShowTxModal(false)} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <form onSubmit={handleAddTx} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Type toggle */}
              <div style={{ display:'flex', gap:8 }}>
                {(['expense','income'] as const).map(type => (
                  <button key={type} type="button" onClick={()=>setTxForm(f=>({...f,type}))}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:`2px solid ${txForm.type===type?(type==='expense'?ORANGE:TEAL):'var(--border)'}`, background: txForm.type===type?(type==='expense'?'rgba(242,84,45,0.12)':'rgba(14,149,148,0.12)'):'transparent', color: txForm.type===type?(type==='expense'?ORANGE:TEAL):'var(--text-muted)', ...DF, fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.2s' }}>
                    {type==='expense'?'↓ Dépense':'↑ Revenu'}
                  </button>
                ))}
              </div>
              {/* Montant */}
              <input type="number" min="0" step="0.01" value={txForm.amount||''} onChange={e=>setTxForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} placeholder="Montant (€)" autoFocus
                style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:18, ...DF, fontWeight:700, boxSizing:'border-box' }}/>
              {/* Description */}
              <input type="text" value={txForm.description||''} onChange={e=>setTxForm(f=>({...f,description:e.target.value}))} placeholder="Description…"
                style={{ width:'100%', padding:'11px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}/>
              {/* Date + Catégorie */}
              <div style={{ display:'flex', gap:10 }}>
                <input type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}/>
                <select value={txForm.budget_category_id||''} onChange={e=>setTxForm(f=>({...f,budget_category_id:e.target.value||undefined}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}>
                  <option value="">Catégorie…</option>
                  {cur.categories.filter(c=>c.type===txForm.type).map(c=>(
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              {/* Compte + Personne */}
              <div style={{ display:'flex', gap:10 }}>
                <select value={txForm.account||''} onChange={e=>setTxForm(f=>({...f,account:e.target.value||undefined}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}>
                  <option value="">Compte…</option>
                  {comptes.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <select value={txForm.person||'Nathan'} onChange={e=>setTxForm(f=>({...f,person:e.target.value}))}
                  style={{ flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:12 }}>
                  <option value="Nathan">Nathan</option>
                  <option value="Combined">Combined</option>
                </select>
              </div>
              {/* Récurrent */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={txForm.is_recurring??false} onChange={e=>setTxForm(f=>({...f,is_recurring:e.target.checked}))}
                  style={{ width:15, height:15, accentColor:TEAL }}/>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Paiement récurrent (mensuel)</span>
              </label>
              <button type="submit"
                style={{ padding:'13px', borderRadius:12, background: txForm.type==='expense'?ORANGE:TEAL, color:'#fff', border:'none', ...DF, fontWeight:900, fontSize:14, cursor:'pointer', marginTop:2 }}>
                Ajouter la transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
