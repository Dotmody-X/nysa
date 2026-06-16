'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trash2, Check, AlertTriangle } from '@/components/ui/icons'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = 'var(--accent-budget)', TEAL = 'var(--azul)', WHEAT = 'var(--text)'

// Sections du site (pour les feature flags). href doit matcher la nav.
const SECTIONS = [
  { href: '/calendrier', label: 'Calendrier' }, { href: '/time-tracker', label: 'Time Tracker' },
  { href: '/projets', label: 'Projets' }, { href: '/todo', label: 'To-Do' },
  { href: '/sport', label: 'Running' }, { href: '/health', label: 'Health' },
  { href: '/recettes', label: 'Recettes' }, { href: '/courses', label: 'Courses' },
  { href: '/budget', label: 'Budget' }, { href: '/rapports', label: 'Rapports' }, { href: '/agent', label: 'Agent IA' },
]
const TABLE_LABELS: Record<string, string> = {
  recipes: 'Recettes', transactions: 'Transactions', projects: 'Projets', tasks: 'Tâches',
  shopping_items: 'Articles courses', running_activities: 'Runs', product_prices: 'Prix produits',
  events: 'Événements', time_entries: 'Sessions temps', health_metrics: 'Mesures santé',
}

type SiteConfig = { hiddenSections: string[]; announcement: { text: string; active: boolean }; maintenance: boolean }
type Overview = { userCount: number; counts: Record<string, number>; recentUsers: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] }
type AdminUser = { id: string; email: string; display_name: string | null; created_at: string; last_sign_in_at: string | null; confirmed: boolean }

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminPage() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading')
  const [tab, setTab] = useState<'overview' | 'users' | 'config'>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(async () => {
    const me = await fetch('/api/admin/me').then(r => r.json()).catch(() => ({ isAdmin: false }))
    if (!me.isAdmin) { setStatus('denied'); return }
    setStatus('ok')
    const [ov, us, cf] = await Promise.all([
      fetch('/api/admin/overview').then(r => r.json()).catch(() => null),
      fetch('/api/admin/users').then(r => r.json()).catch(() => ({ users: [] })),
      fetch('/api/admin/config').then(r => r.json()).catch(() => null),
    ])
    if (ov && !ov.error) setOverview(ov)
    setUsers(us.users ?? [])
    if (cf && !cf.error) setConfig(cf)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveConfig() {
    if (!config) return
    setSavingCfg(true); setCfgMsg(null)
    const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    setCfgMsg(res.ok ? '✅ Enregistré' : '❌ Échec')
    setSavingCfg(false)
    setTimeout(() => setCfgMsg(null), 3000)
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    if (res.ok) setUsers(u => u.filter(x => x.id !== id))
    setConfirmDel(null)
  }

  function toggleSection(href: string) {
    setConfig(c => c && ({ ...c, hiddenSections: c.hiddenSections.includes(href) ? c.hiddenSections.filter(h => h !== href) : [...c.hiddenSections, href] }))
  }

  if (status === 'loading') return <div style={{ padding: 40, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}><Loader2 size={16} className="animate-spin" /> Chargement…</div>
  if (status === 'denied') return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <AlertTriangle size={28} style={{ color: ORANGE }} />
      <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT }}>Accès refusé</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cette zone est réservée aux administrateurs.</p>
    </div>
  )

  const tabBtn = (k: typeof tab, label: string): React.CSSProperties => ({
    ...DF, fontSize: 12, fontWeight: 800, padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    border: '2px solid var(--ink)', background: tab === k ? ORANGE : 'var(--bg-card)', color: tab === k ? 'var(--chocolate)' : 'var(--text-muted)', boxShadow: tab === k ? '3px 3px 0 var(--ink)' : 'none',
  })
  const inp: React.CSSProperties = { background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
      <div>
        <h1 style={{ ...DF, fontSize: 40, fontWeight: 900, color: WHEAT, lineHeight: 1 }}>ADMIN.</h1>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>Back-office · Gestion du site</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={tabBtn('overview', '')} onClick={() => setTab('overview')}>Vue d&apos;ensemble</button>
        <button style={tabBtn('users', '')} onClick={() => setTab('users')}>Utilisateurs ({users.length})</button>
        <button style={tabBtn('config', '')} onClick={() => setTab('config')}>Réglages globaux</button>
      </div>

      {/* ── Vue d'ensemble ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ ...card, padding: 16 }}>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comptes</p>
              <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: TEAL }}>{overview?.userCount ?? '—'}</p>
            </div>
            {overview && Object.entries(overview.counts).map(([t, n]) => (
              <div key={t} style={{ ...card, padding: 16 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{TABLE_LABELS[t] ?? t}</p>
                <p style={{ ...DF, fontSize: 28, fontWeight: 900, color: WHEAT }}>{n}</p>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: 18 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE, marginBottom: 12 }}>Derniers comptes créés</p>
            {(overview?.recentUsers ?? []).map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: WHEAT }}>{u.email}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Utilisateurs ── */}
      {tab === 'users' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 40px', padding: '10px 16px', background: 'var(--bg-input)', borderBottom: '2px solid var(--ink)', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span>Email</span><span>Nom</span><span>Créé</span><span>Dernière connexion</span><span />
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 40px', padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: WHEAT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{!u.confirmed && <span style={{ fontSize: 8, color: ORANGE, marginLeft: 6 }}>non confirmé</span>}</span>
              <span style={{ color: 'var(--text-muted)' }}>{u.display_name ?? '—'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(u.last_sign_in_at)}</span>
              {confirmDel === u.id ? (
                <button onClick={() => deleteUser(u.id)} title="Confirmer la suppression" style={{ background: ORANGE, border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--chocolate)', padding: '4px 6px' }}><Check size={13} /></button>
              ) : (
                <button onClick={() => setConfirmDel(u.id)} title="Supprimer ce compte" style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          {users.length === 0 && <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Aucun compte.</p>}
        </div>
      )}

      {/* ── Réglages globaux ── */}
      {tab === 'config' && config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
          <div style={{ ...card, padding: 18 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE, marginBottom: 6 }}>Sections masquées</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Masque une section pour tous les utilisateurs (sans redéployer).</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SECTIONS.map(s => {
                const hidden = config.hiddenSections.includes(s.href)
                return (
                  <button key={s.href} onClick={() => toggleSection(s.href)}
                    style={{ ...DF, fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', border: `2px solid ${hidden ? ORANGE : 'var(--border)'}`, background: hidden ? 'rgba(242,84,45,0.12)' : 'var(--bg-input)', color: hidden ? ORANGE : 'var(--text-muted)' }}>
                    {hidden ? '🚫 ' : ''}{s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE }}>Annonce</p>
            <input value={config.announcement.text} onChange={e => setConfig(c => c && ({ ...c, announcement: { ...c.announcement, text: e.target.value } }))} placeholder="Message affiché en haut du site…" style={inp} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: WHEAT, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.announcement.active} onChange={e => setConfig(c => c && ({ ...c, announcement: { ...c.announcement, active: e.target.checked } }))} /> Afficher la bannière
            </label>
          </div>

          <div style={{ ...card, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE }}>Mode maintenance</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Bloque l&apos;accès aux non-admins (toi, tu passes au travers).</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: WHEAT, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.maintenance} onChange={e => setConfig(c => c && ({ ...c, maintenance: e.target.checked }))} /> Activer
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveConfig} disabled={savingCfg} className="nb-press"
              style={{ ...DF, fontWeight: 800, fontSize: 12, padding: '10px 22px', borderRadius: 'var(--radius-lg)', background: ORANGE, color: 'var(--chocolate)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
              {savingCfg ? 'Enregistrement…' : 'Enregistrer les réglages'}
            </button>
            {cfgMsg && <span style={{ fontSize: 12, color: cfgMsg.startsWith('✅') ? TEAL : ORANGE }}>{cfgMsg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
