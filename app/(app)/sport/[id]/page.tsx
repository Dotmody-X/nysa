'use client'
import { useEffect, useState, Component, ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, MapPin, Clock, Zap, TrendingUp, Flame, Wind } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RunningActivity } from '@/types'
import type { GpxPoint, GpxKmSplit } from '@/lib/parseGpx'
import { useActivitySegments } from '@/hooks/useActivitySegments'
import { SegmentDetails } from '@/components/sport/SegmentDetails'

// Import Leaflet uniquement côté client
const ActivityMap = dynamic(
  () => import('@/components/sport/ActivityMap').then(m => m.ActivityMap),
  { ssr: false, loading: () => <div style={{ height: 360, background: '#0C0C0C', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(245,223,187,0.3)', fontSize: 12 }}>Chargement de la carte…</span></div> }
)

// Error boundary léger pour éviter le crash total de la page
class SafeMap extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: 360, background: '#161616', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🗺️</span>
          <p style={{ fontSize: 12, color: 'rgba(245,223,187,0.4)', fontFamily: 'var(--font-display)' }}>Carte non disponible</p>
        </div>
      )
    }
    return this.props.children
  }
}

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtPace(sec: number) {
  if (!sec || !isFinite(sec)) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}
function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return `${m}min ${String(s).padStart(2, '0')}s`
}
function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

interface GpxStored {
  points:        GpxPoint[]
  kmSplits:      GpxKmSplit[]
  elevationGain: number
  elevationLoss: number
  elevationMax:  number
  elevationMin:  number
}

