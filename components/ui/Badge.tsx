import { HTMLAttributes } from 'react'

type BadgeVariant = 'fiery' | 'cyan' | 'teal' | 'wheat' | 'espresso' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

// Each variant → vivid accent fill. Cream text on DARK accents (cobalt),
// ink text on light accents (tangerine/sunny/turquoise).
const variantStyle: Record<BadgeVariant, { bg: string; text: string }> = {
  fiery:    { bg: 'var(--accent-budget)',   text: 'var(--chocolate)' },     // tangerine
  cyan:     { bg: 'var(--azul)',            text: 'var(--creamy-ivory)' },  // cobalt (dark)
  teal:     { bg: 'var(--accent-health)',   text: 'var(--chocolate)' },     // turquoise
  wheat:    { bg: 'var(--accent-courses)',  text: 'var(--chocolate)' },     // sunny
  espresso: { bg: 'var(--accent-rapports)', text: 'var(--creamy-ivory)' },  // violet (dark)
  default:  { bg: 'var(--accent-courses)',  text: 'var(--chocolate)' },     // sunny
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const { bg, text } = variantStyle[variant]
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-[8px] text-xs font-semibold',
        className,
      ].join(' ')}
      style={{
        background: bg,
        color: text,
        border: '2px solid var(--ink)',
      }}
      {...props}
    >
      {children}
    </span>
  )
}
