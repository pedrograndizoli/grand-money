import { useEffect, useRef, useState } from 'react'
import { formatCents, parseBRL } from '../../domain/money'
import { useIsTouch } from '../../hooks/useIsTouch'
import { cn } from '../../lib/cn'
import type { Cents } from '../../domain/types'

type Tone = 'light' | 'dark'
type Size = 'lg' | 'xl'

const sizes: Record<Size, { text: string; prefix: string }> = {
  lg: { text: 'text-3xl', prefix: 'text-3xl' },
  xl: { text: 'text-5xl', prefix: 'text-5xl' },
}

interface MoneyInputProps {
  value: Cents
  onChange: (cents: Cents) => void
  label: string
  tone?: Tone
  size?: Size
  underline?: boolean
  autoFocus?: boolean
}

/**
 * No touch o valor é só texto: quem digita é o `NumericKeypad`, então não
 * existe input real para o teclado do sistema subir por cima da tela.
 * No desktop é um input de verdade, com máscara de centavos.
 */
export function MoneyInput({
  value,
  onChange,
  label,
  tone = 'light',
  size = 'xl',
  underline = false,
  autoFocus = false,
}: MoneyInputProps) {
  const isTouch = useIsTouch()
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(autoFocus)

  useEffect(() => {
    if (autoFocus && !isTouch) input.current?.focus()
  }, [autoFocus, isTouch])

  const dark = tone === 'dark'
  const empty = value === 0
  const s = sizes[size]

  const prefix = cn(
    'font-bold shrink-0 tracking-tight',
    s.prefix,
    dark ? 'text-white' : 'text-ink-900',
  )
  const placeholder = dark ? 'text-white/25' : 'text-ink-900/30'
  const filled = dark ? 'text-white' : 'text-ink-900'

  const caret = (
    <span
      aria-hidden
      className={cn(
        'inline-block w-px self-stretch animate-caret',
        dark ? 'bg-white' : 'bg-ink-900',
      )}
    />
  )

  return (
    <div
      className={cn(
        'flex items-stretch gap-3 py-2',
        underline && (dark ? 'border-b border-line-dark' : 'border-b border-ink-900/15'),
      )}
    >
      <span className={prefix}>R$</span>

      {isTouch ? (
        <div
          role="textbox"
          aria-readonly="true"
          aria-label={label}
          tabIndex={0}
          className={cn(
            'num flex min-w-0 flex-1 items-center gap-px font-semibold tracking-tight',
            s.text,
          )}
        >
          {empty ? (
            <>
              {caret}
              <span className={placeholder}>0,00</span>
            </>
          ) : (
            <>
              <span className={cn('truncate', filled)}>
                {formatCents(value)}
              </span>
              {caret}
            </>
          )}
        </div>
      ) : (
        <input
          ref={input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          value={empty ? '' : formatCents(value)}
          placeholder="0,00"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(parseBRL(e.target.value))}
          className={cn(
            'num min-w-0 flex-1 bg-transparent font-semibold tracking-tight outline-none',
            s.text,
            filled,
            dark ? 'placeholder:text-white/25' : 'placeholder:text-ink-900/30',
            focused && 'caret-current',
          )}
        />
      )}
    </div>
  )
}
