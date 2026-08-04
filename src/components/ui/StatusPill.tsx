import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StatusTone = 'paga' | 'aberta' | 'atrasada' | 'neutra' | 'meta'

const TONES: Record<StatusTone, string> = {
  paga: 'bg-income-100 text-income-600',
  aberta: 'bg-accent-100 text-accent-600',
  // atrasada é a única sólida: precisa saltar da lista sem depender de leitura
  atrasada: 'bg-accent-600 text-white',
  neutra: 'bg-ink-100 text-ink-600',
  meta: 'bg-badge-100 text-badge',
}

/** Selo curto de estado — o mesmo vocabulário de cor em todas as telas. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5',
        'text-xs font-semibold lowercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
