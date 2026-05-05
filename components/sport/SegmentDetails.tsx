'use client'

import { useState } from 'react'
import { TrendingUp, Flame } from 'lucide-react'
import type { ActivitySegment } from '@/hooks/useActivitySegments'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = '#F2542D'
const TEAL = '#0E9594'

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

  // ✅ Recalc max pour graphique
  const getMetricData = () => {
    const data: number[] = []
    segments.forEach((seg) => {
      switch (metric) {
        case 'pace':
          data.push(seg.pace_sec_per_km || 0)
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
          data.push(Math.abs(seg.grade_avg || 0))
          break
      }
    })
    return data
  }

  const metricData = getMetricData()
  const max = Math.max(...metricData, 1)
  const H = 120
  const W = Math.max(400, segments.length * 28)
  const barW = Math.max(6, Math.floor(W / segments.length) - 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 🎚️ Metric Selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'pace', label: '⚡ Allure', icon: '📍' },
          { key: 'hr', label: '❤️ FC', icon: '❤️' },
          { key: 'cadence', label: '🦵 Cadence', icon: '🦵' },
          { key: 'power', label: '⚙️ Puissance', icon: '⚙️' },
          { key: 'grade', label: '📈 Pente', icon: '📈' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key as any)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: metric === m.key ? ORANGE : 'rgba(255,255,255,0.06)',
              color: metric === m.key ? '#0C0C0C' : 'var(--wheat)',
              border: `1px solid ${metric === m.key ? ORANGE : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: metric === m.key ? 700 : 600,
              transition: 'all 0.15s',
              ...DF,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* 📊 Bar Chart */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(242,84,45,0.08) 0%, rgba(14,149,148,0.04) 100%)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)',
        position: 'relative',
        minHeight: H + 60,
      }}>
        <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: '100%', minHeight: H + 60 }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={`grid-${pct}`}
              x1={0}
              y1={H * (1 - pct)}
              x2={W}
              y2={H * (1 - pct)}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2,2"
              strokeWidth={0.5}
            />
          ))}

          {/* Bars */}
          {metricData.map((v, i) => {
            const bh = Math.max(1, (v / max) * H)
            const x = (i / segments.length) * W + 2
            const y = H - bh
            const isSelected = i === selectedKm
            const isHigh = v >= max * 0.8

            return (
              <g key={i} onClick={() => setSelectedKm(i)} style={{ cursor: 'pointer' }}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={bh}
                  rx={2}
                  fill={
                    isSelected
                      ? ORANGE
                      : metric === 'pace'
                      ? isHigh ? '#FF6B35' : ORANGE
                      : isHigh ? ORANGE : TEAL
                  }
                  opacity={isSelected ? 1 : 0.7}
                />

                {/* Label */}
                <text
                  x={x + barW / 2}
                  y={H + 16}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: isSelected ? ORANGE : 'rgba(240,228,204,0.4)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                  }}>
                  {segments[i]?.km_index || i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 📋 Tableau Détail */}
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 11,
          }}>
            <thead>
              <tr style={{
                background: 'rgba(242,84,45,0.1)',
                borderBottom: '1px solid var(--border)',
              }}>
                {[
                  { key: 'km', label: 'KM', width: 50 },
                  { key: 'pace', label: 'Allure', width: 70 },
                  { key: 'hr', label: 'FC', width: 60 },
                  { key: 'cad', label: 'Cad', width: 60 },
                  { key: 'grade', label: 'Pente', width: 60 },
                  { key: 'elev', label: 'D+', width: 50 },
                  { key: 'time', label: 'Temps', width: 60 },
                ].map(h => (
                  <th
                    key={h.key}
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: ORANGE,
                      ...DF,
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      width: h.width,
                    }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, i) => (
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
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--wheat)', fontSize: 10 }}>
                    {fmtPace(seg.pace_sec_per_km)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: seg.heart_rate_avg ? '#FF6B35' : 'var(--text-muted)', fontSize: 10 }}>
                    {seg.heart_rate_avg ? `${seg.heart_rate_avg}` : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--wheat)', fontSize: 10 }}>
                    {seg.cadence_avg ? `${seg.cadence_avg}` : '—'}
                  </td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    color: seg.grade_avg > 0.2 ? ORANGE : seg.grade_avg < -0.2 ? TEAL : 'var(--text-muted)',
                    fontSize: 10,
                  }}>
                    {Math.abs(seg.grade_avg) > 0.1 ? `${seg.grade_avg.toFixed(1)}%` : '—'}
                  </td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    color: seg.elevation_gain > 0 ? ORANGE : 'var(--text-muted)',
                    fontSize: 10,
                  }}>
                    {seg.elevation_gain > 0 ? `+${seg.elevation_gain}` : '—'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--wheat)', fontSize: 10 }}>
                    {Math.floor(seg.time_seconds / 60)}:{String(seg.time_seconds % 60).padStart(2, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎯 Détail KM Sélectionné */}
      {selectedKm !== null && segments[selectedKm] && (
        <div style={{
          background: `linear-gradient(135deg, rgba(242,84,45,0.15) 0%, rgba(14,149,148,0.05) 100%)`,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${ORANGE}40`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} style={{ color: ORANGE }} />
            <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: ORANGE }}>
              KM {segments[selectedKm].km_index} — Détails Complets
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 12,
          }}>
            {/* Pace */}
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Allure</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                {fmtPace(segments[selectedKm].pace_sec_per_km)}/km
              </p>
            </div>

            {/* HR */}
            {segments[selectedKm].heart_rate_avg > 0 && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>FC</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>
                  {segments[selectedKm].heart_rate_avg} bpm
                </p>
                <p style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                  {segments[selectedKm].heart_rate_min}/{segments[selectedKm].heart_rate_max}
                </p>
              </div>
            )}

            {/* Cadence */}
            {segments[selectedKm].cadence_avg > 0 && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Cadence</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                  {segments[selectedKm].cadence_avg} rpm
                </p>
              </div>
            )}

            {/* Power */}
            {segments[selectedKm].power_avg > 0 && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Puissance</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>
                  {segments[selectedKm].power_avg} W
                </p>
              </div>
            )}

            {/* Grade */}
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Pente</p>
              <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: segments[selectedKm].grade_avg > 0.2 ? ORANGE : segments[selectedKm].grade_avg < -0.2 ? TEAL : 'var(--text-muted)',
              }}>
                {Math.abs(segments[selectedKm].grade_avg) > 0.1 ? `${segments[selectedKm].grade_avg.toFixed(1)}%` : '—'}
              </p>
            </div>

            {/* Elevation */}
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Altitude</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                {segments[selectedKm].altitude_start} m
              </p>
              <p style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                → {segments[selectedKm].altitude_end} m
              </p>
            </div>

            {/* Temps */}
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Temps</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                {Math.floor(segments[selectedKm].time_seconds / 60)}:{String(segments[selectedKm].time_seconds % 60).padStart(2, '0')}
              </p>
            </div>

            {/* Temperature */}
            {segments[selectedKm].temperature_avg && segments[selectedKm].temperature_avg > -50 && (
              <div>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, ...DF, fontWeight: 700 }}>Temp</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
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
