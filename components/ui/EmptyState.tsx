import Link from 'next/link'
import { Plus } from 'lucide-react'
import { NysaLogo } from './NysaLogo'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[400px]">
      {/* Icon */}
      <div className="flex items-center justify-center">
        {icon || <NysaLogo size={48} color="var(--border)" />}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              <Plus size={16} />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              <Plus size={16} />
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
