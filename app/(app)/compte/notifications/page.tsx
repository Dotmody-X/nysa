'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, CheckSquare, Activity, Wallet, TrendingUp, Zap } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import { usePush } from '@/hooks/usePush'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)', ORANGE = 'var(--accent-brand)', WHEAT = 'var(--text)'

type NotifPrefs = {
  taskReminders:   boolean
  budgetAlerts:    boolean
  weeklyReport:    boolean
  healthReminders: boolean
  stravaActivity:  boolean
  streakAlert:     boolean
}

function Toggle({ value, onChange, label, sub, icon: Icon, color }: {
  value: boolean; onChange: (v: boolean) => void
  label: string; sub: string
  icon: React.ElementType; color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: value ? color + '18' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--ink)' }}>
        <Icon size={16} style={{ color: value ? color : 'var(--text-muted)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
      </div>
      <button onClick={() => onChange(!value)} className="nb-press"
        style={{ width: 42, height: 24, borderRadius: 99, background: value ? color : 'var(--bg-input)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)', transition: 'left 0.2s' }} />
      </button>
    </div>
  )
}

/**
 * Les notifications push de CET appareil : un mail qui arrive, Claude qui
 * répond — même quand Nysa est fermée. Sur iPhone/iPad, uniquement depuis
 * l'app ajoutée à l'écran d'accueil.
 */
function BlocPush() {
  const { etat, occupe, erreur, activer, desactiver } = usePush()
  if (!etat) return null
  const actif = etat === 'actif'
  const texte: Record<string, string> = {
    indisponible: "Ce navigateur ne sait pas recevoir de notifications push.",
    installer: "Sur iPhone et iPad, ajoute d'abord Nysa à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis reviens ici.",
    refuse: 'Les notifications ont été refusées pour Nysa : rouvre-les dans les réglages du navigateur ou de l\'appareil.',
    inactif: "Un mail qui arrive, Claude qui répond : notifié ici même quand Nysa est fermée.",
    actif: 'Cet appareil reçoit les notifications de Nysa.',
  }
  return (
    <div style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className="nb-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: actif ? TEAL : 'var(--bg-input)', boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 }}>
        <Bell size={16} style={{ color: actif ? 'var(--ink-light)' : 'var(--text-muted)' }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT }}>Notifications push sur cet appareil</p>
        <p style={{ fontSize: 11.5, color: erreur ? ORANGE : 'var(--text-muted)', lineHeight: 1.45 }}>{erreur ?? texte[etat]}</p>
      </div>
      {(etat === 'inactif' || actif) && (
        <button onClick={() => (actif ? desactiver() : activer())} disabled={occupe} className="nb-press"
          style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 14px', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: actif ? 'var(--bg-input)' : TEAL, color: actif ? 'var(--text)' : 'var(--ink-light)', whiteSpace: 'nowrap' }}>
          {occupe ? '…' : actif ? 'Désactiver' : 'Activer'}
        </button>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotifPrefs>({
    taskReminders:   true,
    budgetAlerts:    true,
    weeklyReport:    true,
    healthReminders: false,
    stravaActivity:  false,
    streakAlert:     true,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string|null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const stored = data.user?.user_metadata?.notifications
      if (stored) setPrefs(prev => ({ ...prev, ...stored }))
    })
  }, [])

  const set = (key: keyof NotifPrefs) => (v: boolean) => setPrefs(p => ({ ...p, [key]: v }))

  const save = useCallback(async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { notifications: prefs } })
    setMsg(error ? '❌ ' + error.message : '✅ Préférences enregistrées')
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }, [prefs])

  const items: { key: keyof NotifPrefs; label: string; sub: string; icon: React.ElementType; color: string }[] = [
    { key:'taskReminders',   label:'Rappels de tâches',    sub:'Notifications pour les tâches en retard ou urgentes',    icon: CheckSquare, color: TEAL },
    { key:'budgetAlerts',    label:'Alertes budget',       sub:'Quand vous approchez de la limite d\'une catégorie',      icon: Wallet,      color: ORANGE },
    { key:'weeklyReport',    label:'Rapport hebdomadaire', sub:'Résumé de votre semaine chaque lundi matin',               icon: TrendingUp,  color: '#9B72CF' },
    { key:'healthReminders', label:'Rappels santé',        sub:'Rappels pour les métriques de santé non saisies',          icon: Activity,    color: '#4ECDC4' },
    { key:'stravaActivity',  label:'Activités Strava',     sub:'Notification quand une course est importée depuis Strava', icon: Zap,         color: '#FC4C02' },
    { key:'streakAlert',     label:'Alerte série',         sub:'Vous rappelle de logger du temps avant minuit',            icon: Bell,        color: '#E8A838' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>

      <button onClick={() => router.push('/compte')} className="nb-press"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--text)', fontSize: 11, marginBottom: 24, padding: '8px 14px', fontWeight: 700 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>NOTIFICATIONS.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28 }}>Gérer vos préférences de notifications</p>

      <BlocPush />

      <div style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: '4px 20px 4px', marginBottom: 16 }}>
        {items.map(item => (
          <Toggle key={item.key} value={prefs[item.key]} onChange={set(item.key)}
            label={item.label} sub={item.sub} icon={item.icon} color={item.color} />
        ))}
      </div>

      {msg && <p style={{ fontSize: 11, color: msg.startsWith('✅') ? TEAL : ORANGE, marginBottom: 8 }}>{msg}</p>}
      <button onClick={save} disabled={saving} className="nb-press"
        style={{ width: '100%', background: ORANGE, color: 'var(--ink-dark)', borderRadius: 'var(--radius-lg)', padding: '12px 0', ...DF, fontWeight: 800, fontSize: 12, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
      </button>
    </div>
  )
}
