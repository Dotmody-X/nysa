import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?: boolean
}

const paddingMap = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Card({ padding = 'md', hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-[var(--radius-lg)] border-2',
        paddingMap[padding],
        hover ? 'nb-press cursor-pointer' : '',
        className,
      ].join(' ')}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--elev-1)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}
