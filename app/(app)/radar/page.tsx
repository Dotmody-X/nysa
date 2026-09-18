'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Loader2, Radar, Calendar } from '@/components/ui/icons'
import { PageTitle, StickerButton } from '@/components/ui/PageTitle'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'
import { Veille } from '@/components/radar/Veille'
import { brandColor } from '@/lib/digestStyle'
import { prochainPremierLundi, prochainLundi, fmtJour, moisCouvert } from '@/lib/radar'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const RADAR_COLOR = 'var(--accent-rapports)'

type Vue = 'mois' | 'esmoker' | 'aeterna'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

// Segments encrés — même langage que les onglets du Brief.
const chip = (active: boolean, color: string): React.CSSProperties => ({
  ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '8px 16px', minHeight: 36, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  border: '2px solid var(--ink)',
  boxShadow: active ? '3px 3px 0 var(--ink)' : 'none',
  background: active ? color : 'var(--bg-input)',
  color: active ? 'var(--ink-light)' : 'var(--text-muted)',
})

/**
 * Radar : ce qui se lit à distance de la journée. Le radar mensuel (premier
 * lundi) et les veilles hebdomadaires par marque (chaque lundi), toutes
 * déposées dans work.digests / work.veille_items par des tâches planifiées.
 */
export default function RadarPage() {
  const [vue, setVue] = useState<Vue>('mois')
  const prochainRadar = useMemo(() => prochainPremierLundi(), [])
  const prochaineVeille = useMemo(() => prochainLundi(), [])

  const sub = vue === 'mois' ? "Le mois vu d'en haut, chaque premier lundi" : 'La veille de la marque, chaque lundi'
  const prochain = vue === 'mois' ? prochainRadar : prochaineVeille

  return (
    <div style={{ padding: 30, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageTitle title="Radar" sub={sub} accent={RADAR_COLOR} icon={Radar} iconInk="var(--ink-light)"
        right={
          <span title="Déposé par une tâche planifiée, le matin"
            style={{ ...DF, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <Calendar size={13} style={{ color: RADAR_COLOR }} /> Prochain : {fmtJour(prochain)}
          </span>
        } />

      <div className="toolbar-scroll" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button className="nb-press" style={chip(vue === 'mois', RADAR_COLOR)} onClick={() => setVue('mois')}>Le mois</button>
        <button className="nb-press" style={chip(vue === 'esmoker', brandColor('E-Smoker'))} onClick={() => setVue('esmoker')}>Veille e-Smoker</button>
        <button className="nb-press" style={chip(vue === 'aeterna', brandColor('Aeterna'))} onClick={() => setVue('aeterna')}>Veille Aeterna</button>
      </div>

      {vue === 'mois' && <RadarMensuel />}
      {vue === 'esmoker' && <Veille brand="E-Smoker" />}
      {vue === 'aeterna' && <Veille brand="Aeterna" />}
    </div>
  )
}

/* ── Le radar mensuel : le dernier en grand, les mois d'avant en dessous ── */
function RadarMensuel() {
  const { digests, loading, error, refetch, latestRadar } = useDigests(['radar'])
  const precedents = useMemo(() => digests.filter(d => d.id !== latestRadar?.id), [digests, latestRadar])
  const prochain = useMemo(() => prochainPremierLundi(), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
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
          <DigestCard digest={latestRadar} />

          {/* Les mois d'avant, en dessous, pour comparer d'un mois à l'autre. */}
          {precedents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

      <div>
        <StickerButton onClick={refetch} accent="var(--bg-card)" ink={WHEAT}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualiser
        </StickerButton>
      </div>
    </div>
  )
}
