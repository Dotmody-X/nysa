import { HTMLAttributes } from 'react'

type BadgeVariant = 'fiery' | 'cyan' | 'teal' | 'wheat' | 'espresso' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

// Each variant → vivid accent fill. Cream text on DARK accents (cobalt),
// ink text on light accents (tangerine/sunny/turquoise).
const variantStyle: Record<BadgeVariant, { bg: string; text: string }> = {
  fiery:    { bg: 'var(--accent-brand)',   text: 'var(--on-accent)' },     // tangerine
  cyan:     { bg: 'var(--azul)',            text: 'var(--ink-light)' },  // cobalt (dark)
  teal:     { bg: 'var(--accent-health)',   text: 'var(--on-accent)' },     // turquoise
  wheat:    { bg: 'var(--accent-courses)',  text: 'var(--on-accent)' },     // sunny
  espresso: { bg: 'var(--accent-rapports)', text: 'var(--ink-light)' },  // violet (dark)
  default:  { bg: 'var(--accent-courses)',  text: 'var(--on-accent)' },     // sunny
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
