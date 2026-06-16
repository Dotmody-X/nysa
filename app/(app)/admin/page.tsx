'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trash2, Check, AlertTriangle, Plus, X, Eye } from '@/components/ui/icons'
import { type SiteConfig, type ThemeConfig, type ThemePreset, type Plan } from '@/hooks/useAppConfig'

// Presets de thème intégrés (points de départ rapides)
const BUILTIN_PRESETS: { name: string; theme: ThemeConfig }[] = [
  { name: 'Néo-brutaliste (défaut)', theme: { accent: '#ff5c35', secondary: '#2d5bff', ink: '#18130e', bg: '#f6efe0', card: '#fffaf0', text: '#18130e', radius: 16 } },
  { name: 'Minuit', theme: { accent: '#8b5cf6', secondary: '#36c5f0', ink: '#000000', bg: '#0c0c14', card: '#15151f', text: '#f5f1ed', radius: 14 } },
  { name: 'Forêt', theme: { accent: '#18b26b', secondary: '#737a4e', ink: '#10231a', bg: '#f1f5ec', card: '#ffffff', text: '#10231a', radius: 12 } },
  { name: 'Rose bonbon', theme: { accent: '#ff4d8d', secondary: '#6c5ce7', ink: '#2a0a1a', bg: '#fff0f6', card: '#ffffff', text: '#2a0a1a', radius: 20 } },
]

type ImpersonateData = {
  user: { id: string; email: string; display_name: string | null; plan: string | null; created_at: string }
  counts: Record<string, number>
  samples: { recipes: { name: string }[]; transactions: { amount: number; type: string; description: string | null; date: string }[]; tasks: { title: string; status: string }[] }
}

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

type Overview = { userCount: number; counts: Record<string, number>; recentUsers: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] }
type AdminUser = { id: string; email: string; display_name: string | null; created_at: string; last_sign_in_at: string | null; confirmed: boolean; plan: string | null }

