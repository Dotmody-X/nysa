'use client'

// ─────────────────────────────────────────────────────────────────────────────
// BriefDock — mini-fenêtre Brief intégrée, flottante, présente sur TOUTES les
// pages (montée dans le layout (app)). Se déploie/replie facilement :
//   • lanceur flottant en bas à droite (au-dessus de la nav mobile),
//   • clic → panneau compact (dernier brief / débrief via DigestCard),
//   • état ouvert/fermé mémorisé (localStorage),
//   • ouvrable de partout aussi via l'événement `nysa:toggle-brief`.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Sparkles, X, RefreshCw, Loader2, Sun, Moon } from '@/components/ui/icons'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const LS_KEY = 'nysa.briefDock.open'

// Panneau — monté uniquement quand ouvert (évite de charger les digests sur
// chaque page tant que l'utilisateur n'a pas déployé le dock).
function BriefPanel({ onClose }: { onClose: () => void }) {
  const { loading, error, refetch, latestBrief, latestDebrief } = useDigests()
  const [view, setView] = useState<'brief' | 'debrief'>('brief')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => { const id = setInterval(() => refetch(), 10 * 60 * 1000); return () => clearInterval(id) }, [refetch])
  useEffect(() => { if (!loading) setLastUpdate(new Date()) }, [loading])

  const current = view === 'brief' ? latestBrief : latestDebrief
  const isDebrief = view === 'debrief'

  const tab = (active: boolean, color: string): React.CSSProperties => ({
    ...DF, fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5,
    border: `2px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--bg-card)',
    color: active ? 'var(--creamy-ivory)' : 'var(--text-muted)',
  })

  return (
    <div style={{
      width: 'min(400px, calc(100vw - 32px))',
      maxHeight: 'min(72vh, 620px)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elev-2)', overflow: 'hidden',
      animation: 'nysa-dock-in 0.16s ease-out',
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <span style={{ ...DF, fontSize: 12, fontWeight: 900, color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Brief</span>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={tab(view === 'brief', 'var(--azul)')} onClick={() => setView('brief')}><Sun size={12} /> Brief</button>
          <button style={tab(isDebrief, 'var(--accent-budget)')} onClick={() => setView('debrief')}><Moon size={12} /> Débrief</button>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={refetch} title="Actualiser" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)' }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </button>
        <button onClick={onClose} title="Fermer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)' }}>
          <X size={13} />
        </button>
      </div>

      {/* Corps */}
      <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
        {error ? (
          <div style={{ padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--accent-budget)', fontSize: 12 }}>
            Impossible de charger : {error}
          </div>
        ) : loading && !current ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
        ) : current ? (
          <DigestCard digest={current} />
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)' }}>
            Aucun {isDebrief ? 'débrief' : 'brief'} pour l'instant.
          </div>
        )}
      </div>

      {/* Pied */}
      {lastUpdate && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 9, color: 'var(--text-subtle)', textAlign: 'center' }}>
          {loading ? 'Sync…' : `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })} · auto toutes les 10 min`}
        </div>
      )}
    </div>
  )
}

export function BriefDock() {
  const [open, setOpen] = useState(false)

  // Restaure l'état à l'ouverture de l'app
  useEffect(() => { try { if (localStorage.getItem(LS_KEY) === '1') setOpen(true) } catch {} }, [])

  const setPersisted = useCallback((next: boolean) => {
    setOpen(next)
    try { localStorage.setItem(LS_KEY, next ? '1' : '0') } catch {}
  }, [])

  // Ouvrable/fermable depuis n'importe où (ex. bouton de l'onglet Brief)
  useEffect(() => {
    const h = () => setOpen(o => { const n = !o; try { localStorage.setItem(LS_KEY, n ? '1' : '0') } catch {}; return n })
    window.addEventListener('nysa:toggle-brief', h)
    return () => window.removeEventListener('nysa:toggle-brief', h)
  }, [])

  return (
    <>
      <style>{`@keyframes nysa-dock-in{from{opacity:0;transform:translateY(10px) scale(0.98)}to{opacity:1;transform:none}}`}</style>

      {/* Lanceur (masqué quand le panneau est ouvert) */}
      {!open && (
        <button onClick={() => setPersisted(true)} title="Ouvrir le mini-Brief"
          className="fixed right-4 bottom-24 md:right-6 md:bottom-6 nb-press"
          style={{
            zIndex: 1400, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
            borderRadius: 999, background: 'var(--azul)', color: 'var(--creamy-ivory)',
            border: '1px solid var(--border)', boxShadow: 'var(--elev-2)', cursor: 'pointer',
            ...DF, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em',
          }}>
          <Sparkles size={15} /> Brief
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div className="fixed right-4 bottom-24 md:right-6 md:bottom-6" style={{ zIndex: 1500 }}>
          <BriefPanel onClose={() => setPersisted(false)} />
        </div>
      )}
    </>
  )
}
