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
        'rounded-[10px] border',
        paddingMap[padding],
        hover ? 'transition-colors duration-150 cursor-pointer hover:bg-[#1E1E1E]' : '',
        className,
      ].join(' ')}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      {...props}
    >
      {children}
    </div>
  )
}
