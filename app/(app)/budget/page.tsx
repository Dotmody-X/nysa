'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Target, Zap, Calendar, MoreVertical, ExternalLink,
  Trash2, Edit2, X, Check, Save, BarChart2, RefreshCw,
} from 'lucide-react'
import { useBudget, useMultiMonthSummary, INITIAL_COMPTES, EXCEL_CATEGORIES, type NewTransaction, type BudgetCategory } from '@/hooks/useBudget'

// ── Constantes ──────────────────────────────────────────────────────────────
const ORANGE  = '#F2542D'
const TEAL    = '#0E9594'
const TEAL_BG = '#11686A'
const WHEAT   = '#F0E4CC'
const DARK    = '#16162A'
const PALETTE = ['#F2542D','#0E9594','#E8A838','#7C6FAF','#3ABCB8','#E46A45','#9B72CF','#C45E3E','#5E9C8F','#E8C84A']
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Compte     = { id:string; name:string; balance:number; type:string; icon:string }
type Goal       = { id:string; label:string; target:number; current:number; color:string; icon:string }
type PanelType  = 'analyse'|'budget'|'comptes'|'transactions'|'paiements'|'objectifs'|'tresorerie'|'ai' | null

function fmtEur(n: number, sign = false) {
  const s = Math.abs(n).toLocaleString('fr-BE', { minimumFractionDigits:0, maximumFractionDigits:2 })
  return (sign && n > 0 ? '+' : sign && n < 0 ? '-' : '') + s + ' €'
}
function fmtK(n: number) {
  if (Math.abs(n) >= 1000) return `${Math.round(n/100)/10}k €`
  return fmtEur(n)
}

