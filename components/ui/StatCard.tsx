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
  fiery: 'var(--accent-budget)',
  cyan:  'var(--azul)',
  teal:  'var(--accent-health)',
  wheat: 'var(--accent-courses)',
}

// Dark accents → cream icon; light accents → ink.
const accentIsDark: Record<AccentColor, boolean> = {
  fiery: false,
  cyan:  true,
  teal:  true,
  wheat: false,
}

export function StatCard({ label, value, unit, sub, icon, accent = 'cyan', trend }: StatCardProps) {
  const color = accentColor[accent]
  const iconChipText = accentIsDark[accent] ? 'var(--creamy-ivory)' : 'var(--chocolate)'

  return (
    <Card className="flex flex-col gap-3 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && (
          <span
            className="inline-flex items-center justify-center"
            style={{
              background: color,
              color: iconChipText,
              border: '2px solid var(--ink)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '2px 2px 0 var(--ink)',
              width: 30,
              height: 30,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Valeur principale */}
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold leading-none" style={{ color: 'var(--text)' }}>
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
              style={{ color: trend >= 0 ? 'var(--azul)' : 'var(--accent-budget)' }}
            >
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
