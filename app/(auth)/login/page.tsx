'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(242,84,45,0.15)', border: '1px solid rgba(242,84,45,0.3)' }}
        >
          <Star size={24} fill="#F2542D" style={{ color: '#F2542D' }} />
        </div>
        <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: 'var(--wheat)' }}>
          NYSA
        </h1>
        <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>
          Focus · Plan · Progress
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none transition-all duration-150"
            style={{
              background:  'var(--bg-input)',
              border:      '1px solid var(--border)',
              color:       'var(--wheat)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(242,84,45,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
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
              color:      'var(--wheat)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(242,84,45,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-[6px]" style={{ color: '#F2542D', background: 'rgba(242,84,45,0.1)', border: '1px solid rgba(242,84,45,0.2)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-[8px] text-sm font-semibold tracking-wide transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#F2542D', color: '#F5DFBB' }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
