import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface FieldProps {
  icon: ReactNode
  label: string
  /** valor à direita; a linha de data usa label + valor ao mesmo tempo */
  value?: ReactNode
  /** label renderizado como placeholder, quando ainda não há valor */
  muted?: boolean
  chevron?: boolean
  tone?: 'light' | 'dark'
  onClick?: () => void
  children?: ReactNode
}

export function Field({
  icon,
  label,
  value,
  muted = false,
  chevron = false,
  tone = 'light',
  onClick,
  children,
}: FieldProps) {
  const dark = tone === 'dark'
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex w-full items-center gap-4 px-5 py-5 text-left',
        dark ? 'border-b border-line-dark' : 'border-b border-ink-300/60',
        onClick && (dark ? 'hover:bg-white/4' : 'hover:bg-ink-900/3'),
        'transition-colors',
      )}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center',
          muted ? (dark ? 'text-white/35' : 'text-ink-600') : 'text-current',
        )}
      >
        {icon}
      </span>

      {children ?? (
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-lg lowercase',
            muted
              ? dark
                ? 'text-white/35'
                : 'text-ink-600'
              : 'font-medium text-current',
          )}
        >
          {label}
        </span>
      )}

      {value !== undefined && (
        <span
          className={cn(
            'num shrink-0 text-lg',
            dark ? 'text-white/60' : 'text-ink-600',
          )}
        >
          {value}
        </span>
      )}

      {chevron && (
        <ChevronDown
          className={cn(
            'size-5 shrink-0',
            dark ? 'text-white/35' : 'text-ink-600',
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      )}
    </Tag>
  )
}
