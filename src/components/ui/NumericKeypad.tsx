import { Delete } from 'lucide-react'
import { cn } from '../../lib/cn'

const KEYS: Array<{ digit: number; letters?: string }> = [
  { digit: 1 },
  { digit: 2, letters: 'ABC' },
  { digit: 3, letters: 'DEF' },
  { digit: 4, letters: 'GHI' },
  { digit: 5, letters: 'JKL' },
  { digit: 6, letters: 'MNO' },
  { digit: 7, letters: 'PQRS' },
  { digit: 8, letters: 'TUV' },
  { digit: 9, letters: 'WXYZ' },
]

interface NumericKeypadProps {
  onDigit: (digit: number) => void
  onBackspace: () => void
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Só aparece em touch. No desktop o input recebe foco e usa o teclado do SO,
 * então esconder aqui evita duas formas de digitar a mesma coisa.
 */
export function NumericKeypad({
  onDigit,
  onBackspace,
  tone = 'light',
  className,
}: NumericKeypadProps) {
  const dark = tone === 'dark'

  const key = cn(
    'flex h-14 flex-col items-center justify-center rounded-lg select-none',
    'transition-colors duration-75',
    dark
      ? 'bg-white/12 text-white active:bg-white/22'
      : 'bg-brand-100 text-ink-900 active:bg-white',
  )

  return (
    <div
      className={cn(
        'fine:hidden shrink-0 rounded-t-2xl px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        dark ? 'bg-white/4' : 'bg-brand-300/55',
        className,
      )}
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {KEYS.map(({ digit, letters }) => (
          <button
            key={digit}
            type="button"
            aria-label={String(digit)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onDigit(digit)}
            className={key}
          >
            <span className="num text-2xl leading-none font-medium">
              {digit}
            </span>
            <span
              className={cn(
                'mt-0.5 text-[9px] leading-none font-bold tracking-[0.12em]',
                dark ? 'text-white/45' : 'text-ink-600',
                !letters && 'invisible',
              )}
            >
              {letters ?? 'ABC'}
            </span>
          </button>
        ))}

        <span aria-hidden />

        <button
          type="button"
          aria-label="zero"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onDigit(0)}
          className={key}
        >
          <span className="num text-2xl leading-none font-medium">0</span>
          <span className="mt-0.5 h-[9px]" />
        </button>

        <button
          type="button"
          aria-label="apagar"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onBackspace}
          className={cn(
            'flex h-14 items-center justify-center rounded-lg transition-colors duration-75',
            dark ? 'text-white active:bg-white/12' : 'text-ink-900 active:bg-brand-100',
          )}
        >
          <Delete className="size-7" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
