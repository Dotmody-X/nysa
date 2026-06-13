import { ReactNode } from 'react'

interface PageHeaderProps {
  title:    string
  sub?:     string
  actions?: ReactNode
}

export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          className="text-xl tracking-wider uppercase"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.01em' }}
        >
          {title}<span style={{ color: 'var(--accent-budget)' }}>.</span>
        </h1>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
