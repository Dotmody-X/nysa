'use client'

import { useMemo } from 'react'
import { RefreshCw, Loader2, Radar, Calendar } from '@/components/ui/icons'
import { PageTitle, StickerButton } from '@/components/ui/PageTitle'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'
import { prochainPremierLundi, fmtJour, moisCouvert } from '@/lib/radar'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const RADAR_COLOR = 'var(--accent-rapports)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

/**
 * Radar mensuel : le bilan du mois écoulé et les 60 jours à venir, déposé
 * dans work.digests chaque premier lundi. Même carte éditoriale que le Brief ;
 * ici une seule à la fois, car un radar se lit en entier.
 */
export default function RadarPage() {
  const { digests, loading, error, refetch, latestRadar } = useDigests(['radar'])
  const precedents = useMemo(() => digests.filter(d => d.id !== latestRadar?.id), [digests, latestRadar])
  const prochain = useMemo(() => prochainPremierLundi(), [])

  return (
    <div style={{ padding: 30, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageTitle title="Radar" sub="Le mois vu d'en haut, chaque premier lundi" accent={RADAR_COLOR} icon={Radar} iconInk="var(--ink-light)"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span title="Le radar est déposé le premier lundi du mois, vers 8 h"
              style={{ ...DF, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              <Calendar size={13} style={{ color: RADAR_COLOR }} /> Prochain : {fmtJour(prochain)}
            </span>
            <StickerButton onClick={refetch} accent="var(--bg-card)" ink={WHEAT}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualiser
            </StickerButton>
          </div>
        } />

      {error && (
        <div style={{ ...card(), padding: '12px 16px', color: 'var(--accent-brand)', fontSize: 12 }}>
          Impossible de charger le radar : {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
      ) : !latestRadar ? (
        <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Aucun radar pour l’instant. Le premier tombera {fmtJour(prochain)}.
        </div>
      ) : (
        <>
          {/* Le radar du moment, seul sur sa ligne : il se lit en entier. */}
          <div style={{ maxWidth: 860 }}>
            <DigestCard digest={latestRadar} />
          </div>

          {/* Les mois d'avant, en dessous, pour comparer d'un mois à l'autre. */}
          {precedents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
                <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: WHEAT, whiteSpace: 'nowrap' }}>
                  Mois précédents
                </span>
                <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.85, borderRadius: 1 }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {precedents.map(d => moisCouvert(d.generated_at)).join(' · ')}
                </span>
              </div>
              {precedents.map(d => <DigestCard key={d.id} digest={d} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
