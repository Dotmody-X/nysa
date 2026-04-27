'use client'

import { useState, useEffect } from 'react'
import { User, Mail, LogOut, Save } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ComptePage() {
  const router = useRouter()
  const [user,     setUser]     = useState<{ email?: string; id?: string } | null>(null)
  const [name,     setName]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setName(data.user?.user_metadata?.full_name ?? '')
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.updateUser({ data: { full_name: name } })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col gap-6 max-w-[600px]">
      <PageHeader title="Mon compte" sub="Profil · Identifiants · Session" />

      {/* Avatar + info */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
            style={{ background: 'rgba(242,84,45,0.15)', color: 'var(--accent)' }}>
            {name ? name[0].toUpperCase() : <User size={28} style={{ color: 'var(--accent)' }} />}
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: 'var(--wheat)' }}>{name || 'Utilisateur NYSA'}</p>
            <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <Mail size={11} />{user?.email ?? '…'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nom affiché</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ton prénom ou pseudo"
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none"
              style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input type="email" value={user?.email ?? ''} disabled
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none opacity-50 cursor-not-allowed"
              style={{ background: 'var(--bg)', color: 'var(--wheat)', border: '1px solid var(--border)' }} />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>L'email ne peut pas être modifié ici.</p>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            {saved ? '✓ Sauvegardé' : <><Save size={13} /> Sauvegarder</>}
          </Button>
        </div>
      </Card>

      {/* Session */}
      <Card style={{ background: 'rgba(242,84,45,0.04)', borderColor: 'rgba(242,84,45,0.15)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Session</p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Connecté en tant que <strong style={{ color: 'var(--wheat)' }}>{user?.email}</strong>
        </p>
        <Button variant="danger" size="sm" loading={loggingOut} onClick={handleLogout}>
          <LogOut size={13} /> Se déconnecter
        </Button>
      </Card>
    </div>
  )
}