// ── Donut SVG ───────────────────────────────────────────────────────────────
function DonutChart({ segments, total, size = 150 }: {
  segments: { value:number; color:string }[]
  total: number; size?: number
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

// ── Flux bar chart ──────────────────────────────────────────────────────────
function FluxChart({ months }: { months: { label:string; income:number; expense:number; balance:number }[] }) {
  if (!months.length) return null
  const max = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1)
  const H = 120
  return (
    <svg width="100%" height={H+28} style={{ overflow:'visible' }}>
      {[0,.5,1].map(p => (
        <line key={p} x1="0" x2="100%" y1={H - p*H} y2={H - p*H}
          stroke="rgba(240,228,204,0.07)" strokeWidth="1"/>
      ))}
      {months.map((m, i) => {
        const x    = (i/(months.length-1||1))*90+5
        const barW = 80/months.length*0.4
        const iH   = (m.income/max)*H
        const eH   = (m.expense/max)*H
        return (
          <g key={i}>
            <rect x={`${x-2}%`} y={H-iH} width={`${barW}%`} height={iH} fill={TEAL} opacity="0.85" rx="2"/>
            <rect x={`${x+1.5}%`} y={H-eH} width={`${barW}%`} height={eH} fill={ORANGE} opacity="0.85" rx="2"/>
            <text x={`${x}%`} y={H+18} textAnchor="middle" fill="rgba(240,228,204,0.4)" fontSize="9">{m.label}</text>
          </g>
        )
      })}
      {months.length > 1 && (
        <polyline
          points={months.map((m,i) => `${(i/(months.length-1))*90+5}%,${H - (m.balance/max)*0.6*H}`).join(' ')}
          fill="none" stroke={WHEAT} strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2"/>
      )}
    </svg>
  )
}

// ── FooterLink cliquable ────────────────────────────────────────────────────
function FooterLink({ label, onClick }: { label:string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding:'12px 20px', borderLeft:0, borderRight:0, borderBottom:0, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, marginTop:'auto', width:'100%', background:'transparent', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,228,204,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <span style={{ fontSize:10, fontWeight:700, color: onClick ? 'var(--text-muted)' : 'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</span>
      <ExternalLink size={11} style={{ color:'var(--text-muted)' }}/>
    </button>
  )
}

// ── Drawer (panneau latéral) ────────────────────────────────────────────────
function Drawer({ title, open, onClose, children, width = 480 }: {
  title: string; open: boolean; onClose: () => void
  children: React.ReactNode; width?: number
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(22,22,42,0.6)', backdropFilter:'blur(4px)', zIndex:200 }}/>
      )}
      {/* Panel */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width, zIndex:201,
        background:'var(--bg-card)', borderLeft:'1px solid var(--border-active)',
        display:'flex', flexDirection:'column',
        transform: open ? 'translateX(0)' : `translateX(${width}px)`,
        transition:'transform 0.28s cubic-bezier(0.32,0,0.12,1)',
        boxShadow: open ? '-20px 0 60px rgba(0,0,0,0.4)' : 'none',
      }}>
        {/* Drawer header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h2 style={{ ...DF, fontSize:16, fontWeight:900, color:WHEAT }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Composant de saisie inline éditable ────────────────────────────────────
function InlineEdit({ value, onSave, prefix = '', suffix = '', type = 'text' }: {
  value: string|number; onSave: (v: string) => void
  prefix?: string; suffix?: string; type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(String(value))
  function commit() { onSave(draft); setEditing(false) }
  if (editing) return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <input type={type} value={draft} onChange={e=>setDraft(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }}
        style={{ width:90, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border-active)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, ...DF, fontWeight:700 }}/>
      <button onClick={commit} style={{ color:TEAL, background:'none', border:'none', cursor:'pointer' }}><Check size={13}/></button>
    </div>
  )
  return (
    <button onClick={()=>{setDraft(String(value));setEditing(true)}}
      style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
      <span style={{ ...DF, fontSize:13, fontWeight:700, color:WHEAT }}>{prefix}{value}{suffix}</span>
      <Edit2 size={10} style={{ color:'var(--text-muted)', opacity:0.5 }}/>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function BudgetPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const prevYear  = month===1 ? year-1 : year
  const prevMonth = month===1 ? 12 : month-1

  const cur        = useBudget(year, month)
  const prev       = useBudget(prevYear, prevMonth)
  const multiMonth = useMultiMonthSummary(year, month, 6)

  // ── UI state ──
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [showTxModal, setShowTxModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [txForm, setTxForm] = useState<NewTransaction>({
    amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'',
  })
  const [txSearch, setTxSearch] = useState('')

  // ── Comptes localStorage ──
  const [comptes,  setComptes]  = useState<Compte[]>([])
  const [goals,    setGoals]    = useState<Goal[]>([])
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setComptes(JSON.parse(localStorage.getItem('nysa_comptes_v2') || 'null') ?? INITIAL_COMPTES)
    setGoals(JSON.parse(localStorage.getItem('nysa_objectifs_v2') || 'null') ?? [
      { id:'ep_nath',     label:'Ep. Nath',      target:5000,  current:500,  color:TEAL,     icon:'💰' },
      { id:'ep_rev_nath', label:'Ep. Rev Nath',  target:3000,  current:250,  color:'#7C6FAF',icon:'📈' },
      { id:'ep_couple',   label:'Ep. Couple',    target:10000, current:0,    color:'#E8A838',icon:'👫' },
      { id:'urgence',     label:'Fonds urgence', target:6000,  current:3000, color:'#3ABCB8',icon:'🛡' },
    ])
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) localStorage.setItem('nysa_comptes_v2',   JSON.stringify(comptes))  }, [comptes,  hydrated])
  useEffect(() => { if (hydrated) localStorage.setItem('nysa_objectifs_v2', JSON.stringify(goals))    }, [goals,    hydrated])

  // ── Computed ──
  const monthName = new Date(year, month-1, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
  const savings   = cur.totalIncome > 0 ? Math.round((cur.balance/cur.totalIncome)*100) : 0
  const totalComptes = comptes.reduce((s,c) => s+c.balance, 0)
  const deltaIncome  = cur.totalIncome  - prev.totalIncome
  const deltaExpense = cur.totalExpense - prev.totalExpense
  const investSpent  = cur.transactions.filter(t=>t.budget_categories?.name==='Invest').reduce((s,t)=>s+t.amount,0)
  const totalSavingsInvest = cur.totalSavings + investSpent

  // Upcoming bills
  const upcomingBills = cur.categories
    .filter(c => c.subtype==='bill')
    .map(cat => {
      const budget = cat.budget_monthly ?? 0
      const paid = cur.transactions.filter(t=>t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
      const isPaid = paid >= budget * 0.8
      const dueDay = cat.name==='Internet' ? 23 : cat.name==='Frais' ? 30 : 1
      return { cat, budget, paid, isPaid, dueDate: new Date(year, month-1, dueDay) }
    })

  // Tx filtrées
  const filteredTx = cur.transactions
    .filter(t => selectedAccount==='all' || t.account===selectedAccount)
    .filter(t => !txSearch || (t.description??'').toLowerCase().includes(txSearch.toLowerCase()))

  function prevMo() { if (month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMo() { if (month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1) }
  const panel = (p: PanelType) => setActivePanel(p)

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount) return
    await cur.addTransaction(txForm)
    setShowTxModal(false)
    setTxForm({ amount:0, type:'expense', date: now.toISOString().slice(0,10), description:'' })
  }

  // ── Styles partagés ──
  const CARD: React.CSSProperties = {
    background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)',
    overflow:'hidden', display:'flex', flexDirection:'column',
  }
  const LBL: React.CSSProperties = { ...DF, fontSize:10, fontWeight:800, letterSpacing:'0.13em', textTransform:'uppercase' }
  const HDR: React.CSSProperties = { padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }
  const INPUT: React.CSSProperties = { padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13, boxSizing:'border-box' as any, width:'100%' }

  // ════ CONTENU DES PANNEAUX ════════════════════════════════════════════════

  // ── Panel : Analyse complète ──
  const PanelAnalyse = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Répartition détaillée des dépenses par catégorie ce mois.</p>
      {/* Donut centré */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        <div style={{ position:'relative' }}>
          <DonutChart size={180}
            segments={cur.byCategory.map((c,i) => ({ value:c.spent, color: c.color??PALETTE[i%PALETTE.length] }))}
            total={cur.totalExpense}/>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
            <p style={{ ...DF, fontSize:16, fontWeight:900, color:WHEAT }}>{fmtEur(cur.totalExpense)}</p>
            <p style={{ fontSize:9, color:'rgba(240,228,204,0.5)' }}>Total</p>
          </div>
        </div>
      </div>
      {/* Tableau détaillé */}
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 60px 60px', padding:'7px 12px', background:'var(--bg-input)', borderRadius:'10px 10px 0 0', borderBottom:'1px solid var(--border)' }}>
          {['Catégorie','Montant','% Total','vs Budget'].map(h => (
            <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>{h}</span>
          ))}
        </div>
        {cur.byCategory.map((cat,i) => {
          const pct    = cur.totalExpense > 0 ? Math.round(cat.spent/cur.totalExpense*100) : 0
          const budget = cat.budget_monthly ?? 0
          const vsBud  = budget > 0 ? Math.round(cat.spent/budget*100) : null
          const over   = vsBud && vsBud > 100
          return (
            <div key={cat.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 60px 60px', padding:'10px 12px', borderBottom:'1px solid var(--border)', alignItems:'center', background: i%2===0 ? 'transparent' : 'rgba(240,228,204,0.02)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:cat.color??PALETTE[i%PALETTE.length] }}/>
                <span style={{ fontSize:11, color:'var(--text)' }}>{cat.name}</span>
              </div>
              <span style={{ ...DF, fontSize:12, fontWeight:700, color:WHEAT }}>{fmtEur(cat.spent)}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{pct}%</span>
              <span style={{ fontSize:11, color: over ? ORANGE : TEAL }}>{vsBud !== null ? `${vsBud}%` : '—'}</span>
            </div>
          )
        })}
      </div>
      {/* Résumé mois vs mois préc */}
      <div style={{ background:'var(--bg-input)', borderRadius:12, padding:'14px 16px' }}>
        <p style={{ ...LBL, color:'var(--text-muted)', marginBottom:10 }}>Comparaison mois précédent</p>
        {[
          { label:'Revenus',  cur:cur.totalIncome,  prev:prev.totalIncome  },
          { label:'Dépenses', cur:cur.totalExpense, prev:prev.totalExpense },
          { label:'Solde',    cur:cur.balance,      prev:prev.balance      },
        ].map(row => {
          const delta = row.cur - row.prev
          return (
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{row.label}</span>
              <div style={{ display:'flex', gap:12, alignItems:'baseline' }}>
                <span style={{ ...DF, fontSize:13, fontWeight:700, color:WHEAT }}>{fmtEur(row.cur)}</span>
                <span style={{ fontSize:10, color: delta >= 0 ? TEAL : ORANGE }}>{fmtEur(delta, true)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Panel : Gérer le budget ──
  const [editingBudget, setEditingBudget] = useState<Record<string,string>>({})
  const [savingBudget,  setSavingBudget]  = useState<string|null>(null)
  const [newCatForm, setNewCatForm] = useState<{show:boolean; name:string; subtype:string; budget:string; color:string; icon:string}>({
    show:false, name:'', subtype:'expense', budget:'', color:ORANGE, icon:'📦'
  })

  async function saveCatBudget(catId: string) {
    const val = parseFloat(editingBudget[catId])
    if (isNaN(val)) return
    setSavingBudget(catId)
    await cur.updateCategory(catId, { budget_monthly: val })
    setSavingBudget(null)
    setEditingBudget(p => { const n={...p}; delete n[catId]; return n })
  }

  async function addNewCategory() {
    if (!newCatForm.name) return
    await cur.addCategory({
      name: newCatForm.name,
      type: newCatForm.subtype === 'income' ? 'income' : 'expense',
      subtype: newCatForm.subtype as any,
      budget_monthly: parseFloat(newCatForm.budget) || 0,
      color: newCatForm.color,
      icon: newCatForm.icon,
    })
    setNewCatForm({ show:false, name:'', subtype:'expense', budget:'', color:ORANGE, icon:'📦' })
  }

  const SUBTYPES = [
    { key:'income', label:'Revenu', color:TEAL },
    { key:'bill',   label:'Charge fixe', color:'#7C6FAF' },
    { key:'expense',label:'Dépense variable', color:ORANGE },
    { key:'savings',label:'Épargne', color:'#3ABCB8' },
  ] as const

  const PanelBudget = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Modifiez les budgets mensuels par catégorie.</p>
      {SUBTYPES.map(({ key, label, color }) => {
        const cats = cur.categories.filter(c => c.subtype === key || (key==='income' && c.type==='income'))
        if (cats.length === 0) return null
        return (
          <div key={key}>
            <p style={{ ...LBL, color, marginBottom:8 }}>{label}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
              {cats.map((cat, i) => {
                const isEditing = editingBudget[cat.id] !== undefined
                return (
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom: i<cats.length-1 ? '1px solid var(--border)' : 'none', background:'var(--bg-card)' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{cat.icon ?? '●'}</span>
                    <span style={{ fontSize:12, color:'var(--text)', flex:1 }}>{cat.name}</span>
                    {isEditing ? (
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <input type="number" min="0" step="0.5"
                          value={editingBudget[cat.id]}
                          onChange={e => setEditingBudget(p => ({...p, [cat.id]: e.target.value}))}
                          onKeyDown={e => { if (e.key==='Enter') saveCatBudget(cat.id); if (e.key==='Escape') setEditingBudget(p=>{const n={...p};delete n[cat.id];return n}) }}
                          style={{ width:80, padding:'5px 8px', borderRadius:7, border:`1px solid ${color}`, background:'var(--bg-input)', color:'var(--text)', fontSize:13, ...DF, fontWeight:700 }}
                          autoFocus/>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>€</span>
                        <button onClick={() => saveCatBudget(cat.id)} style={{ background:color, color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, cursor:'pointer', ...DF, fontWeight:700 }}>
                          {savingBudget===cat.id ? '…' : 'OK'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingBudget(p => ({...p, [cat.id]: String(cat.budget_monthly??0)}))}
                        style={{ display:'flex', alignItems:'center', gap:5, background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer' }}>
                        <span style={{ ...DF, fontSize:12, fontWeight:700, color:WHEAT }}>{fmtEur(cat.budget_monthly??0)}</span>
                        <Edit2 size={9} style={{ color:'var(--text-muted)' }}/>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {/* Nouvelle catégorie */}
      {newCatForm.show ? (
        <div style={{ background:'var(--bg-input)', borderRadius:12, padding:16, border:'1px solid var(--border-active)', display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ ...LBL, color:'var(--text-muted)' }}>Nouvelle catégorie</p>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Nom" value={newCatForm.name} onChange={e=>setNewCatForm(p=>({...p,name:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <input placeholder="🏷" value={newCatForm.icon} onChange={e=>setNewCatForm(p=>({...p,icon:e.target.value}))} style={{ ...INPUT, width:60 }}/>
          </div>
          <select value={newCatForm.subtype} onChange={e=>setNewCatForm(p=>({...p,subtype:e.target.value}))} style={INPUT}>
            {SUBTYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div style={{ display:'flex', gap:8 }}>
            <input type="number" placeholder="Budget mensuel (€)" value={newCatForm.budget} onChange={e=>setNewCatForm(p=>({...p,budget:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <input type="color" value={newCatForm.color} onChange={e=>setNewCatForm(p=>({...p,color:e.target.value}))} style={{ width:40, height:42, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'transparent' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addNewCategory} style={{ flex:1, padding:'10px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>
              Créer la catégorie
            </button>
            <button onClick={()=>setNewCatForm(p=>({...p,show:false}))} style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setNewCatForm(p=>({...p,show:true}))}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:12, background:'transparent', border:`1px dashed var(--border)`, color:'var(--text-muted)', cursor:'pointer', width:'100%', justifyContent:'center' }}>
          <Plus size={14}/> Ajouter une catégorie
        </button>
      )}
    </div>
  )

  // ── Panel : Comptes ──
  const [editingCompte, setEditingCompte] = useState<string|null>(null)
  const [newCompteForm, setNewCompteForm] = useState<{show:boolean; name:string; balance:string; icon:string; type:string}>({
    show:false, name:'', balance:'', icon:'🏦', type:'bank'
  })

  function updateCompteBalance(id: string, val: string) {
    const n = parseFloat(val)
    if (!isNaN(n)) setComptes(cs => cs.map(c => c.id===id ? {...c, balance:n} : c))
    setEditingCompte(null)
  }

  function deleteCompte(id: string) { setComptes(cs => cs.filter(c => c.id!==id)) }

  function addCompte() {
    if (!newCompteForm.name) return
    const id = `compte_${Date.now()}`
    setComptes(cs => [...cs, { id, name:newCompteForm.name, balance:parseFloat(newCompteForm.balance)||0, type:newCompteForm.type, icon:newCompteForm.icon }])
    setNewCompteForm({ show:false, name:'', balance:'', icon:'🏦', type:'bank' })
  }

  const PanelComptes = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Gérez vos comptes et soldes. Cliquez sur un solde pour le modifier.</p>
      <div style={{ background:'var(--bg-input)', borderRadius:12, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>Patrimoine total estimé</span>
        <span style={{ ...DF, fontSize:20, fontWeight:900, color:WHEAT }}>{fmtEur(totalComptes)}</span>
      </div>
      {comptes.map((compte) => (
        <div key={compte.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {compte.icon}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:12, color:'var(--text)', fontWeight:600 }}>{compte.name}</p>
            <p style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{compte.type}</p>
          </div>
          {editingCompte === compte.id ? (
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="number" step="0.01" defaultValue={compte.balance}
                id={`compte-edit-${compte.id}`}
                style={{ width:90, padding:'6px 9px', borderRadius:8, border:`1px solid ${TEAL}`, background:'var(--bg-input)', color:'var(--text)', fontSize:13, ...DF, fontWeight:700 }}
                onKeyDown={e => { if (e.key==='Enter') updateCompteBalance(compte.id, (e.target as HTMLInputElement).value); if (e.key==='Escape') setEditingCompte(null) }}
                autoFocus/>
              <button onClick={e => { const inp = document.getElementById(`compte-edit-${compte.id}`) as HTMLInputElement; if (inp) updateCompteBalance(compte.id, inp.value) }}
                style={{ background:TEAL, color:'#fff', border:'none', borderRadius:6, padding:'6px 10px', cursor:'pointer' }}>
                <Check size={12}/>
              </button>
            </div>
          ) : (
            <button onClick={()=>setEditingCompte(compte.id)}
              style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ ...DF, fontWeight:700, fontSize:15, color: compte.balance < 0 ? ORANGE : TEAL }}>
                {compte.balance < 0 ? '-' : ''}{fmtEur(Math.abs(compte.balance))}
              </span>
              <Edit2 size={10} style={{ color:'var(--text-muted)' }}/>
            </button>
          )}
          <button onClick={()=>deleteCompte(compte.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
            <Trash2 size={13}/>
          </button>
        </div>
      ))}
      {newCompteForm.show ? (
        <div style={{ background:'var(--bg-input)', borderRadius:12, padding:16, border:'1px solid var(--border-active)', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Nom" value={newCompteForm.name} onChange={e=>setNewCompteForm(p=>({...p,name:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <input placeholder="🏦" value={newCompteForm.icon} onChange={e=>setNewCompteForm(p=>({...p,icon:e.target.value}))} style={{ ...INPUT, width:60 }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input type="number" placeholder="Solde initial (€)" value={newCompteForm.balance} onChange={e=>setNewCompteForm(p=>({...p,balance:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <select value={newCompteForm.type} onChange={e=>setNewCompteForm(p=>({...p,type:e.target.value}))} style={{ ...INPUT, flex:1 }}>
              <option value="bank">Banque</option>
              <option value="savings">Épargne</option>
              <option value="credit">Carte crédit</option>
              <option value="cash">Espèces</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addCompte} style={{ flex:1, padding:'10px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>
              Ajouter le compte
            </button>
            <button onClick={()=>setNewCompteForm(p=>({...p,show:false}))} style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setNewCompteForm(p=>({...p,show:true}))}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:12, background:'transparent', border:'1px dashed var(--border)', color:'var(--text-muted)', cursor:'pointer', width:'100%', justifyContent:'center' }}>
          <Plus size={14}/> Ajouter un compte
        </button>
      )}
    </div>
  )

  // ── Panel : Toutes les transactions ──
  const PanelTransactions = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
      <input type="text" placeholder="Rechercher…" value={txSearch} onChange={e=>setTxSearch(e.target.value)}
        style={{ ...INPUT, marginBottom:4 }}/>
      <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{filteredTx.length} transaction{filteredTx.length!==1?'s':''}</span>
        <button onClick={()=>{ setShowTxModal(true); setActivePanel(null) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, fontSize:11, cursor:'pointer' }}>
          <Plus size={12}/> Nouvelle
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
        {filteredTx.length === 0
          ? <p style={{ padding:20, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Aucune transaction</p>
          : filteredTx.map((tx, i) => (
            <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderBottom: i<filteredTx.length-1 ? '1px solid var(--border)' : 'none', background: i%2===0 ? 'var(--bg-card)' : 'rgba(240,228,204,0.02)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background: tx.type==='income'?'rgba(14,149,148,0.15)':'rgba(242,84,45,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {tx.type==='income' ? <TrendingUp size={11} style={{color:TEAL}}/> : <TrendingDown size={11} style={{color:ORANGE}}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description || 'Sans description'}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>
                  {tx.budget_categories?.name ?? '—'} · {tx.account ?? '—'} · {new Date(tx.date).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'})}
                </p>
              </div>
              <span style={{ ...DF, fontWeight:700, fontSize:13, color: tx.type==='income'?TEAL:ORANGE, flexShrink:0 }}>
                {tx.type==='income'?'+':'-'}{fmtEur(tx.amount)}
              </span>
              <button onClick={()=>cur.removeTransaction(tx.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:3, flexShrink:0 }}>
                <Trash2 size={12}/>
              </button>
            </div>
          ))
        }
      </div>
    </div>
  )

  // ── Panel : Paiements ──
  const PanelPaiements = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:10 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Charges fixes récurrentes de ce mois et leur statut de paiement.</p>
      {upcomingBills.map(({ cat, budget, paid, isPaid, dueDate }) => (
        <div key={cat.id} style={{ padding:'14px 16px', borderRadius:12, background: isPaid ? 'rgba(14,149,148,0.07)' : 'var(--bg-card)', border:`1px solid ${isPaid ? 'rgba(14,149,148,0.25)' : 'var(--border)'}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>{cat.icon ?? '💳'}</span>
              <div>
                <p style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>{cat.name}</p>
                <p style={{ fontSize:9, color:'var(--text-muted)' }}>
                  Échéance : {dueDate.toLocaleDateString('fr-FR', {day:'2-digit', month:'long'})}
                </p>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ ...DF, fontSize:15, fontWeight:900, color: isPaid ? TEAL : ORANGE }}>-{fmtEur(budget)}</p>
              <span style={{ fontSize:9, padding:'2px 7px', borderRadius:5, background: isPaid ? 'rgba(14,149,148,0.15)' : 'rgba(242,84,45,0.12)', color: isPaid ? TEAL : ORANGE }}>
                {isPaid ? 'Payé' : `Reste ${fmtEur(budget-paid)}`}
              </span>
            </div>
          </div>
          {budget > 0 && (
            <div style={{ height:4, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background: isPaid ? TEAL : ORANGE, width:`${Math.min(100, paid/budget*100)}%` }}/>
            </div>
          )}
        </div>
      ))}
      {upcomingBills.length === 0 && (
        <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:30 }}>Aucune charge fixe configurée</p>
      )}
    </div>
  )

  // ── Panel : Objectifs ──
  const [editingGoal, setEditingGoal] = useState<string|null>(null)
  const [goalDraft, setGoalDraft] = useState<Partial<Goal>>({})
  const [newGoalForm, setNewGoalForm] = useState<{show:boolean; label:string; target:string; current:string; color:string; icon:string}>({
    show:false, label:'', target:'', current:'', color:TEAL, icon:'🎯'
  })

  function saveGoal(id: string) {
    setGoals(gs => gs.map(g => g.id===id ? {...g, ...goalDraft} as Goal : g))
    setEditingGoal(null)
    setGoalDraft({})
  }

  function deleteGoal(id: string) { setGoals(gs => gs.filter(g => g.id!==id)) }

  function addGoal() {
    if (!newGoalForm.label) return
    setGoals(gs => [...gs, { id:`goal_${Date.now()}`, label:newGoalForm.label, target:parseFloat(newGoalForm.target)||1000, current:parseFloat(newGoalForm.current)||0, color:newGoalForm.color, icon:newGoalForm.icon }])
    setNewGoalForm({ show:false, label:'', target:'', current:'', color:TEAL, icon:'🎯' })
  }

  const PanelObjectifs = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Gérez vos objectifs d'épargne. Cliquez sur ✏ pour modifier.</p>
      {goals.map((g) => {
        const pct  = g.target > 0 ? Math.min(100, Math.round(g.current/g.target*100)) : 0
        const isEd = editingGoal === g.id
        return (
          <div key={g.id} style={{ padding:'16px', borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            {isEd ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <input placeholder="Libellé" value={goalDraft.label??g.label} onChange={e=>setGoalDraft(p=>({...p,label:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
                  <input placeholder="🎯" value={goalDraft.icon??g.icon} onChange={e=>setGoalDraft(p=>({...p,icon:e.target.value}))} style={{ ...INPUT, width:60 }}/>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="number" placeholder="Objectif (€)" value={goalDraft.target??g.target} onChange={e=>setGoalDraft(p=>({...p,target:parseFloat(e.target.value)||0}))} style={{ ...INPUT, flex:1 }}/>
                  <input type="number" placeholder="Actuel (€)" value={goalDraft.current??g.current} onChange={e=>setGoalDraft(p=>({...p,current:parseFloat(e.target.value)||0}))} style={{ ...INPUT, flex:1 }}/>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" value={goalDraft.color??g.color} onChange={e=>setGoalDraft(p=>({...p,color:e.target.value}))} style={{ width:40, height:38, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'transparent' }}/>
                  <button onClick={()=>saveGoal(g.id)} style={{ flex:1, padding:'9px', borderRadius:9, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>Sauvegarder</button>
                  <button onClick={()=>{setEditingGoal(null);setGoalDraft({})}} style={{ padding:'9px 12px', borderRadius:9, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${g.color}22`, border:`1px solid ${g.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                      {g.icon}
                    </div>
                    <div>
                      <p style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>{g.label}</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtEur(g.current)} / {fmtEur(g.target)}</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ ...DF, fontSize:18, fontWeight:900, color: pct>=100?TEAL:WHEAT }}>{pct}%</span>
                    <button onClick={()=>{setEditingGoal(g.id);setGoalDraft({})}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><Edit2 size={12}/></button>
                    <button onClick={()=>deleteGoal(g.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><Trash2 size={12}/></button>
                  </div>
                </div>
                <div style={{ height:6, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background: pct>=100?TEAL:g.color, width:`${pct}%`, transition:'width 0.5s' }}/>
                </div>
              </>
            )}
          </div>
        )
      })}
      {newGoalForm.show ? (
        <div style={{ background:'var(--bg-input)', borderRadius:12, padding:16, border:'1px solid var(--border-active)', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Libellé" value={newGoalForm.label} onChange={e=>setNewGoalForm(p=>({...p,label:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <input placeholder="🎯" value={newGoalForm.icon} onChange={e=>setNewGoalForm(p=>({...p,icon:e.target.value}))} style={{ ...INPUT, width:60 }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input type="number" placeholder="Objectif (€)" value={newGoalForm.target} onChange={e=>setNewGoalForm(p=>({...p,target:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
            <input type="number" placeholder="Actuel (€)" value={newGoalForm.current} onChange={e=>setNewGoalForm(p=>({...p,current:e.target.value}))} style={{ ...INPUT, flex:1 }}/>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="color" value={newGoalForm.color} onChange={e=>setNewGoalForm(p=>({...p,color:e.target.value}))} style={{ width:40, height:40, borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', background:'transparent' }}/>
            <button onClick={addGoal} style={{ flex:1, padding:'10px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>
              Créer l'objectif
            </button>
            <button onClick={()=>setNewGoalForm(p=>({...p,show:false}))} style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer' }}>✕</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setNewGoalForm(p=>({...p,show:true}))}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:12, background:'transparent', border:'1px dashed var(--border)', color:'var(--text-muted)', cursor:'pointer', width:'100%', justifyContent:'center' }}>
          <Plus size={14}/> Ajouter un objectif
        </button>
      )}
    </div>
  )

  // ── Panel : Rapport de trésorerie ──
  const PanelTresorerie = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
      <p style={{ fontSize:12, color:'var(--text-muted)' }}>Évolution mensuelle sur les 6 derniers mois.</p>
      <div style={{ background:'var(--bg-input)', borderRadius:12, padding:'14px 16px' }}>
        <FluxChart months={multiMonth}/>
        <div style={{ display:'flex', gap:16, marginTop:6 }}>
          {[{c:TEAL,l:'Revenus'},{c:ORANGE,l:'Dépenses'},{c:WHEAT,l:'Solde'}].map(({c,l}) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
              <span style={{ fontSize:9, color:'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Tableau mensuel */}
      <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px', padding:'8px 14px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)' }}>
          {['Mois','Revenus','Dépenses','Solde'].map(h => (
            <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>{h}</span>
          ))}
        </div>
        {multiMonth.map((m, i) => (
          <div key={m.key} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px', padding:'10px 14px', borderBottom: i<multiMonth.length-1 ? '1px solid var(--border)' : 'none', background: i%2===0 ? 'transparent' : 'rgba(240,228,204,0.02)' }}>
            <span style={{ ...DF, fontSize:12, fontWeight:700, color:WHEAT, textTransform:'capitalize' }}>{m.label}</span>
            <span style={{ fontSize:11, color:TEAL }}>{fmtK(m.income)}</span>
            <span style={{ fontSize:11, color:ORANGE }}>{fmtK(m.expense)}</span>
            <span style={{ ...DF, fontSize:11, fontWeight:700, color: m.balance>=0?TEAL:ORANGE }}>{fmtK(m.balance)}</span>
          </div>
        ))}
        {multiMonth.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px', padding:'10px 14px', background:'var(--bg-input)', borderTop:'1px solid var(--border)' }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Total</span>
            <span style={{ ...DF, fontSize:12, fontWeight:900, color:TEAL }}>{fmtK(multiMonth.reduce((s,m)=>s+m.income,0))}</span>
            <span style={{ ...DF, fontSize:12, fontWeight:900, color:ORANGE }}>{fmtK(multiMonth.reduce((s,m)=>s+m.expense,0))}</span>
            <span style={{ ...DF, fontSize:12, fontWeight:900, color: multiMonth.reduce((s,m)=>s+m.balance,0)>=0?TEAL:ORANGE }}>{fmtK(multiMonth.reduce((s,m)=>s+m.balance,0))}</span>
          </div>
        )}
      </div>
    </div>
  )

  // ── Panel : Insight IA ──
  const PanelAI = (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:TEAL_BG, borderRadius:12, padding:'16px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
        <Zap size={20} style={{ color:WHEAT, flexShrink:0, marginTop:2 }}/>
        <div>
          <p style={{ ...LBL, color:WHEAT, opacity:0.7, marginBottom:6 }}>Analyse du mois</p>
          <p style={{ fontSize:13, color:'rgba(240,228,204,0.92)', lineHeight:1.7 }}>
            {cur.loading ? 'Analyse en cours…'
             : cur.balance < 0
               ? `⚠ Déficit de ${fmtEur(Math.abs(cur.balance))} ce mois. Les dépenses dépassent les revenus de ${Math.abs(Math.round((cur.totalExpense/cur.totalIncome-1)*100))}%.`
               : `Solde positif de ${fmtEur(cur.balance)}. Taux d'épargne : ${savings}%.`}
          </p>
        </div>
      </div>
      {/* Points d'attention */}
      <p style={{ ...LBL, color:'var(--text-muted)' }}>Points d'attention</p>
      {cur.byCategory.filter(c => c.budget_monthly && c.spent > c.budget_monthly).map(cat => (
        <div key={cat.id} style={{ padding:'12px 14px', borderRadius:10, background:'rgba(242,84,45,0.08)', border:'1px solid rgba(242,84,45,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>{cat.icon ?? '⚠'}</span>
            <div>
              <p style={{ fontSize:12, color:ORANGE }}>{cat.name}</p>
              <p style={{ fontSize:9, color:'var(--text-muted)' }}>Budget dépassé de {fmtEur(cat.spent - (cat.budget_monthly??0))}</p>
            </div>
          </div>
          <span style={{ ...DF, fontSize:12, fontWeight:700, color:ORANGE }}>
            {Math.round(cat.spent/(cat.budget_monthly??1)*100)}%
          </span>
        </div>
      ))}
      {cur.byCategory.filter(c => c.budget_monthly && c.spent > c.budget_monthly).length === 0 && (
        <div style={{ padding:'14px', borderRadius:10, background:'rgba(14,149,148,0.08)', border:'1px solid rgba(14,149,148,0.2)', textAlign:'center' }}>
          <p style={{ fontSize:12, color:TEAL }}>✓ Tous les budgets sont respectés ce mois</p>
        </div>
      )}
      {/* Conseils */}
      <p style={{ ...LBL, color:'var(--text-muted)' }}>Conseils</p>
      {[
        savings < 10  && `Votre taux d'épargne (${savings}%) est faible. Visez 10-20%.`,
        savings >= 20 && `Excellent taux d'épargne (${savings}%) ! Continuez ainsi.`,
        cur.totalBills > cur.totalIncome * 0.5 && `Vos charges fixes représentent ${Math.round(cur.totalBills/cur.totalIncome*100)}% de vos revenus.`,
        cur.totalSavings === 0 && `Aucune épargne enregistrée ce mois. Pensez à alimenter vos épargnes.`,
      ].filter(Boolean).map((conseil, i) => (
        <div key={i} style={{ padding:'11px 14px', borderRadius:10, background:'var(--bg-input)', border:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:14 }}>💡</span>
          <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{conseil as string}</p>
        </div>
      ))}
    </div>
  )

  // ── Mapping panel → titre + contenu ──
  const PANELS: Record<NonNullable<PanelType>, { title:string; content: React.ReactNode; width?:number }> = {
    analyse:      { title:'Analyse complète des dépenses',   content: PanelAnalyse,       width:500 },
    budget:       { title:'Gérer mon budget',                content: PanelBudget,        width:480 },
    comptes:      { title:'Mes comptes',                     content: PanelComptes,       width:440 },
    transactions: { title:'Toutes les transactions',         content: PanelTransactions,  width:500 },
    paiements:    { title:'Paiements & charges récurrents',  content: PanelPaiements,     width:460 },
    objectifs:    { title:'Objectifs financiers',            content: PanelObjectifs,     width:460 },
    tresorerie:   { title:'Rapport de trésorerie',           content: PanelTresorerie,    width:480 },
    ai:           { title:'Insight de l\'Agent IA',          content: PanelAI,            width:460 },
  }

  // ════════ RENDU ════════════════════════════════════════════════════════════

  return (
    <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:14, minHeight:'100%' }}>

      {/* ════ HEADER ════ */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
        <div>
          <h1 style={{ ...DF, fontSize:44, fontWeight:900, color:WHEAT, letterSpacing:'-0.02em', lineHeight:1, marginBottom:3 }}>BUDGET.</h1>
          <p style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
            MAÎTRISEZ · PLANIFIEZ · ATTEIGNEZ VOS OBJECTIFS
          </p>
        </div>
        {/* Résumé du mois */}
        <div style={{ background:ORANGE, borderRadius:16, padding:'14px 20px', display:'flex', gap:0, flexShrink:0, minWidth:500 }}>
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
                { l:'Revenus',       v:fmtEur(cur.totalIncome),        d:deltaIncome,   pos:deltaIncome>=0   },
                { l:'Dépenses',      v:fmtEur(cur.totalExpense),       d:-deltaExpense, pos:deltaExpense<=0  },
                { l:'Épargne / Inv.',v:fmtEur(totalSavingsInvest),     d:cur.totalSavings-prev.totalSavings, pos:true },
              ].map((kpi,i) => (
                <div key={i} style={{ borderLeft:i>0?'1px solid rgba(255,255,255,0.22)':undefined, paddingLeft:i>0?18:undefined, paddingRight:18 }}>
                  <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginBottom:3 }}>{kpi.l}</p>
                  <p style={{ ...DF, fontSize:22, fontWeight:900, color:'#fff', lineHeight:1 }}>{kpi.v}</p>
                  {!cur.loading && <p style={{ fontSize:9, color:kpi.pos?'rgba(255,255,255,0.9)':'rgba(255,220,200,0.9)', marginTop:2 }}>{fmtEur(Math.abs(kpi.d),true)} vs préc.</p>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderLeft:'1px solid rgba(255,255,255,0.22)', paddingLeft:18, display:'flex', flexDirection:'column', justifyContent:'center', minWidth:110 }}>
            <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Solde</p>
            <p style={{ ...DF, fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>{fmtEur(cur.balance)}</p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', marginTop:3 }}>{cur.balance>=0?'✓ Excédent':'⚠ Déficit'}</p>
          </div>
        </div>
      </div>

      {/* ════ FILTER BAR ════ */}
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
        <select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>
          <option value="all">Tous les comptes</option>
          {comptes.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setShowTxModal(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:10, background:TEAL, color:'#fff', border:'none', ...DF, fontWeight:700, fontSize:12, cursor:'pointer' }}>
          <Plus size={14}/> + TRANSACTION
        </button>
      </div>

      {/* ════ GRID ════ */}
      <div className="bento-grid md:grid md:grid-cols-4" style={{ gridTemplateRows:'300px 300px 500px 400px 260px', gap:12, flex:1 }}>

        {/* B1 Aperçu dépenses */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'1/2', background:TEAL_BG, border:'none' }}>
          <div style={{ ...HDR, borderBottom:'1px solid rgba(240,228,204,0.1)' }}>
            <span style={{ ...LBL, color:WHEAT }}>Aperçu des dépenses</span>
            <span style={{ fontSize:10, color:'rgba(240,228,204,0.45)' }}>{cur.byCategory.length} catégories</span>
          </div>
          <div style={{ flex:1, padding:'14px 20px', display:'flex', gap:16, alignItems:'center', overflow:'hidden' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <DonutChart size={140} segments={cur.byCategory.map((c,i)=>({value:c.spent,color:c.color??PALETTE[i%PALETTE.length]}))} total={cur.totalExpense}/>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                <p style={{ ...DF, fontSize:13, fontWeight:900, color:WHEAT, lineHeight:1 }}>{fmtEur(cur.totalExpense)}</p>
                <p style={{ fontSize:8, color:'rgba(240,228,204,0.5)', marginTop:1 }}>Total</p>
              </div>
            </div>
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', gap:6 }}>
              {cur.byCategory.length===0
                ? <p style={{ fontSize:12, color:'rgba(240,228,204,0.4)' }}>Aucune dépense</p>
                : cur.byCategory.slice(0,8).map((cat,i)=>{
                    const pct = cur.totalExpense>0 ? Math.round(cat.spent/cur.totalExpense*100) : 0
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
          <FooterLink label="Voir l'analyse complète" onClick={()=>panel('analyse')}/>
        </div>

        {/* B2 Répartition vs Budget */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'1/2' }}>
          <div style={HDR}>
            <span style={{ ...LBL, color:ORANGE }}>Répartition vs Budget</span>
            <span style={{ fontSize:9, color:'var(--text-muted)' }}>
              {cur.totalExpense>0 && cur.totalBillsBudget>0 ? `${Math.round((cur.totalExpense/cur.totalBillsBudget)*100)}% utilisé` : ''}
            </span>
          </div>
          <div style={{ flex:1, padding:'12px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:9 }}>
            {cur.loading
              ? <p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p>
              : cur.categories.filter(c=>c.type==='expense'&&(c.budget_monthly??0)>0).length===0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.5 }}><Target size={26} style={{color:'var(--text-muted)'}}/><p style={{fontSize:12,color:'var(--text-muted)'}}>Aucun budget défini</p></div>
              : cur.categories.filter(c=>c.type==='expense'&&(c.budget_monthly??0)>0).map(cat=>{
                  const spent  = cur.transactions.filter(t=>t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
                  const budget = cat.budget_monthly!
                  const pct    = Math.min(100, Math.round(spent/budget*100))
                  const over   = spent > budget
                  return (
                    <div key={cat.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:13 }}>{cat.icon??'●'}</span>
                          <span style={{ fontSize:11, color:'var(--text)' }}>{cat.name}</span>
                          {over && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:4, background:'rgba(242,84,45,0.15)', color:ORANGE }}>Dépassé</span>}
                        </div>
                        <div style={{ display:'flex', gap:5, alignItems:'baseline' }}>
                          <span style={{ ...DF, fontSize:11, fontWeight:700, color:over?ORANGE:'var(--text)' }}>{fmtEur(spent)}</span>
                          <span style={{ fontSize:9, color:'var(--text-muted)' }}>/ {fmtEur(budget)}</span>
                        </div>
                      </div>
                      <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background:over?ORANGE:(cat.color??TEAL), width:`${pct}%`, transition:'width 0.4s' }}/>
                      </div>
                    </div>
                  )
                })
            }
          </div>
          <FooterLink label="Gérer mon budget" onClick={()=>panel('budget')}/>
        </div>

        {/* B3 Comptes */}
        <div style={{ ...CARD, gridColumn:'1/2', gridRow:'2/3' }}>
          <div style={HDR}>
            <span style={{ ...LBL, color:TEAL }}>Comptes</span>
            <span style={{ fontSize:9, color:'var(--text-muted)', ...DF, fontWeight:700 }}>Solde</span>
          </div>
          <div style={{ flex:1, padding:'8px 16px', overflow:'auto' }}>
            {comptes.map((c,i)=>(
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:i<comptes.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{c.icon}</div>
                  <span style={{ fontSize:11, color:'var(--text)' }}>{c.name}</span>
                </div>
                <span style={{ ...DF, fontWeight:700, fontSize:13, color:c.balance<0?ORANGE:TEAL }}>
                  {c.balance<0?'-':''}{fmtEur(Math.abs(c.balance))}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>Total</span>
            <span style={{ ...DF, fontWeight:900, fontSize:15, color:WHEAT }}>{fmtEur(totalComptes)}</span>
          </div>
          <FooterLink label="Voir tous les comptes" onClick={()=>panel('comptes')}/>
        </div>

        {/* B4 Flux de trésorerie */}
        <div style={{ ...CARD, gridColumn:'2/5', gridRow:'2/3' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Flux de trésorerie</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>6 derniers mois</span>
              <ChevronRight size={11} style={{ color:'var(--text-muted)' }}/>
            </div>
          </div>
          <div style={{ flex:1, padding:'14px 20px', display:'flex', gap:16, overflow:'hidden' }}>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div style={{ display:'flex', gap:12, marginBottom:8 }}>
                {[{c:TEAL,l:'Revenus'},{c:ORANGE,l:'Dépenses'},{c:WHEAT,l:'Solde'}].map(({c,l})=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                    <span style={{ fontSize:9, color:'var(--text-muted)' }}>{l}</span>
                  </div>
                ))}
              </div>
              {multiMonth.length > 0
                ? <FluxChart months={multiMonth}/>
                : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity:0.4 }}>
                    <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune donnée disponible</p>
                  </div>
              }
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center', flexShrink:0, width:130 }}>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(14,149,148,0.1)', border:'1px solid rgba(14,149,148,0.2)' }}>
                <p style={{ fontSize:8, color:TEAL, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Revenus totaux</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:TEAL }}>{fmtK(multiMonth.reduce((s,m)=>s+m.income,0))}</p>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(242,84,45,0.1)', border:'1px solid rgba(242,84,45,0.2)' }}>
                <p style={{ fontSize:8, color:ORANGE, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Dépenses totales</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:ORANGE }}>{fmtK(multiMonth.reduce((s,m)=>s+m.expense,0))}</p>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:10, background:TEAL_BG }}>
                <p style={{ fontSize:8, color:WHEAT, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, opacity:0.7 }}>Solde</p>
                <p style={{ ...DF, fontSize:17, fontWeight:900, color:WHEAT }}>{fmtK(multiMonth.reduce((s,m)=>s+m.balance,0))}</p>
              </div>
            </div>
          </div>
          <FooterLink label="Voir le rapport de trésorerie" onClick={()=>panel('tresorerie')}/>
        </div>

        {/* B5 Dernières transactions */}
        <div style={{ ...CARD, gridColumn:'1/4', gridRow:'3/4' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Dernières transactions</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>{filteredTx.length} ce mois</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 110px', padding:'7px 20px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Description','Catégorie','Compte','Montant'].map(h=>(
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {cur.loading
              ? <div style={{ padding:24, textAlign:'center' }}><p style={{ fontSize:12, color:'var(--text-muted)' }}>Chargement…</p></div>
              : filteredTx.length===0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8 }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune transaction</p>
                  <button onClick={()=>setShowTxModal(true)} style={{ fontSize:11, color:ORANGE, background:'none', border:'none', ...DF, fontWeight:700, cursor:'pointer' }}>+ Ajouter</button>
                </div>
              : filteredTx.slice(0,16).map((tx)=>(
                  <div key={tx.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 110px', padding:'10px 20px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:tx.type==='income'?'rgba(14,149,148,0.15)':'rgba(242,84,45,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {tx.type==='income'?<TrendingUp size={11} style={{color:TEAL}}/>:<TrendingDown size={11} style={{color:ORANGE}}/>}
                      </div>
                      <span style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.description||'Sans description'}</span>
                    </div>
                    <div>
                      {tx.budget_categories
                        ? <span style={{ fontSize:9, padding:'3px 7px', borderRadius:5, background:`${tx.budget_categories.color??ORANGE}22`, color:tx.budget_categories.color??ORANGE, fontWeight:600 }}>{tx.budget_categories.name}</span>
                        : <span style={{ fontSize:10, color:'var(--text-muted)' }}>—</span>}
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{tx.account??'—'}</span>
                    <span style={{ ...DF, fontWeight:800, fontSize:13, color:tx.type==='income'?TEAL:ORANGE }}>
                      {tx.type==='income'?'+':'-'}{fmtEur(tx.amount)}
                    </span>
                  </div>
                ))
            }
          </div>
          <FooterLink label="Voir toutes les transactions" onClick={()=>panel('transactions')}/>
        </div>

        {/* B6 Paiements à venir */}
        <div style={{ ...CARD, gridColumn:'4/5', gridRow:'3/4' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Paiements à venir</span>
            <Calendar size={13} style={{ color:'var(--text-muted)' }}/>
          </div>
          <div style={{ flex:1, padding:'10px 16px', overflow:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {upcomingBills.length===0
              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, opacity:0.4 }}>
                  <Calendar size={24} style={{ color:'var(--text-muted)' }}/><p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>Aucune charge fixe</p>
                </div>
              : upcomingBills.map(({cat,budget,paid,isPaid,dueDate})=>(
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, background:isPaid?'rgba(14,149,148,0.06)':'var(--bg-input)', border:`1px solid ${isPaid?'rgba(14,149,148,0.2)':'var(--border)'}` }}>
                    <div style={{ textAlign:'center', minWidth:30, flexShrink:0 }}>
                      <p style={{ ...DF, fontSize:13, fontWeight:900, color:isPaid?TEAL:WHEAT, lineHeight:1 }}>{dueDate.getDate()}</p>
                      <p style={{ fontSize:8, color:'var(--text-muted)', textTransform:'uppercase' }}>{dueDate.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')}
                      </p>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:11, color:isPaid?'var(--text-muted)':'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</p>
                      <p style={{ fontSize:8, color:'var(--text-muted)', marginTop:1 }}>{cat.icon} Charge fixe{isPaid?' · Payé':''}</p>
                    </div>
                    <span style={{ ...DF, fontWeight:700, fontSize:12, color:isPaid?TEAL:ORANGE, flexShrink:0 }}>
                      {isPaid?`${fmtEur(paid)}`:'-'+fmtEur(budget)}
                    </span>
                  </div>
                ))
            }
          </div>
          <FooterLink label="Voir tous les paiements" onClick={()=>panel('paiements')}/>
        </div>

        {/* B7 Planification budgétaire */}
        <div style={{ ...CARD, gridColumn:'1/3', gridRow:'4/5' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Planification budgétaire</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'capitalize' }}>{monthName}</span>
              <ChevronRight size={11} style={{ color:'var(--text-muted)' }}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px 90px', padding:'6px 20px', background:'var(--bg-input)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {['Catégorie','Budget','Dépenses','Reste','Progression'].map(h=>(
              <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {cur.categories.filter(c=>c.type==='expense').length===0
              ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', opacity:0.5 }}><p style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune catégorie</p></div>
              : cur.categories.filter(c=>c.type==='expense').map(cat=>{
                  const spent  = cur.transactions.filter(t=>t.budget_category_id===cat.id).reduce((s,t)=>s+t.amount,0)
                  const budget = cat.budget_monthly??0
                  const reste  = budget - spent
                  const pct    = budget>0 ? Math.min(100,Math.round(spent/budget*100)) : (spent>0?100:0)
                  const over   = budget>0 && spent>budget
                  return (
                    <div key={cat.id} style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px 90px', padding:'9px 20px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12 }}>{cat.icon??'●'}</span>
                        <span style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{budget>0?fmtEur(budget):'—'}</span>
                      <span style={{ ...DF, fontSize:11, fontWeight:700, color:over?ORANGE:'var(--text)' }}>{fmtEur(spent)}</span>
                      <span style={{ fontSize:11, color:reste>=0?TEAL:ORANGE }}>{budget>0?fmtEur(reste):'—'}</span>
                      <div>
                        {budget>0
                          ? <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}><div style={{ height:'100%', borderRadius:99, background:over?ORANGE:(cat.color??TEAL), width:`${pct}%` }}/></div>
                          : <span style={{ fontSize:9, color:'var(--text-muted)' }}>Non défini</span>}
                      </div>
                    </div>
                  )
                })
            }
          </div>
          <FooterLink label="Modifier mon budget" onClick={()=>panel('budget')}/>
        </div>

        {/* B8 Objectifs financiers */}
        <div style={{ ...CARD, gridColumn:'3/5', gridRow:'4/5' }}>
          <div style={HDR}>
            <span style={{ ...LBL }}>Objectifs financiers</span>
            <button onClick={()=>panel('objectifs')} style={{ width:24, height:24, borderRadius:6, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Plus size={12}/>
            </button>
          </div>
          <div style={{ flex:1, padding:'14px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:18 }}>
            {goals.map(g=>{
              const pct  = g.target>0 ? Math.min(100,Math.round(g.current/g.target*100)) : 0
              const done = g.current>=g.target
              return (
                <div key={g.id}>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${g.color}22`, border:`1px solid ${g.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{g.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                        <p style={{ fontSize:13, color:'var(--text)' }}>{g.label}</p>
                        <span style={{ ...DF, fontSize:20, fontWeight:900, color:done?TEAL:WHEAT }}>{pct}%</span>
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{fmtEur(g.current)} sur {fmtEur(g.target)}</p>
                    </div>
                  </div>
                  <div style={{ height:7, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:done?TEAL:g.color, width:`${pct}%`, transition:'width 0.5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
          <FooterLink label="Voir tous mes objectifs" onClick={()=>panel('objectifs')}/>
        </div>

        {/* B9 Agent IA */}
        <div style={{ gridColumn:'1/5', gridRow:'5/6', background:TEAL_BG, borderRadius:16, display:'flex', alignItems:'center', padding:'0 36px', gap:24, overflow:'hidden' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(240,228,204,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Zap size={22} style={{ color:WHEAT }}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ ...LBL, color:WHEAT, opacity:0.7, marginBottom:6 }}>Insight de l'Agent IA</p>
            <p style={{ fontSize:14, color:'rgba(240,228,204,0.93)', lineHeight:1.6 }}>
              {cur.loading ? 'Analyse en cours…'
               : cur.balance<0
                 ? `⚠ Vos dépenses (${fmtEur(cur.totalExpense)}) dépassent vos revenus (${fmtEur(cur.totalIncome)}) ce mois.`
                 : cur.byCategory.length>0
                   ? `Votre plus grosse dépense est « ${cur.byCategory[0]?.name} » (${fmtEur(cur.byCategory[0]?.spent)}). Taux d'épargne : ${savings}% — ${savings>=20?'🎉 Excellent !':savings>=10?'Bien, visez 20%.':'Visez 10–20% du revenu en épargne.'}`
                   : 'Ajoutez vos premières transactions pour obtenir une analyse personnalisée.'}
            </p>
          </div>
          <button onClick={()=>panel('ai')}
            style={{ padding:'11px 20px', borderRadius:11, background:'rgba(240,228,204,0.15)', border:'1px solid rgba(240,228,204,0.25)', color:WHEAT, ...DF, fontWeight:700, fontSize:11, flexShrink:0, display:'flex', alignItems:'center', gap:7, cursor:'pointer' }}>
            <BarChart2 size={13}/> Voir l'analyse détaillée
          </button>
        </div>
      </div>

      {/* ════ DRAWERS ════ */}
      {activePanel && (
        <Drawer
          title={PANELS[activePanel].title}
          open={true}
          onClose={()=>setActivePanel(null)}
          width={PANELS[activePanel].width}
        >
          {PANELS[activePanel].content}
        </Drawer>
      )}

      {/* ════ MODAL TRANSACTION ════ */}
      {showTxModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(22,22,42,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-active)', padding:28, width:460, boxShadow:'0 24px 60px rgba(0,0,0,0.55)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ ...DF, fontSize:20, fontWeight:900, color:WHEAT }}>Nouvelle transaction</h3>
              <button onClick={()=>setShowTxModal(false)} style={{ width:30, height:30, borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <form onSubmit={handleAddTx} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:8 }}>
                {(['expense','income'] as const).map(type=>(
                  <button key={type} type="button" onClick={()=>setTxForm(f=>({...f,type}))}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:`2px solid ${txForm.type===type?(type==='expense'?ORANGE:TEAL):'var(--border)'}`, background:txForm.type===type?(type==='expense'?'rgba(242,84,45,0.12)':'rgba(14,149,148,0.12)'):'transparent', color:txForm.type===type?(type==='expense'?ORANGE:TEAL):'var(--text-muted)', ...DF, fontWeight:700, fontSize:12, cursor:'pointer', transition:'all 0.2s' }}>
                    {type==='expense'?'↓ Dépense':'↑ Revenu'}
                  </button>
                ))}
              </div>
              <input type="number" min="0" step="0.01" value={txForm.amount||''} onChange={e=>setTxForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} placeholder="Montant (€)" autoFocus
                style={{ padding:'12px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:18, ...DF, fontWeight:700 }}/>
              <input type="text" value={txForm.description||''} onChange={e=>setTxForm(f=>({...f,description:e.target.value}))} placeholder="Description…"
                style={{ padding:'11px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text)', fontSize:13 }}/>
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
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={txForm.is_recurring??false} onChange={e=>setTxForm(f=>({...f,is_recurring:e.target.checked}))} style={{ width:15, height:15, accentColor:TEAL }}/>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Paiement récurrent (mensuel)</span>
              </label>
              <button type="submit"
                style={{ padding:'13px', borderRadius:12, background:txForm.type==='expense'?ORANGE:TEAL, color:'#fff', border:'none', ...DF, fontWeight:900, fontSize:14, cursor:'pointer', marginTop:2 }}>
                Ajouter la transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
