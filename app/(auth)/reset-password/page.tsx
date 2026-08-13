'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NysaLogo } from '@/components/ui/NysaLogo'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [ready,    setReady]    = useState(false)   // session de récupération détectée
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)

  // Supabase ouvre une session temporaire à l'ouverture du lien de l'email.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('6 caractères minimum.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => { router.push('/'); router.refresh() }, 1300)
  }

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'var(--ink-light)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
        >
          <NysaLogo size={30} color='var(--ink-dark)' />
        </div>
        <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>NYSA</h1>
        <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: 'var(--text-muted)' }}>Nouveau mot de passe</p>
      </div>

      <form onSubmit={submit} className="nb-card flex flex-col gap-4 p-6">
        {done ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text)' }}>
            Mot de passe mis à jour. Redirection…
          </p>
        ) : (
          <>
            {!ready && (
              <p className="text-xs px-3 py-2 rounded-[8px]" style={{ color: 'var(--text)', background: 'var(--bg-input)', border: '2px solid var(--ink)' }}>
                Ouvre cette page depuis le lien reçu par email. Si tu es bien passé par le lien et que ça reste bloqué, redemande un email depuis la connexion.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Nouveau mot de passe</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none transition-all duration-150"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--ink)', color: 'var(--text)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-brand)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ink)')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>Confirmer</label>
              <input
                type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-[10px] text-sm outline-none transition-all duration-150"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--ink)', color: 'var(--text)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-brand)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ink)')}
              />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-[8px]" style={{ color: 'var(--on-accent)', background: 'var(--danger)', border: '2px solid var(--ink)' }}>
                {error}
              </p>
            )}

            <button
              type="submit" disabled={loading || !ready}
              className="nb-press w-full py-2.5 rounded-[10px] text-sm font-semibold tracking-wide mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-brand)', color: 'var(--on-accent)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
            >
              {loading ? 'Mise à jour…' : 'Définir le mot de passe'}
            </button>

            <button
              type="button" onClick={() => router.push('/login')}
              className="text-xs text-center mt-1"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Retour à la connexion
            </button>
          </>
        )}
      </form>
    </div>
  )
}
