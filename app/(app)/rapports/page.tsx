'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { useRapports } from '@/hooks/useRapports'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtSec(sec: number) {
  const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60)
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}min`
}
function fmtEur(n: number) {
  return n.toLocaleString('fr-BE', { style:'currency', currency:'EUR', minimumFractionDigits:0 })
}

export default function RapportsPage() {
  const [period, setPeriod] = useState<'week'|'month'>('week')
  const ref = period === 'week'
    ? (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); d.setHours(0,0,0,0); return d })()
    : (() => { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })()
  const { data, loading } = useRapports(period, ref)

  const tabs = [{ key:'week', label:'Cette semaine' }, { key:'month', label:'Ce mois' }]

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle
        title="Rapports"
        sub="Semaine · Mensuel · Période · Personnel"
        right={
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setPeriod(t.key as typeof period)}
                className="px-4 py-2 rounded-lg"
                style={{ background: period===t.key ? '#F2542D' : 'var(--bg-card)', color: period===t.key ? '#fff' : 'var(--text-muted)', border:'1px solid var(--border)', ...DF, fontSize:11, fontWeight:700 }}>
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <KpiGrid>
        <KpiCard label="Temps logué"     value={loading ? '…' : fmtSec(data?.totalSeconds??0)}     color="#F2542D" />
        <KpiCard label="Tâches actives"  value={loading ? '…' : String(data?.tasksTotal??0)}        color="#F5DFBB" />
        <KpiCard label="Tâches complétées" value={loading ? '…' : String(data?.tasksDone??0)}       color="#0E9594" />
        <KpiCard label="Revenus"         value={loading ? '…' : fmtEur(data?.totalIncome??0)}       color="#F0E4CC" />
      </KpiGrid>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Left — time analysis */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">

          {/* Daily activity bars */}
          <div style={{ background:'#11686A', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F0E4CC', textTransform:'uppercase', marginBottom:16 }}>Analyse de l'activité</p>
            {loading ? <p style={{ color:'rgba(240,228,204,0.5)', fontSize:12 }}>Chargement…</p> : (
              <div className="flex items-end gap-2" style={{ height:100 }}>
                {(data?.dailyStats ?? []).map((d, i) => {
                  const maxSec = Math.max(...(data?.dailyStats??[]).map(x=>x.seconds), 1)
                  const h = Math.max(4, (d.seconds/maxSec)*90)
                  const label = new Date(d.date).toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,1).toUpperCase()
                  return (
                    <div key={i} className="flex flex-col items-center gap-1" style={{ flex:1 }}>
                      <div style={{ width:'100%', height:h, borderRadius:4, background: d.seconds>0 ? '#F2542D' : 'rgba(240,228,204,0.15)' }} />
                      <span style={{ fontSize:9, color:'rgba(240,228,204,0.6)' }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Time tracker detail */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Time Tracker</p>
              <Link href="/time-tracker" style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                Voir tout <ArrowRight size={10} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              {[
                { label:'Total heures',    value: loading ? '…' : fmtSec(data?.totalSeconds??0) },
                { label:'Moy. / jour',     value: loading ? '…' : fmtSec(Math.round((data?.totalSeconds??0)/(period==='week'?7:30))) },
                { label:'Sessions',        value: '—' },
                { label:'Facturable',      value: '—' },
              ].map(stat => (
                <div key={stat.label}>
                  <p style={{ ...DF, fontWeight:900, fontSize:22, color:'var(--wheat)', lineHeight:1 }}>{stat.value}</p>
                  <p style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:3 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks breakdown */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase' }}>Bien-être & activité</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              {[
                { label:'Tâches totales',    value: loading ? '…' : String(data?.tasksTotal??0), color:'var(--wheat)' },
                { label:'Terminées',         value: loading ? '…' : String(data?.tasksDone??0),  color:'#0E9594' },
                { label:'En retard',         value: loading ? '…' : String(data?.tasksLate??0), color:'#F5DFBB' },
                { label:'Taux complétion',   value: loading||!(data?.tasksTotal) ? '—' : `${Math.round((data!.tasksDone/data!.tasksTotal)*100)}%`, color:'#F2542D' },
              ].map(stat => (
                <div key={stat.label}>
                  <p style={{ ...DF, fontWeight:900, fontSize:22, color:stat.color, lineHeight:1 }}>{stat.value}</p>
                  <p style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:3 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[10px]">
          {/* Time distribution donut-like */}
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Répartition du temps</p>
            {loading ? <p style={{ fontSize:12, color:'rgba(26,10,10,0.6)' }}>…</p> : (
              (data?.projectStats ?? []).slice(0,6).map(p => {
                const totalSec = data?.totalSeconds ?? 1
                const pct = Math.round(p.total_seconds/totalSec*100)
                return (
                  <div key={p.project_name} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize:11, color:'#1A0A0A' }}>{p.project_name}</span>
                      <span style={{ ...DF, fontSize:11, fontWeight:800, color:'#1A0A0A' }}>{pct}%</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
            {(!loading && !(data?.projectStats?.length)) && (
              <p style={{ fontSize:12, color:'rgba(26,10,10,0.5)' }}>Aucune donnée</p>
            )}
          </div>

          {/* Budget */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:12 }}>Budget</p>
            {loading ? <p style={{ fontSize:12, color:'var(--text-muted)' }}>…</p> : (
              <>
                <p style={{ ...DF, fontWeight:900, fontSize:28, color:(data?.totalIncome??0)>=(data?.totalExpense??0)?'#0E9594':'#F2542D', lineHeight:1 }}>
                  {fmtEur((data?.totalIncome??0)-(data?.totalExpense??0))}
                </p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>solde {period==='week'?'semaine':'mois'}</p>
                <div className="mt-3 pt-3 flex flex-col gap-1" style={{ borderTop:'1px solid var(--border)' }}>
                  <div className="flex justify-between">
                    <span style={{ fontSize:10, color:'#0E9594' }}>Revenus</span>
                    <span style={{ ...DF, fontSize:11, fontWeight:700, color:'#0E9594' }}>{fmtEur(data?.totalIncome??0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize:10, color:'#F2542D' }}>Dépenses</span>
                    <span style={{ ...DF, fontSize:11, fontWeight:700, color:'#F2542D' }}>{fmtEur(data?.totalExpense??0)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Objectifs */}
          <div style={{ background:'#0E9594', borderRadius:12, padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:10 }}>Objectifs</p>
            {[
              { label:'Tâches / jour', target:5, current: loading ? 0 : Math.round((data?.tasksDone??0)/(period==='week'?7:30)) },
              { label:'Heures / jour', target:6, current: loading ? 0 : Math.round((data?.totalSeconds??0)/3600/(period==='week'?7:30)) },
            ].map(obj => (
              <div key={obj.label} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize:11, color:'#1A0A0A' }}>{obj.label}</span>
                  <span style={{ ...DF, fontSize:11, fontWeight:700, color:'#1A0A0A' }}>{obj.current}/{obj.target}</span>
                </div>
                <div style={{ height:4, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${Math.min(100,obj.current/obj.target*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
