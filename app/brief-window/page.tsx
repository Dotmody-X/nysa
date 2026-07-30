'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Fenêtre détachée du Brief — vue autonome (sans sidebar) à garder ouverte h24.
// Ouverte via window.open('/brief-window') depuis l'onglet Brief.
// Réutilise DigestCard + useDigests, rafraîchit toutes les 10 min.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, Sun, Moon } from '@/components/ui/icons'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

export default function BriefWindowPage() {
  const { loading, error, refetch, latestBrief, latestDebrief } = useDigests()
  const [view, setView] = useState<'brief' | 'debrief'>('brief')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Rafraîchissement automatique toutes les 10 minutes
  useEffect(() => {
    const id = setInterval(() => refetch(), 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [refetch])

  // Horodatage du dernier chargement réussi
  useEffect(() => { if (!loading) setLastUpdate(new Date()) }, [loading])

  const current = view === 'brief' ? latestBrief : latestDebrief
  const isDebrief = view === 'debrief'
  const accent = isDebrief ? 'var(--accent-budget)' : 'var(--azul)'

  const tab = (active: boolean, color: string): React.CSSProperties => ({
    ...DF, fontSize: 12, fontWeight: 800, padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    border: `2px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--bg-card)',
    color: active ? 'var(--creamy-ivory)' : 'var(--text-muted)',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Barre supérieure collante */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'var(--bg)', borderBottom: '2px solid var(--ink)', flexWrap: 'wrap',
      }}>
        <span style={{ ...DF, fontSize: 13, fontWeight: 900, color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          NYSA · Brief
        </span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          <button style={tab(view === 'brief', 'var(--azul)')} onClick={() => setView('brief')}>
            <Sun size={13} /> Brief
          </button>
          <button style={tab(view === 'debrief', 'var(--accent-budget)')} onClick={() => setView('debrief')}>
            <Moon size={13} /> Débrief
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {lastUpdate && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {loading ? 'Sync…' : `Maj ${lastUpdate.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        )}
        <button onClick={refetch} title="Actualiser"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '2px solid var(--ink)', cursor: 'pointer', color: 'var(--text)' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </header>

      {/* Contenu */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {error ? (
          <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)', background: 'var(--bg-card)', color: 'var(--accent-budget)', fontSize: 12 }}>
            Impossible de charger : {error}
          </div>
        ) : loading && !current ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
        ) : current ? (
          <DigestCard digest={current} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)' }}>
            Aucun {isDebrief ? 'débrief' : 'brief'} disponible pour l'instant.
          </div>
        )}
        <p style={{ marginTop: 14, fontSize: 10, color: 'var(--text-subtle)', textAlign: 'center', borderTop: `1px solid ${accent}`, paddingTop: 10, opacity: 0.7 }}>
          Fenêtre détachée · rafraîchissement automatique toutes les 10 min
        </p>
      </main>
    </div>
  )
}
