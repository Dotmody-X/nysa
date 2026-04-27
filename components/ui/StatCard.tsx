import { ReactNode } from 'react'
import { Card } from './Card'

type AccentColor = 'fiery' | 'cyan' | 'teal' | 'wheat'

interface StatCardProps {
  label:    string
  value:    string | number
  unit?:    string
  sub?:     string
  icon?:    ReactNode
  accent?:  AccentColor
  trend?:   number   // % positif ou négatif
}

const accentColor: Record<AccentColor, string> = {
  fiery: '#F2542D',
  cyan:  '#0E9594',
  teal:  '#11686A',
  wheat: '#F5DFBB',
}

export function StatCard({ label, value, unit, sub, icon, accent = 'cyan', trend }: StatCardProps) {
  const color = accentColor[accent]

  return (
    <Card className="flex flex-col gap-3 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && (
          <span className="opacity-70" style={{ color }}>
            {icon}
          </span>
        )}
      </div>

      {/* Valeur principale */}
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold leading-none" style={{ color: 'var(--wheat)' }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm pb-0.5" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Ligne du bas */}
      {(sub || trend !== undefined) && (
        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {sub && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {sub}
            </span>
          )}
          {trend !== undefined && (
            <span
              className="text-xs font-medium"
              style={{ color: trend >= 0 ? '#0E9594' : '#F2542D' }}
            >
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
