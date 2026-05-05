'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ActivitySegment } from '@/hooks/useActivitySegments'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

function fmtPace(sec: number) {
  if (!sec || !isFinite(sec)) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

export function SegmentDetails({ segments }: { segments: ActivitySegment[] }) {
  const [selectedKm, setSelectedKm] = useState<number | null>(null)
  const [metric, setMetric] = useState<'pace' | 'hr' | 'cadence' | 'power' | 'grade'>('pace')

  if (segments.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(240,228,204,0.4)', fontSize: 12 }}>
        Pas de données détaillées disponibles
      </div>
    )
  }

  // Graphique interactif
  const getMetricData = () => {
    const data: number[] = []
    const labels: string[] = []

    segments.forEach((seg) => {
      labels.push(`${seg.km_index}`)
      switch (metric) {
        case 'pace':
          data.push(seg.pace_sec_per_km)
          break
        case 'hr':
          data.push(seg.heart_rate_avg || 0)
          break
        case 'cadence':
          data.push(seg.cadence_avg || 0)
          break
        case 'power':
          data.push(seg.power_avg || 0)
          break
        case 'grade':
          data.push(Math.abs(seg.grade_avg) || 0)
          break
      }
    })

    return { data, labels }
  }

  const { data, labels } = getMetricData()
  const max = Math.max(...data, 1)
  const H = 100
  const W = Math.max(300, segments.length * 30)
  const barW = Math.max(8, Math.floor(W / segments.length) - 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sélecteur de métrique */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'pace', label: '⚡ Allure', unit: '/km' },
          { key: 'hr', label: '❤️ FC', unit: 'bpm' },
          { key: 'cadence', label: '🦵 Cadence', unit: 'rpm' },
          { key: 'power', label: '⚙️ Puissance', unit: 'W' },
          { key: 'grade', label: '📈 Pente', unit: '%' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key as any)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: metric === m.key ? '#F2542D' : 'rgba(255,255,255,0.08)',
              color: metric === m.key ? '#0C0C0C' : 'var(--wheat)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: metric === m.key ? 700 : 600,
              transition: 'all 0.2s',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Graphique */}
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)',
        height: H + 50,
        display: 'flex',
        alignItems: 'flex-end',
      }}>
        <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: '100%' }}>
          {data.map((v, i) => {
            const bh = Math.max(2, (v / max) * H)
            const x = i * (W / segments.length) + 5
            const y = H - bh
            const isSelected = i === selectedKm

            return (
              <g key={i}>
                {/* Barre */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={bh}
                  rx={3}
                  fill={isSelected ? '#FF6B35' : '#F2542D'}
                  opacity={isSelected ? 1 : 0.6}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedKm(i)}
                />
                {/* Label */}
                <text
                  x={x + barW / 2}
                  y={H + 14}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: isSelected ? '#F2542D' : 'rgba(240,228,204,0.4)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedKm(i)}>
                  {labels[i]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Tableau détail km-par-km */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>km</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Allure</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>FC</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Cadence</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Pente</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>D+</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Temps</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, i) => (
              <tr
                key={i}
                onClick={() => setSelectedKm(i)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selectedKm === i ? 'rgba(242,84,45,0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#F2542D' }}>
                  km {seg.km_index}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--wheat)' }}>
                  {fmtPace(seg.pace_sec_per_km)}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: seg.heart_rate_avg ? '#FF6B35' : 'var(--text-muted)' }}>
                  {seg.heart_rate_avg ? `${seg.heart_rate_avg} bpm` : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--wheat)' }}>
                  {seg.cadence_avg ? `${seg.cadence_avg}` : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: seg.grade_avg > 0 ? '#FF6B35' : seg.grade_avg < 0 ? '#0E9594' : 'var(--text-muted)' }}>
                  {Math.abs(seg.grade_avg) > 0.1 ? `${seg.grade_avg.toFixed(1)}%` : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: seg.elevation_gain > 0 ? '#FF6B35' : 'var(--text-muted)' }}>
                  {seg.elevation_gain > 0 ? `+${seg.elevation_gain}m` : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--wheat)' }}>
                  {Math.floor(seg.time_seconds / 60)}:{String(seg.time_seconds % 60).padStart(2, '0')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Détail km sélectionné */}
      {selectedKm !== null && segments[selectedKm] && (
        <div style={{
          background: 'rgba(242,84,45,0.1)',
          borderRadius: 12,
          padding: 16,
          border: '1px solid rgba(242,84,45,0.2)',
        }}>
          <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: '#F2542D', marginBottom: 12 }}>
            📊 Détail km {segments[selectedKm].km_index}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Allure</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)' }}>
                {fmtPace(segments[selectedKm].pace_sec_per_km)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>FC Moyenne</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: segments[selectedKm].heart_rate_avg ? '#FF6B35' : 'var(--text-muted)' }}>
                {segments[selectedKm].heart_rate_avg ? `${segments[selectedKm].heart_rate_avg} bpm` : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>FC Min/Max</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)' }}>
                {segments[selectedKm].heart_rate_min && segments[selectedKm].heart_rate_max
                  ? `${segments[selectedKm].heart_rate_min}/${segments[selectedKm].heart_rate_max}`
                  : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Cadence</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)' }}>
                {segments[selectedKm].cadence_avg ? `${segments[selectedKm].cadence_avg} rpm` : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Pente</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: segments[selectedKm].grade_avg > 0 ? '#FF6B35' : segments[selectedKm].grade_avg < 0 ? '#0E9594' : 'var(--text-muted)' }}>
                {Math.abs(segments[selectedKm].grade_avg) > 0.1 ? `${segments[selectedKm].grade_avg.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>D+ / D-</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)' }}>
                {segments[selectedKm].altitude_end > segments[selectedKm].altitude_start
                  ? `+${segments[selectedKm].altitude_end - segments[selectedKm].altitude_start}m`
                  : `${segments[selectedKm].altitude_end - segments[selectedKm].altitude_start}m`}
              </p>
            </div>
            {segments[selectedKm].power_avg > 0 && (
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Puissance</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2542D' }}>
                  {segments[selectedKm].power_avg} W
                </p>
              </div>
            )}
            {segments[selectedKm].temperature_avg && (
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Température</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--wheat)' }}>
                  {segments[selectedKm].temperature_avg}°C
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
