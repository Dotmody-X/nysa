'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:   'nb-press bg-[var(--accent-budget)] text-[var(--chocolate)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
  secondary: 'nb-press bg-[var(--bg-card)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
  ghost:     'bg-transparent text-[var(--ink)] border-2 border-transparent hover:bg-[rgba(var(--text-rgb),0.06)]',
  danger:    'nb-press bg-[var(--danger)] text-[var(--creamy-ivory)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[8px] gap-1.5',
  md: 'px-4 py-2   text-sm rounded-[10px] gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-[12px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
