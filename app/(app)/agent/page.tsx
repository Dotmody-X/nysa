'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, RotateCcw } from '@/components/ui/icons'
import { PageEmpty } from '@/components/ui/PageEmpty'
import { isDemoModeDisabled } from '@/lib/demo-mode'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Message = { role: 'user'|'assistant'; content: string }

const SUGGESTIONS = [
  "Planifie ma semaine et crée les tâches",
  "Quelles sont mes urgences? Proposes des actions",
  "Résumé complet + conseils pour avancer",
  "Analysé mon budget et donne des recommandations",
  "Refactorise la page Projects (propose du code)",
  "Crée une nouvelle feature pour NYSA",
]

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role:'assistant', content:"🦅 **CÓNDOR CONNECTÉ**\n\nBonjour Nathan! Je suis ton assistant personnel avec accès complet à NYSA.\n\n✅ **Capacités:**\n• Analyser tes tâches, projets, budget, running\n• Modifier le code NYSA en temps réel\n• Faire des commits Git automatiques\n• Updater ta base de données\n• Redéployer sur Vercel\n• Donner des conseils avisés\n• Proposer des améliorations proactives\n\nQue veux-tu que je fasse? 🚀" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('nathan')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior:'smooth' }) 
  }, [messages])

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id') || 'nathan'
    setUserId(storedUserId)
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role:'user', content: text.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          userId: userId
        })
      })
      
      const data = await res.json()
      const reply: Message = {
        role: 'assistant',
        content: data.reply || 'Erreur de connexion à l\'agent.'
      }
      setMessages(m => [...m, reply])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMsg: Message = {
        role: 'assistant',
        content: '❌ Erreur de connexion. Vérifie la config OpenClaw sur le Pi5.'
      }
      setMessages(m => [...m, errorMsg])
    }
    
    setLoading(false)
  }

  // Empty state for demo mode — skip if isDemoModeDisabled (this page is always useful)
  const noDemoMode = isDemoModeDisabled()
  // Agent page is always available, no empty state needed

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <PageTitle title="Agent IA" sub="Ton assistant personnel connecté à NYSA" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[12px]" style={{ flex:1, minHeight:0 }}>
        {/* Chat */}
        <div className="md:col-span-3 flex flex-col" style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', minHeight:500 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'2px solid var(--ink)' }}>
            <div className="flex items-center gap-3">
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent-budget),var(--azul))', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Sparkles size={16} style={{ color:'var(--creamy-ivory)' }} />
              </div>
              <div>
                <p style={{ ...DF, fontWeight:800, fontSize:13, color:'var(--text)' }}>NYSA AI</p>
                <p style={{ fontSize:10, color:'var(--azul)' }}>● En ligne</p>
              </div>
            </div>
            <button onClick={() => setMessages([{ role:'assistant', content:"Conversation réinitialisée. Comment puis-je t'aider ?" }])} className="nb-press"
              style={{ color:'var(--text)', padding:8, borderRadius:8, border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)', background:'var(--bg-card)' }}>
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role==='user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role==='assistant' && (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent-budget),var(--azul))', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8, marginTop:2 }}>
                    <Sparkles size={12} style={{ color:'var(--creamy-ivory)' }} />
                  </div>
                )}
                <div style={(msg.role==='user' ? {
                  maxWidth:'75%', padding:'10px 14px', borderRadius:'14px 14px 4px 14px',
                  background:'var(--accent-budget)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)',
                  '--text-rgb':'24, 19, 14', '--text':'var(--chocolate)', '--text-muted':'rgba(24, 19, 14, 0.65)',
                } : {
                  maxWidth:'75%', padding:'10px 14px', borderRadius:'4px 14px 14px 14px',
                  background:'var(--bg-input)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)',
                }) as React.CSSProperties}>
                  <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-center gap-3">
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent-budget),var(--azul))', border:'2px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={12} style={{ color:'var(--creamy-ivory)' }} />
                </div>
                <div style={{ padding:'10px 14px', borderRadius:'4px 14px 14px 14px', background:'var(--bg-input)', border:'2px solid var(--ink)', boxShadow:'3px 3px 0 var(--ink)' }}>
                  <div className="flex gap-1">
                    {[0,1,2].map(j => (
                      <div key={j} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:`bounce 0.8s ${j*0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex gap-2" style={{ background:'var(--bg-input)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:'8px 8px 8px 14px' }}>
              <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMessage(input))}
                placeholder="Pose-moi une question…"
                style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:13, color:'var(--text)' }}
              />
              <button
                onClick={()=>sendMessage(input)}
                disabled={!input.trim()||loading}
                className="nb-press"
                style={{ width:36, height:36, borderRadius:9, background: input.trim()&&!loading ? 'var(--accent-budget)' : 'var(--bg-card)', border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                <Send size={14} style={{ color: input.trim()&&!loading ? 'var(--chocolate)' : 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Right — suggestions */}
        <div className="flex flex-col gap-[12px]">
          <div style={{ background:'var(--accent-budget)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:20, '--text-rgb':'24, 19, 14', '--text':'var(--chocolate)', '--text-muted':'rgba(24, 19, 14, 0.65)' } as React.CSSProperties}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--chocolate)', textTransform:'uppercase', marginBottom:12 }}>Suggestions</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={()=>sendMessage(s)}
                  className="text-left px-3 py-2.5 rounded-lg transition-all nb-press"
                  style={{ background:'var(--creamy-ivory)', color:'var(--chocolate)', border:'2px solid var(--ink)', boxShadow:'2px 2px 0 var(--ink)', fontSize:12, lineHeight:1.4 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'2px solid var(--ink)', boxShadow:'4px 4px 0 var(--ink)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'var(--azul)', textTransform:'uppercase', marginBottom:10 }}>Plein Pouvoir</p>
            {[
              '📋 Analyse + Crée tâches',
              '📝 Modifie le code',
              '🔄 Git commits auto',
              '💾 Met à jour Supabase',
              '🚀 Redéploie Vercel',
              '💡 Conseils proactifs',
              '🎨 Refactorise features',
              '🔍 Diagnostique issues',
            ].map(cap => (
              <div key={cap} className="flex items-center gap-2 py-2" style={{ borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
