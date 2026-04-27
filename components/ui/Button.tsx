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
  primary:   'bg-[#F2542D] text-[#F5DFBB] hover:bg-[#d94420] border border-transparent',
  secondary: 'bg-transparent text-[#F5DFBB] border border-[rgba(245,223,187,0.2)] hover:border-[rgba(245,223,187,0.4)] hover:bg-[rgba(245,223,187,0.05)]',
  ghost:     'bg-transparent text-[rgba(245,223,187,0.6)] border border-transparent hover:text-[#F5DFBB] hover:bg-[rgba(245,223,187,0.06)]',
  danger:    'bg-transparent text-[#F2542D] border border-[rgba(242,84,45,0.3)] hover:bg-[rgba(242,84,45,0.1)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[6px] gap-1.5',
  md: 'px-4 py-2   text-sm rounded-[8px] gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-[10px] gap-2',
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
