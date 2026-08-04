import { cn } from '../../lib/cn'

interface ProgressDotsProps {
  total: number
  current: number
  className?: string
}

export function ProgressDots({ total, current, className }: ProgressDotsProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`passo ${current} de ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-2 rounded-full transition-colors duration-200',
            i + 1 === current ? 'bg-ink-900' : 'bg-ink-900/20',
          )}
        />
      ))}
    </div>
  )
}
