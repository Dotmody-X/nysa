'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setActiveUser } from '@/lib/userStore'
import { NysaLogo } from '@/components/ui/NysaLogo'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [info,     setInfo]     = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null)
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (!data.session) { // confirmation par email requise
        setInfo('Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
        setMode('login'); setLoading(false); return
      }
      setActiveUser(data.user?.id ?? null)
      router.push('/'); router.refresh(); return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setActiveUser(data.user?.id ?? null)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'var(--creamy-ivory)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
        >
          <NysaLogo size={30} color="#1a0708" />
        </div>
        <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>
          NYSA
        </h1>
        <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
          Focus · Plan · Progress
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleLogin} className="nb-card flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nathan@exemple.com"
            className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none transition-all duration-150"
            style={{
              background:  'var(--bg-input)',
              border:      '2px solid var(--ink)',
              color:       'var(--text)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-budget)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ink)')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
            Mot de passe
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none transition-all duration-150"
            style={{
              background: 'var(--bg-input)',
              border:     '1px solid var(--border)',
              color:      'var(--text)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(242,84,45,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-[8px]" style={{ color: 'var(--chocolate)', background: 'var(--danger)', border: '2px solid var(--ink)' }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs px-3 py-2 rounded-[8px]" style={{ color: 'var(--text)', background: 'var(--bg-input)', border: '2px solid var(--ink)' }}>
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="nb-press w-full py-2.5 rounded-[10px] text-sm font-semibold tracking-wide mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-budget)', color: 'var(--chocolate)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
        >
          {loading ? (mode === 'signup' ? 'Création…' : 'Connexion…') : (mode === 'signup' ? 'Créer mon compte' : 'Se connecter')}
        </button>

        <button
          type="button"
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
          className="text-xs text-center mt-1"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {mode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}
