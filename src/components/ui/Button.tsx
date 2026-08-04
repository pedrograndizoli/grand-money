import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-black active:bg-black',
  accent: 'bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-600',
  outline:
    'border border-current/25 text-current hover:border-current/50 hover:bg-current/5',
  ghost: 'text-current hover:bg-current/8',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-16 px-8 text-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'lg',
  full = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
        'transition-colors duration-150 select-none',
        'disabled:opacity-35 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
