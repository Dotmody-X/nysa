'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = '#0E9594', ORANGE = '#F2542D', WHEAT = '#F5DFBB'
const inp: React.CSSProperties = {
  background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%',
}

export default function GeneralPage() {
  const router = useRouter()
  const [email,       setEmail]       = useState('')
  const [name,        setName]        = useState('')
  const [quote,       setQuote]       = useState('')
  const [timezone,    setTimezone]    = useState('Europe/Paris (UTC+1)')
  const [language,    setLanguage]    = useState('Français')
  const [currency,    setCurrency]    = useState('EUR')
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState<string|null>(null)

  // Password
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [pwdMsg,      setPwdMsg]      = useState<string|null>(null)
  const [pwdSaving,   setPwdSaving]   = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? '')
      const meta = data.user.user_metadata ?? {}
      setName(meta.display_name ?? '')
      setQuote(meta.quote ?? '')
      setTimezone(meta.timezone ?? 'Europe/Paris (UTC+1)')
      setLanguage(meta.language ?? 'Français')
      setCurrency(meta.currency ?? 'EUR')
    })
  }, [])

  const saveProfile = useCallback(async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name, quote, timezone, language, currency },
    })
    setMsg(error ? '❌ ' + error.message : '✅ Profil mis à jour')
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }, [name, quote, timezone, language, currency])

  const changePassword = useCallback(async () => {
    if (newPwd.length < 6) { setPwdMsg('❌ Minimum 6 caractères'); return }
    if (newPwd !== confirmPwd) { setPwdMsg('❌ Les mots de passe ne correspondent pas'); return }
    setPwdSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdMsg(error ? '❌ ' + error.message : '✅ Mot de passe mis à jour')
    setPwdSaving(false)
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    setTimeout(() => setPwdMsg(null), 3000)
  }, [newPwd, confirmPwd])

  const section = (title: string) => (
    <p style={{ ...DF, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>{title}</p>
  )
  const label = (txt: string) => (
    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{txt}</p>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640, margin: '0 auto' }}>

      {/* Back */}
      <button onClick={() => router.push('/compte')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>GÉNÉRAL.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28 }}>Paramètres généraux du compte</p>

      {/* ── Identité ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
        {section('Identité')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            {label('Nom affiché')}
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom ou pseudo" style={inp} />
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>Ce nom apparaît dans la sidebar et sur votre profil</p>
          </div>
          <div>
            {label('Email')}
            <input value={email} readOnly style={{ ...inp, cursor: 'not-allowed', color: 'var(--text-muted)' }} />
          </div>
          <div>
            {label('Devise personnelle')}
            <input value={quote} onChange={e => setQuote(e.target.value)} placeholder="Ce que tu fais aujourd'hui..." style={inp} />
          </div>
        </div>
      </div>

      {/* ── Localisation ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
        {section('Localisation & Préférences')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            {label('Fuseau horaire')}
            <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {['Europe/Paris (UTC+1)','Europe/London (UTC+0)','America/New_York (UTC-5)','America/Los_Angeles (UTC-8)','Asia/Tokyo (UTC+9)'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            {label('Langue')}
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {['Français','English','Español','Deutsch','Italiano'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            {label('Devise')}
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar ($)</option>
              <option value="GBP">Livre sterling (£)</option>
              <option value="CHF">Franc suisse (CHF)</option>
              <option value="CAD">Dollar canadien (CAD)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      {msg && <p style={{ fontSize: 11, color: msg.startsWith('✅') ? TEAL : ORANGE, marginBottom: 8 }}>{msg}</p>}
      <button onClick={saveProfile} disabled={saving}
        style={{ width: '100%', background: ORANGE, color: '#fff', borderRadius: 10, padding: '12px 0', ...DF, fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1, marginBottom: 16 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>

      {/* ── Mot de passe ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {section('Mot de passe')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            {label('Nouveau mot de passe')}
            <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="Minimum 6 caractères" style={{ ...inp, paddingRight: 38 }} />
            <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <div>
            {label('Confirmer le mot de passe')}
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Répétez le nouveau mot de passe" style={inp} />
          </div>
          {pwdMsg && <p style={{ fontSize: 11, color: pwdMsg.startsWith('✅') ? TEAL : ORANGE }}>{pwdMsg}</p>}
          <button onClick={changePassword} disabled={pwdSaving || !newPwd}
            style={{ background: newPwd ? TEAL : 'var(--bg-input)', color: newPwd ? '#fff' : 'var(--text-muted)', borderRadius: 8, padding: '9px 0', ...DF, fontWeight: 700, fontSize: 12, border: 'none', cursor: newPwd ? 'pointer' : 'not-allowed', width: '100%', opacity: pwdSaving ? 0.6 : 1 }}>
            {pwdSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  )
}
