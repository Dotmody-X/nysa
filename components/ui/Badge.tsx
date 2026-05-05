import { HTMLAttributes } from 'react'

type BadgeVariant = 'fiery' | 'cyan' | 'teal' | 'wheat' | 'espresso' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantMap: Record<BadgeVariant, string> = {
  fiery:    'tag-fiery',
  cyan:     'tag-cyan',
  teal:     'tag-teal',
  wheat:    'tag-wheat',
  espresso: 'tag-espresso',
  default:  'tag-wheat',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-medium',
        variantMap[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}
