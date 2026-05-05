'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, RotateCcw } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Message = { role: 'user'|'assistant'; content: string }

const SUGGESTIONS = [
  "Planifie ma semaine",
  "Quelles sont mes tâches urgentes ?",
  "Résume mon activité cette semaine",
  "Aide-moi à prioriser mes projets",
  "Analyse mon budget du mois",
  "Quand est ma prochaine deadline ?",
]

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role:'assistant', content:"Bonjour ! Je suis ton assistant NYSA 🌟\n\nJe peux t'aider à planifier ta semaine, analyser tes données, ou simplement répondre à tes questions. Que puis-je faire pour toi ?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role:'user', content: text.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    const reply: Message = {
      role: 'assistant',
      content: "Je comprends ta demande. Cette fonctionnalité d'IA connectée à tes données NYSA arrive bientôt — je pourrai alors analyser tes tâches, projets, budget et activités en temps réel pour te donner des conseils personnalisés. 🚀"
    }
    setMessages(m => [...m, reply])
    setLoading(false)
  }

  return (
    <div style={{ padding:30, display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
      <PageTitle title="Agent IA" sub="Ton assistant personnel connecté à NYSA" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]" style={{ flex:1, minHeight:0 }}>
        {/* Chat */}
        <div className="md:col-span-3 flex flex-col" style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', minHeight:500 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#F2542D,#0E9594)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Sparkles size={16} style={{ color:'#fff' }} />
              </div>
              <div>
                <p style={{ ...DF, fontWeight:800, fontSize:13, color:'var(--wheat)' }}>NYSA AI</p>
                <p style={{ fontSize:10, color:'#0E9594' }}>● En ligne</p>
              </div>
            </div>
            <button onClick={() => setMessages([{ role:'assistant', content:"Conversation réinitialisée. Comment puis-je t'aider ?" }])}
              style={{ color:'var(--text-muted)', padding:8, borderRadius:8 }}>
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role==='user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role==='assistant' && (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#F2542D,#0E9594)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8, marginTop:2 }}>
                    <Sparkles size={12} style={{ color:'#fff' }} />
                  </div>
                )}
                <div style={{
                  maxWidth:'75%', padding:'10px 14px', borderRadius: msg.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  background: msg.role==='user' ? '#F2542D' : 'var(--bg-input)',
                  border: msg.role==='user' ? 'none' : '1px solid var(--border)',
                }}>
                  <p style={{ fontSize:13, color: msg.role==='user' ? '#fff' : 'var(--wheat)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-center gap-3">
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#F2542D,#0E9594)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={12} style={{ color:'#fff' }} />
                </div>
                <div style={{ padding:'10px 14px', borderRadius:'4px 14px 14px 14px', background:'var(--bg-input)', border:'1px solid var(--border)' }}>
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
            <div className="flex gap-2" style={{ background:'var(--bg-input)', borderRadius:12, border:'1px solid var(--border)', padding:'8px 8px 8px 14px' }}>
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
                style={{ width:36, height:36, borderRadius:9, background: input.trim()&&!loading ? '#F2542D' : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                <Send size={14} style={{ color: input.trim()&&!loading ? '#fff' : 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Right — suggestions */}
        <div className="flex flex-col gap-[10px]">
          <div style={{ background:'#F2542D', borderRadius:12, padding:20 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#1A0A0A', textTransform:'uppercase', marginBottom:12 }}>Suggestions</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={()=>sendMessage(s)}
                  className="text-left px-3 py-2.5 rounded-lg transition-all"
                  style={{ background:'rgba(0,0,0,0.15)', color:'#1A0A0A', fontSize:12, lineHeight:1.4 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
            <p style={{ ...DF, fontSize:11, fontWeight:800, letterSpacing:'0.12em', color:'#0E9594', textTransform:'uppercase', marginBottom:10 }}>Capacités</p>
            {[
              '📋 Analyse tes tâches',
              '⏱ Résumé time tracker',
              '💰 Analyse budget',
              '🏃 Stats running',
              '📊 Rapport hebdo',
              '🎯 Conseils priorités',
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