// ── Profil d'élévation SVG ──────────────────────────────────────
function ElevationProfile({ points, elevationMin, elevationMax }: { points: GpxPoint[]; elevationMin: number; elevationMax: number }) {
  if (points.length < 2) return null
  const W = 800; const H = 100
  const range = (elevationMax - elevationMin) || 1
  // Sous-échantillonnage pour les perfs
  const step = Math.max(1, Math.floor(points.length / W))
  const sampled = points.filter((_, i) => i % step === 0)

  const pts = sampled.map((p, i) => {
    const x = (i / (sampled.length - 1)) * W
    const y = H - ((p.ele - elevationMin) / range) * H
    return `${x},${y}`
  }).join(' ')

  const firstPt = `0,${H} ` + pts + ` ${W},${H}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F2542D" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F2542D" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={firstPt} fill="url(#eleGrad)" />
      <polyline points={pts} fill="none" stroke="#F2542D" strokeWidth="1.5" />
    </svg>
  )
}

// ── Graphique allure par km (barres SVG) ────────────────────────
function PaceChart({ splits }: { splits: GpxKmSplit[] }) {
  if (splits.length === 0) return null
  const maxPace = Math.max(...splits.map(s => s.paceSecPerKm))
  const minPace = Math.min(...splits.map(s => s.paceSecPerKm))
  const range   = (maxPace - minPace) || 1
  const barW    = Math.max(8, Math.floor(560 / splits.length) - 3)
  const H       = 80

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${splits.length * (barW + 3) + 20} ${H + 24}`} style={{ width: '100%', minWidth: splits.length * 20, height: 'auto' }}>
        {splits.map((s, i) => {
          // Allure plus rapide = barre plus haute (inverse)
          const h = Math.max(4, ((maxPace - s.paceSecPerKm) / range) * (H - 8) + 8)
          const x = 10 + i * (barW + 3)
          const y = H - h
          const isGood = s.paceSecPerKm <= (minPace + range * 0.3)
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={2}
                fill={isGood ? '#0E9594' : '#F2542D'} opacity={0.85} />
              <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                style={{ fontSize: 8, fill: 'rgba(245,223,187,0.4)', fontFamily: 'var(--font-display)' }}>
                {s.km}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function ActivityDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [activity, setActivity] = useState<RunningActivity | null>(null)
  const [loading, setLoading]   = useState(true)
  const { segments, loading: segmentsLoading } = useActivitySegments(id || null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('running_activities')
        .select('*')
        .eq('id', id)
        .single()
      setActivity(data as RunningActivity ?? null)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement de l'activité…</p>
      </div>
    )
  }
  if (!activity) {
    return (
      <div style={{ padding: 30 }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={12} /> Retour
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>Activité introuvable.</p>
      </div>
    )
  }

  const rawData = activity.raw_data as any
  const gpxData = rawData?.gpx as GpxStored | undefined

  // Support Strava polyline (stocké comme tableau {lat, lon, ele})
  const stravaPoints = rawData?.polyline as { lat: number; lon: number; ele: number }[] | undefined
  const mapPoints: GpxPoint[] = gpxData?.points
    ?? stravaPoints?.map(p => ({ lat: p.lat, lon: p.lon, ele: p.ele ?? 0, time: null }))
    ?? []
  const hasGpx = mapPoints.length > 1

  const isFromStrava = activity.source === 'strava'

  const pace = activity.pace_sec_per_km
    ?? (activity.duration_seconds && activity.distance_km
      ? activity.duration_seconds / activity.distance_km
      : null)

  const speed = activity.duration_seconds && activity.distance_km
    ? (activity.distance_km / (activity.duration_seconds / 3600))
    : null

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>

      {/* ── Back + titre ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 mb-3"
            style={{ color: 'var(--text-muted)', fontSize: 11, ...DF, fontWeight: 600, letterSpacing: '0.05em' }}>
            <ArrowLeft size={12} /> RUNNING
          </button>
          <h1 style={{ ...DF, fontWeight: 900, fontSize: 28, color: 'var(--wheat)', lineHeight: 1.1, marginBottom: 4 }}>
            {(activity as any).title ?? `Course · ${activity.distance_km} km`}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            {fmtDate(activity.date)}
            {isFromStrava && (
              <span style={{ marginLeft: 8, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(252,76,2,0.15)', color: '#FC4C02', ...DF, fontWeight: 700 }}>
                STRAVA
              </span>
            )}
            {!isFromStrava && hasGpx && (
              <span style={{ marginLeft: 8, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(242,84,45,0.15)', color: '#F2542D', ...DF, fontWeight: 700 }}>
                GPX
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── KPIs principaux ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        {[
          { label: 'Distance',  value: `${activity.distance_km?.toFixed(2)} km`,        color: '#F2542D', icon: <Wind size={14} /> },
          { label: 'Durée',     value: activity.duration_seconds ? fmtDur(activity.duration_seconds) : '—', color: '#F5DFBB', icon: <Clock size={14} /> },
          { label: 'Allure',    value: pace ? `${fmtPace(pace)}/km` : '—',               color: '#0E9594', icon: <Zap size={14} /> },
          { label: 'Vitesse',   value: speed ? `${speed.toFixed(1)} km/h` : '—',         color: '#F0E4CC', icon: <TrendingUp size={14} /> },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ color: stat.color }}>
              {stat.icon}
              <span style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
            <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Stats secondaires ── */}
      {(gpxData || activity.elevation_m || activity.heart_rate_avg) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          {gpxData && (
            <>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
                <p style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>D+</p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>+{Math.round(gpxData.elevationGain)}m</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
                <p style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>D−</p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>-{Math.round(gpxData.elevationLoss)}m</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
                <p style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Altitude max</p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>{Math.round(gpxData.elevationMax)}m</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
                <p style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Splits</p>
                <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>{gpxData.kmSplits.length} km</p>
              </div>
            </>
          )}
          {!gpxData && activity.elevation_m && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
              <p style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Dénivelé +</p>
              <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: 'var(--wheat)' }}>+{activity.elevation_m}m</p>
            </div>
          )}
          {activity.heart_rate_avg && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
              <div className="flex items-center gap-1.5 mb-2" style={{ color: '#F2542D' }}>
                <Flame size={14} />
                <span style={{ ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>FC moy.</span>
              </div>
              <p style={{ ...DF, fontWeight: 900, fontSize: 22, color: '#F2542D' }}>{activity.heart_rate_avg} bpm</p>
            </div>
          )}
        </div>
      )}

      {/* ── Carte + Graphiques ── */}
      {hasGpx ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
          {/* Carte — prend toute la largeur si pas de données GPX détaillées */}
          <div className={gpxData ? 'md:col-span-2' : 'md:col-span-3'}>
            <SafeMap>
              <ActivityMap points={mapPoints} height={360} />
            </SafeMap>
          </div>

          {/* Colonne droite — uniquement si données GPX disponibles */}
          {gpxData && (
            <div className="flex flex-col gap-[10px]">
              {/* Profil d'élévation */}
              <div style={{ background: '#11686A', borderRadius: 12, padding: 16, flex: 1 }}>
                <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F0E4CC', textTransform: 'uppercase', marginBottom: 8 }}>
                  Profil d'élévation
                </p>
                <div style={{ height: 100, borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
                  <ElevationProfile
                    points={gpxData.points}
                    elevationMin={gpxData.elevationMin}
                    elevationMax={gpxData.elevationMax}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.6)' }}>min {Math.round(gpxData.elevationMin)}m</span>
                  <span style={{ fontSize: 10, color: 'rgba(240,228,204,0.6)' }}>max {Math.round(gpxData.elevationMax)}m</span>
                </div>
              </div>

              {/* Allure par km */}
              {gpxData.kmSplits.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
                  <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase', marginBottom: 8 }}>
                    Allure par km
                  </p>
                  <PaceChart splits={gpxData.kmSplits} />
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                    Teal = rapide · Orange = lent
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Détails Strava km-par-km (depuis activity_segments) */}
          {segments && segments.length > 0 && !segmentsLoading && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginTop: 16 }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase', marginBottom: 16 }}>
                ⚡ Détails Strava (km-par-km)
              </p>
              <SegmentDetails segments={segments} />
            </div>
          )}
        </div>
      ) : (
        /* Saisie manuelle — pas de carte */
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
          <MapPin size={28} style={{ color: 'var(--text-subtle)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saisie manuelle — pas de trace GPS</p>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Synchronise depuis Strava pour afficher la carte</p>
        </div>
      )}

      {/* ── Tableau des splits — GPX uniquement ── */}
      {gpxData && gpxData.kmSplits.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase' }}>
              Splits détaillés
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Km', 'Allure', 'D+', 'D−'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: h === 'Km' ? 'left' : 'right', ...DF, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gpxData.kmSplits.map((s, i) => {
                  const avgPaceSec = gpxData.kmSplits.reduce((sum, x) => sum + x.paceSecPerKm, 0) / gpxData.kmSplits.length
                  const isFast = s.paceSecPerKm <= avgPaceSec
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ ...DF, fontWeight: 700, fontSize: 13, color: 'var(--wheat)' }}>km {s.km}</span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <span style={{ ...DF, fontWeight: 700, fontSize: 13, color: isFast ? '#0E9594' : '#F2542D' }}>
                          {fmtPace(s.paceSecPerKm)}/km
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                        +{Math.round(s.eleGain)}m
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                        -{Math.round(s.eleLoss)}m
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {activity.notes && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Notes</p>
          <p style={{ fontSize: 13, color: 'var(--wheat)', lineHeight: 1.6 }}>{activity.notes}</p>
        </div>
      )}

    </div>
  )
}