// Champs de thème surchargeables + libellés
const THEME_FIELDS: { key: keyof Omit<ThemeConfig, 'radius'>; label: string }[] = [
  { key: 'accent', label: 'Couleur principale' }, { key: 'secondary', label: 'Couleur secondaire' },
  { key: 'ink', label: 'Contours / ombres' }, { key: 'bg', label: 'Fond (papier)' },
  { key: 'card', label: 'Fond des cartes' }, { key: 'text', label: 'Texte' },
]
const DEFAULT_HEX: Record<string, string> = {
  accent: '#ff5c35', secondary: '#2d5bff', ink: '#18130e', bg: '#f6efe0', card: '#fffaf0', text: '#18130e',
}
const rid = () => Math.random().toString(36).slice(2)

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminPage() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading')
  const [tab, setTab] = useState<'overview' | 'users' | 'theme' | 'plans' | 'config'>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [view, setView] = useState<ImpersonateData | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [presetName, setPresetName] = useState('')

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

  async function setUserPlan(id: string, plan: string) {
    setUsers(u => u.map(x => x.id === id ? { ...x, plan: plan || null } : x))
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, plan }) })
  }

  const setTheme = (patch: Partial<ThemeConfig>) => setConfig(c => c && ({ ...c, theme: { ...c.theme, ...patch } }))
  const setPlans = (plans: Plan[]) => setConfig(c => c && ({ ...c, plans }))

  async function openView(id: string) {
    setViewLoading(true); setView(null)
    const d = await fetch(`/api/admin/impersonate?userId=${id}`).then(r => r.json()).catch(() => null)
    setViewLoading(false)
    if (d && !d.error) setView(d)
  }

  function saveAsPreset() {
    if (!config || !presetName.trim()) return
    const preset: ThemePreset = { id: Math.random().toString(36).slice(2), name: presetName.trim(), theme: config.theme }
    setConfig(c => c && ({ ...c, themePresets: [...c.themePresets, preset] }))
    setPresetName('')
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
        <button style={tabBtn('theme', '')} onClick={() => setTab('theme')}>Thème</button>
        <button style={tabBtn('plans', '')} onClick={() => setTab('plans')}>Abonnements</button>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.9fr 0.9fr 1fr 66px', padding: '10px 16px', background: 'var(--bg-input)', borderBottom: '2px solid var(--ink)', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span>Email</span><span>Nom</span><span>Créé</span><span>Dern. connexion</span><span>Abonnement</span><span />
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.9fr 0.9fr 1fr 66px', padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 12, gap: 6 }}>
              <span style={{ color: WHEAT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}{!u.confirmed && <span style={{ fontSize: 8, color: ORANGE, marginLeft: 6 }}>non confirmé</span>}</span>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name ?? '—'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(u.last_sign_in_at)}</span>
              <select value={u.plan ?? ''} onChange={e => setUserPlan(u.id, e.target.value)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 11, maxWidth: '100%' }}>
                <option value="">— Aucun —</option>
                {(config?.plans ?? []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => openView(u.id)} title="Voir les données (support)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Eye size={14} /></button>
                {confirmDel === u.id ? (
                  <button onClick={() => deleteUser(u.id)} title="Confirmer la suppression" style={{ background: ORANGE, border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--chocolate)', padding: '4px 6px' }}><Check size={13} /></button>
                ) : (
                  <button onClick={() => setConfirmDel(u.id)} title="Supprimer ce compte" style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE }}><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Aucun compte.</p>}
        </div>
      )}

      {/* ── Thème (stylisation de tout le site) ── */}
      {tab === 'theme' && config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE }}>Couleurs du site</p>
              <button onClick={() => setConfig(c => c && ({ ...c, theme: {} }))} style={{ ...DF, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Tout réinitialiser</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Surcharge l&apos;apparence de toute l&apos;application pour tous les utilisateurs. Vide = couleur par défaut.</p>
            {THEME_FIELDS.map(f => {
              const set = !!config.theme[f.key]
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: 12, color: WHEAT }}>{f.label}</span>
                  {set && <button onClick={() => setTheme({ [f.key]: undefined })} title="Réinitialiser" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>}
                  <input type="color" value={config.theme[f.key] || DEFAULT_HEX[f.key]} onChange={e => setTheme({ [f.key]: e.target.value })}
                    style={{ width: 40, height: 30, borderRadius: 7, border: '2px solid var(--ink)', padding: 2, cursor: 'pointer', background: 'var(--bg-input)', opacity: set ? 1 : 0.55 }} />
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 0' }}>
              <span style={{ flex: 1, fontSize: 12, color: WHEAT }}>Arrondi des coins (px)</span>
              <input type="number" min="0" max="40" value={config.theme.radius ?? ''} placeholder="défaut"
                onChange={e => setTheme({ radius: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
                style={{ width: 90, ...inp }} />
            </div>
          </div>

          {/* Presets */}
          <div style={{ ...card, padding: 18 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE, marginBottom: 10 }}>Presets</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {BUILTIN_PRESETS.map(p => (
                <button key={p.name} onClick={() => setConfig(c => c && ({ ...c, theme: p.theme }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '2px solid var(--ink)', background: 'var(--bg-input)', cursor: 'pointer', ...DF, fontSize: 11, fontWeight: 700, color: WHEAT }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.theme.accent }} />{p.name}
                </button>
              ))}
            </div>
            {config.themePresets.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {config.themePresets.map(p => (
                  <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 12px', borderRadius: 20, border: `2px solid ${TEAL}`, background: 'var(--bg-input)', ...DF, fontSize: 11, fontWeight: 700, color: WHEAT }}>
                    <button onClick={() => setConfig(c => c && ({ ...c, theme: p.theme }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, ...DF, fontWeight: 700, fontSize: 11 }}>{p.name || 'Sans nom'}</button>
                    <button onClick={() => setConfig(c => c && ({ ...c, themePresets: c.themePresets.filter(x => x.id !== p.id) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nom du preset à enregistrer…" style={{ ...inp, flex: 1 }} />
              <button onClick={saveAsPreset} disabled={!presetName.trim()} style={{ ...DF, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 8, border: '2px solid var(--ink)', background: 'var(--bg-card)', color: WHEAT, cursor: presetName.trim() ? 'pointer' : 'default', opacity: presetName.trim() ? 1 : 0.5 }}>Enregistrer</button>
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>Enregistre le thème courant comme preset (sauvegardé avec « Appliquer »).</p>
          </div>

          {/* Aperçu live */}
          <div style={{ ...card, padding: 18 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: ORANGE, marginBottom: 10 }}>Aperçu</p>
            {(() => {
              const tv = (k: 'accent' | 'secondary' | 'ink' | 'bg' | 'card' | 'text') => config.theme[k] || DEFAULT_HEX[k]
              const r = config.theme.radius ?? 16
              return (
                <div style={{ background: tv('bg'), border: `2px solid ${tv('ink')}`, borderRadius: r, padding: 18 }}>
                  <div style={{ background: tv('card'), border: `2px solid ${tv('ink')}`, borderRadius: r, boxShadow: `4px 4px 0 ${tv('ink')}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ ...DF, fontSize: 16, fontWeight: 900, color: tv('text') }}>Aperçu du thème</p>
                    <p style={{ fontSize: 12, color: tv('text'), opacity: 0.7 }}>Un exemple de carte avec tes couleurs.</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button style={{ background: tv('accent'), color: tv('bg'), border: `2px solid ${tv('ink')}`, borderRadius: r * 0.6, padding: '8px 14px', ...DF, fontWeight: 800, fontSize: 12 }}>Action</button>
                      <span style={{ background: tv('secondary'), color: tv('bg'), borderRadius: 20, padding: '4px 12px', ...DF, fontWeight: 700, fontSize: 11 }}>Étiquette</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveConfig} disabled={savingCfg} className="nb-press"
              style={{ ...DF, fontWeight: 800, fontSize: 12, padding: '10px 22px', borderRadius: 'var(--radius-lg)', background: ORANGE, color: 'var(--chocolate)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
              {savingCfg ? 'Application…' : 'Appliquer le thème'}
            </button>
            {cfgMsg && <span style={{ fontSize: 12, color: cfgMsg.startsWith('✅') ? TEAL : ORANGE }}>{cfgMsg}</span>}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Recharge la page après application.</span>
          </div>
        </div>
      )}

      {/* ── Abonnements (plans) ── */}
      {tab === 'plans' && config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 620 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Définis les formules d&apos;abonnement. Tu peux ensuite assigner un plan à chaque compte dans l&apos;onglet Utilisateurs. (La facturation Stripe se branchera dessus une fois mise en place.)</p>
          {config.plans.map((p, i) => (
            <div key={p.id} style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={p.name} onChange={e => setPlans(config.plans.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Nom du plan" style={{ ...inp, flex: 1 }} />
                <input type="number" value={p.price} onChange={e => setPlans(config.plans.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} placeholder="€/mois" style={{ ...inp, width: 110 }} />
                <button onClick={() => setPlans(config.plans.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, padding: 6 }}><Trash2 size={15} /></button>
              </div>
              <textarea value={p.features.join('\n')} onChange={e => setPlans(config.plans.map((x, j) => j === i ? { ...x, features: e.target.value.split('\n') } : x))}
                placeholder="Une fonctionnalité par ligne…" rows={3} style={{ ...inp, resize: 'vertical', fontSize: 12 }} />
            </div>
          ))}
          <button onClick={() => setPlans([...config.plans, { id: rid(), name: '', price: 0, features: [] }])}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px dashed var(--border)', cursor: 'pointer', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 12 }}>
            <Plus size={14} /> Ajouter un plan
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={saveConfig} disabled={savingCfg} className="nb-press"
              style={{ ...DF, fontWeight: 800, fontSize: 12, padding: '10px 22px', borderRadius: 'var(--radius-lg)', background: ORANGE, color: 'var(--chocolate)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
              {savingCfg ? 'Enregistrement…' : 'Enregistrer les plans'}
            </button>
            {cfgMsg && <span style={{ fontSize: 12, color: cfgMsg.startsWith('✅') ? TEAL : ORANGE }}>{cfgMsg}</span>}
          </div>
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

      {/* ── Modal « Voir les données » (support, lecture seule) ── */}
      {(view || viewLoading) && (
        <div onClick={() => setView(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh' }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 560, maxHeight: '82vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '2px solid var(--ink)' }}>
              <p style={{ ...DF, fontSize: 15, fontWeight: 900, color: WHEAT }}>{viewLoading ? 'Chargement…' : view?.user.email}</p>
              <button onClick={() => setView(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {viewLoading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={18} className="animate-spin" /></div>
            ) : view && (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {view.user.display_name && <>Nom : <b style={{ color: WHEAT }}>{view.user.display_name}</b> · </>}
                  Plan : <b style={{ color: WHEAT }}>{view.user.plan ?? '—'}</b> · Créé le {fmtDate(view.user.created_at)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {Object.entries(view.counts).map(([t, n]) => (
                    <div key={t} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{TABLE_LABELS[t] ?? t}</p>
                      <p style={{ ...DF, fontSize: 18, fontWeight: 900, color: WHEAT }}>{n}</p>
                    </div>
                  ))}
                </div>
                {view.samples.recipes.length > 0 && (
                  <div><p style={{ fontSize: 10, color: ORANGE, ...DF, fontWeight: 700, marginBottom: 4 }}>RECETTES RÉCENTES</p>{view.samples.recipes.map((r, i) => <p key={i} style={{ fontSize: 12, color: WHEAT }}>• {r.name}</p>)}</div>
                )}
                {view.samples.transactions.length > 0 && (
                  <div><p style={{ fontSize: 10, color: ORANGE, ...DF, fontWeight: 700, marginBottom: 4 }}>DERNIÈRES TRANSACTIONS</p>{view.samples.transactions.map((tr, i) => <p key={i} style={{ fontSize: 12, color: WHEAT }}>• {tr.type === 'income' ? '+' : '-'}{tr.amount} € {tr.description ? `— ${tr.description}` : ''} ({fmtDate(tr.date)})</p>)}</div>
                )}
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Note : les données stockées dans le navigateur de l&apos;utilisateur (inventaire, comptes locaux…) ne sont pas visibles côté serveur.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
