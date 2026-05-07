import { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface PageEmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
}

export function PageEmpty({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
}: PageEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[400px]">
      {/* Icon */}
      <div className="flex items-center justify-center text-5xl">
        {icon || '📭'}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && (
        <div className="mt-4">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent-budget)', color: 'var(--creamy-ivory)' }}
            >
              <Plus size={16} />
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={actionOnClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent-budget)', color: 'var(--creamy-ivory)' }}
            >
              <Plus size={16} />
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
