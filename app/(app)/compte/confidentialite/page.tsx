'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, AlertTriangle, X, Shield, Eye, EyeOff, Lock } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)', ORANGE = 'var(--accent-budget)', WHEAT = 'var(--text)'

function PrivacyRow({ icon: Icon, label, sub, value, onChange }: {
  icon: React.ElementType; label: string; sub: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid var(--ink)' }}>
        <Icon size={15} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>{sub}</p>
      </div>
      <button onClick={() => onChange(!value)} className="nb-press"
        style={{ width: 42, height: 24, borderRadius: 99, background: value ? TEAL : 'var(--bg-input)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)', transition: 'left 0.2s' }} />
      </button>
    </div>
  )
}

export default function ConfidentialitePage() {
  const router = useRouter()
  const [analytics,    setAnalytics]    = useState(false)
  const [crashReports, setCrashReports] = useState(true)
  const [dataSharing,  setDataSharing]  = useState(false)

  const [showDelete,   setShowDelete]   = useState(false)
  const [deleteInput,  setDeleteInput]  = useState('')

  async function exportData() {
    const supabase = createClient()
    const [tasks, entries, txs, runs, health] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('time_entries').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('running_activities').select('*'),
      supabase.from('health_metrics').select('*'),
    ])
    const blob = new Blob([JSON.stringify({ tasks: tasks.data, time_entries: entries.data, transactions: txs.data, running: runs.data, health: health.data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `nysa-export-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  async function deleteAccount() {
    if (deleteInput !== 'SUPPRIMER') return
    const supabase = createClient()
    await Promise.all([
      supabase.from('tasks').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('time_entries').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('transactions').delete().neq('id','00000000-0000-0000-0000-000000000000'),
    ])
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>

      <button onClick={() => router.push('/compte')} className="nb-press"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--text)', fontSize: 11, marginBottom: 24, padding: '8px 14px', fontWeight: 700 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>CONFIDENTIALITÉ.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28 }}>Données et confidentialité</p>

      {/* Privacy toggles */}
      <div style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: '4px 20px 4px', marginBottom: 12 }}>
        <p style={{ ...DF, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', paddingTop: 14, marginBottom: 2 }}>Collecte de données</p>
        <PrivacyRow icon={Eye}    label="Analytiques d'usage" sub="Données anonymisées sur l'utilisation des fonctionnalités" value={analytics} onChange={setAnalytics} />
        <PrivacyRow icon={Shield} label="Rapports d'erreur"   sub="Envoyer automatiquement les erreurs techniques pour améliorer l'app" value={crashReports} onChange={setCrashReports} />
        <PrivacyRow icon={EyeOff} label="Partage de données" sub="Partager des données anonymisées pour améliorer les recommandations IA" value={dataSharing} onChange={setDataSharing} />
      </div>

      {/* Info block */}
      <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'rgba(14,149,148,0.08)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Lock size={14} style={{ color: TEAL, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Vos données sont stockées de façon sécurisée sur des serveurs Supabase. Elles ne sont jamais vendues ni partagées avec des tiers sans votre consentement explicite.
        </p>
      </div>

      {/* Export */}
      <div style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 12 }}>
        <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: WHEAT, textTransform: 'uppercase', marginBottom: 8 }}>Exporter mes données</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Téléchargez une copie complète de toutes vos données au format JSON : tâches, sessions de travail, transactions, courses, santé.
        </p>
        <button onClick={exportData} className="nb-press"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'var(--bg-input)', color: 'var(--text)', borderRadius: 'var(--radius-lg)', padding: '10px 0', ...DF, fontWeight: 700, fontSize: 12, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
          <Download size={13} /> Exporter en JSON
        </button>
      </div>

      {/* Supprimer */}
      <div style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: ORANGE, textTransform: 'uppercase', marginBottom: 8 }}>Supprimer mon compte</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Cette action est <strong style={{ color: ORANGE }}>irréversible</strong>. Toutes vos données seront définitivement supprimées.
        </p>
        <button onClick={() => setShowDelete(true)} className="nb-press"
          style={{ width: '100%', background: ORANGE, color: 'var(--chocolate)', borderRadius: 'var(--radius-lg)', padding: '9px 0', ...DF, fontWeight: 700, fontSize: 12, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
          Supprimer mon compte
        </button>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <>
          <div onClick={() => setShowDelete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: 28, width: 400, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={20} style={{ color: ORANGE }} />
              <p style={{ ...DF, fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Supprimer mon compte</p>
              <button onClick={() => setShowDelete(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Tapez <strong style={{ color: ORANGE }}>SUPPRIMER</strong> pour confirmer.
            </p>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="SUPPRIMER"
              style={{ width: '100%', background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, marginBottom: 12 }} />
            <button disabled={deleteInput !== 'SUPPRIMER'} onClick={deleteAccount} className="nb-press"
              style={{ width: '100%', background: deleteInput === 'SUPPRIMER' ? ORANGE : 'var(--bg-input)', color: deleteInput === 'SUPPRIMER' ? 'var(--chocolate)' : 'var(--text-muted)', borderRadius: 'var(--radius-lg)', padding: '10px 16px', ...DF, fontWeight: 700, fontSize: 12, border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: deleteInput === 'SUPPRIMER' ? 'pointer' : 'not-allowed' }}>
              Supprimer définitivement
            </button>
          </div>
        </>
      )}
    </div>
  )
}
