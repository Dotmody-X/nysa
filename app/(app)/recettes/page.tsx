'use client'
import { useState } from 'react'
import { Search, Plus, Flame, Zap, Droplets, Circle } from 'lucide-react'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const SAMPLE_RECIPES = [
  { id:'1', name:'Saumon rôti, quinoa & légumes', calories:520, proteins:42, carbs:38, fats:16, time:30, tags:['Protéiné','Équilibré'], emoji:'🐟' },
  { id:'2', name:'Buddha bowl poulet & avocat',    calories:480, proteins:38, carbs:44, fats:18, time:20, tags:['Healthy','Rapide'],    emoji:'🥗' },
  { id:'3', name:'Overnight oats aux fruits rouges',calories:320, proteins:14, carbs:52, fats:8,  time:5,  tags:['Petit-déj','Sucré'],  emoji:'🫙' },
  { id:'4', name:'Poulet teriyaki & riz jasmin',   calories:560, proteins:44, carbs:60, fats:12, time:25, tags:['Asiatique'],           emoji:'🍱' },
]

const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const MEALS = ['Petit-déj','Déjeuner','Dîner']

export default function RecettesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const filtered = SAMPLE_RECIPES.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalCals = 1842
  const targetCals = 2200

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, minHeight:'100%' }}>
      <PageTitle
        title="Recettes"
        sub="Suivi · Planification · Mes recettes · Découverte"
        right={
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:'#F2542D', color:'#fff', ...DF, fontWeight:700, fontSize:12 }}>
            <Plus size={14} /> Nouvelle recette
          </button>
        }
      />

      <KpiGrid>
        <KpiCard label="Calories aujourd'hui" value={String(totalCals)} sub={`/ ${targetCals} kcal`} color="#F2542D" />
        <KpiCard label="Protéines"    value="138 g"  sub="/ 160 g objectif"  color="#0E9594" />
        <KpiCard label="Glucides"     value="196 g"  sub="/ 220 g objectif"  color="#F5DFBB" />
        <KpiCard label="Lipides"      value="52 g"   sub="/ 70 g objectif"               />
      </KpiGrid>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* Main — recipes + meal planner */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">
          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 px-3 rounded-lg" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', height:40 }}>
              <Search size={12} style={{ color:'var(--text-muted)' }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher une recette…"
                style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:12, color:'var(--text)' }} />
            </div>
            {['Toutes','Protéiné','Healthy','Rapide','Petit-déj'].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                className="px-3 py-2 rounded-lg whitespace-nowrap"
                style={{ background: filter===f ? '#F2542D' : 'var(--bg-card)', color: filter===f ? '#fff' : 'var(--text-muted)', border:'1px solid var(--border)', ...DF, fontSize:10, fontWeight:700 }}>
                {f}
              </button>
            ))}
          </div>

          {/* Recipe cards */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F2542D', textTransform:'uppercase' }}>Recettes récentes</p>
            </div>
            <div className="grid grid-cols-2 gap-[10px] p-4">
              {filtered.map(r => (
                <div key={r.id} className="flex flex-col gap-2 p-4 rounded-xl cursor-pointer"
                  style={{ background:'var(--bg-input)', border:'1px solid var(--border)' }}>
                  <div className="flex items-start justify-between">
                    <span style={{ fontSize:28 }}>{r.emoji}</span>
                    <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(242,84,45,0.15)', color:'#F2542D', ...DF, fontWeight:700 }}>{r.time}min</span>
                  </div>
                  <p style={{ ...DF, fontWeight:700, fontSize:13, color:'var(--wheat)', lineHeight:1.3 }}>{r.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    {r.tags.map(tag => (
                      <span key={tag} style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(14,149,148,0.12)', color:'#0E9594' }}>{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span style={{ fontSize:10, color:'#F2542D' }}><Flame size={9} style={{ display:'inline' }} /> {r.calories} kcal</span>
                    <span style={{ fontSize:10, color:'#0E9594' }}>P {r.proteins}g</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>G {r.carbs}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal planner */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase' }}>Planificateur repas</p>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding:'8px 12px', fontSize:9, color:'var(--text-muted)', ...DF, fontWeight:700, textTransform:'uppercase', textAlign:'left', borderBottom:'1px solid var(--border)' }}>Repas</th>
                    {DAYS.map(d => (
                      <th key={d} style={{ padding:'8px 12px', fontSize:9, color:'var(--text-muted)', ...DF, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--border)', textAlign:'center', minWidth:90 }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEALS.map((meal, mi) => (
                    <tr key={meal}>
                      <td style={{ padding:'10px 12px', fontSize:11, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', ...DF, fontWeight:600 }}>{meal}</td>
                      {DAYS.map((_, di) => {
                        const r = SAMPLE_RECIPES[(mi + di) % SAMPLE_RECIPES.length]
                        const show = (mi + di) % 3 !== 0
                        return (
                          <td key={di} style={{ padding:'6px 8px', borderBottom:'1px solid var(--border)', textAlign:'center' }}>
                            {show ? (
                              <div style={{ background:'rgba(14,149,148,0.1)', borderRadius:6, padding:'4px 6px', fontSize:9, color:'#0E9594', ...DF, fontWeight:600 }}>
                                {r.emoji} {r.name.split(' ').slice(0,2).join(' ')}
                              </div>
                            ) : (
                              <button style={{ fontSize:16, color:'var(--border)' }}>+</button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[10px]">
          {/* Calories progress */}
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Apports du jour</p>
            <p style={{ ...DF, fontWeight:900, fontSize:40, color:'#1A0A0A', lineHeight:1 }}>{totalCals}</p>
            <p style={{ fontSize:11, color:'rgba(26,10,10,0.7)', marginBottom:12 }}>/ {targetCals} kcal</p>
            <div style={{ height:6, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden', marginBottom:16 }}>
              <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${Math.min(100,totalCals/targetCals*100)}%` }} />
            </div>
            {[
              { label:'Protéines', value:'138g', target:'160g', pct:86 },
              { label:'Glucides',  value:'196g', target:'220g', pct:89 },
              { label:'Lipides',   value:'52g',  target:'70g',  pct:74 },
            ].map(macro => (
              <div key={macro.label} className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span style={{ fontSize:10, color:'rgba(26,10,10,0.7)' }}>{macro.label}</span>
                  <span style={{ ...DF, fontSize:10, fontWeight:700, color:'#1A0A0A' }}>{macro.value} / {macro.target}</span>
                </div>
                <div style={{ height:3, borderRadius:99, background:'rgba(0,0,0,0.2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:'#1A0A0A', width:`${macro.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Catégories */}
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:10 }}>Catégories</p>
            {['Protéiné','Végétarien','Rapide','Petit-déjeuner','Asiatique','Dessert'].map((cat, i) => (
              <div key={cat} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{cat}</span>
                <span style={{ ...DF, fontWeight:700, fontSize:12, color:'var(--wheat)' }}>{(i+1)*2}</span>
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div style={{ background:'#11686A', borderRadius:12, padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#F0E4CC', textTransform:'uppercase', marginBottom:10 }}>Ingrédients à utiliser</p>
            {['Saumon · 200g','Quinoa · 150g','Épinards · 100g','Avocat · 1 pc','Yaourt grec · 200g'].map(ing => (
              <div key={ing} className="flex items-center gap-2 py-1.5">
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#F0E4CC', opacity:0.6, flexShrink:0 }} />
                <span style={{ fontSize:11, color:'rgba(240,228,204,0.85)' }}>{ing}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
