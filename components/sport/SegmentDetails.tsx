'use client'

import { useState } from 'react'
import { TrendingUp, Zap, Activity } from 'lucide-react'
import type { ActivitySegment } from '@/hooks/useActivitySegments'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = '#F2542D'
const TEAL = '#0E9594'

function fmtPace(sec: number) {
  if (!sec || !isFinite(sec)) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function fmtTime(sec: number) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(Math.round(s)).padStart(2, '0')}`
}

// Simple bar chart matching NYSA style
function SimpleBarChart({ data, labels, color = ORANGE }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data, 1)
  const W = 280
  const H = 80

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: '100%' }}>
      {/* Grid */}
      <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
      
      {/* Bars */}
      {data.map((v, i) => {
        const barW = W / data.length - 4
        const x = (i / data.length) * W + 2
        const bh = Math.max(2, (v / max) * H)
        const y = H - bh

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={3} fill={color} opacity="0.8" />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8" fill="rgba(240,228,204,0.4)" fontFamily="var(--font-display)" fontWeight="600">
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function SegmentDetails({ segments }: { segments: ActivitySegment[] }) {
  const [selectedKm, setSelectedKm] = useState<number | null>(null)

  if (segments.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(240,228,204,0.4)', fontSize: 12 }}>
        Pas de données détaillées disponibles
      </div>
    )
  }

  // Prepare data for charts
  const paceData = segments.map(s => s.pace_sec_per_km || 0)
  const hrData = segments.map(s => s.heart_rate_avg || 0)
  const cadenceData = segments.map(s => s.cadence_avg || 0)
  const powerData = segments.map(s => s.power_avg || 0)
  const gradeData = segments.map(s => Math.abs(s.grade_avg || 0))
  const labels = segments.map(s => `${s.km_index}`)

  const hasHR = hrData.some(v => v > 0)
  const hasCadence = cadenceData.some(v => v > 0)
  const hasPower = powerData.some(v => v > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Allure par km */}
      <div style={{ background: 'rgba(242,84,45,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(242,84,45,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={14} style={{ color: ORANGE }} />
          <p style={{ ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ORANGE, textTransform: 'uppercase' }}>
            Allure km par km
          </p>
        </div>
        <div style={{ height: 100 }}>
          <SimpleBarChart data={paceData} labels={labels} color={ORANGE} />
        </div>
        <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Chaque barre = durée d'un km</p>
      </div>

      {/* FC par km */}
      {hasHR && (
        <div style={{ background: 'rgba(255,107,53,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,107,53,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Activity size={14} style={{ color: '#FF6B35' }} />
            <p style={{ ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#FF6B35', textTransform: 'uppercase' }}>
              FC km par km
            </p>
          </div>
          <div style={{ height: 100 }}>
            <SimpleBarChart data={hrData} labels={labels} color="#FF6B35" />
          </div>
        </div>
      )}

      {/* Cadence par km */}
      {hasCadence && (
        <div style={{ background: 'rgba(14,149,148,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(14,149,148,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} style={{ color: TEAL }} />
            <p style={{ ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: TEAL, textTransform: 'uppercase' }}>
              Cadence km par km
            </p>
          </div>
          <div style={{ height: 100 }}>
            <SimpleBarChart data={cadenceData} labels={labels} color={TEAL} />
          </div>
        </div>
      )}

      {/* Puissance par km */}
      {hasPower && (
        <div style={{ background: 'rgba(242,84,45,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(242,84,45,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={14} style={{ color: ORANGE }} />
            <p style={{ ...DF, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ORANGE, textTransform: 'uppercase' }}>
              Puissance km par km
            </p>
          </div>
          <div style={{ height: 100 }}>
            <SimpleBarChart data={powerData} labels={labels} color={ORANGE} />
          </div>
        </div>
      )}

      {/* Tableau détail */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: 'rgba(242,84,45,0.1)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'KM', width: 45 },
                  { label: 'Allure', width: 70 },
                  { label: 'FC', width: 55 },
                  { label: 'Cad.', width: 50 },
                  { label: 'Pente', width: 55 },
                  { label: 'D+', width: 45 },
                ].map(h => (
                  <th
                    key={h.label}
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: ORANGE,
                      ...DF,
                      fontSize: 9,
                      width: h.width,
                    }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.slice(0, 30).map((seg, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedKm(i)}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: selectedKm === i ? 'rgba(242,84,45,0.15)' : i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: ORANGE, ...DF }}>
                    {seg.km_index}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--wheat)', fontSize: 9 }}>
                    {fmtPace(seg.pace_sec_per_km)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: seg.heart_rate_avg ? '#FF6B35' : 'var(--text-muted)', fontSize: 9 }}>
                    {seg.heart_rate_avg ? seg.heart_rate_avg : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--wheat)', fontSize: 9 }}>
                    {seg.cadence_avg ? seg.cadence_avg : '—'}
                  </td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    color: Math.abs(seg.grade_avg) > 0.2 ? ORANGE : Math.abs(seg.grade_avg) > 0 ? 'var(--wheat)' : 'var(--text-muted)',
                    fontSize: 9,
                  }}>
                    {Math.abs(seg.grade_avg) > 0.1 ? `${seg.grade_avg.toFixed(1)}%` : '—'}
                  </td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    color: seg.elevation_gain > 5 ? ORANGE : 'var(--text-muted)',
                    fontSize: 9,
                  }}>
                    {seg.elevation_gain > 0 ? `+${seg.elevation_gain}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail popup KM sélectionné */}
      {selectedKm !== null && segments[selectedKm] && (
        <div style={{
          background: `linear-gradient(135deg, rgba(242,84,45,0.12) 0%, rgba(14,149,148,0.05) 100%)`,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${ORANGE}40`,
        }}>
          <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: ORANGE, marginBottom: 12 }}>
            KM {segments[selectedKm].km_index} — Détails
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: 12,
          }}>
            <div>
              <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>Allure</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                {fmtPace(segments[selectedKm].pace_sec_per_km)}
              </p>
            </div>
            {segments[selectedKm].heart_rate_avg > 0 && (
              <div>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>FC</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>
                  {segments[selectedKm].heart_rate_avg}
                </p>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
                  {segments[selectedKm].heart_rate_min}/{segments[selectedKm].heart_rate_max}
                </p>
              </div>
            )}
            {segments[selectedKm].cadence_avg > 0 && (
              <div>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>Cadence</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                  {segments[selectedKm].cadence_avg} rpm
                </p>
              </div>
            )}
            {segments[selectedKm].power_avg > 0 && (
              <div>
                <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>Puissance</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>
                  {segments[selectedKm].power_avg} W
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>Pente</p>
              <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: Math.abs(segments[selectedKm].grade_avg) > 0.2 ? ORANGE : 'var(--wheat)',
              }}>
                {Math.abs(segments[selectedKm].grade_avg) > 0.1 ? `${segments[selectedKm].grade_avg.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, ...DF, fontWeight: 700 }}>Temps</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                {fmtTime(segments[selectedKm].time_seconds)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
