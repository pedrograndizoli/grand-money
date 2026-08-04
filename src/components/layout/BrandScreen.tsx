import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface BrandScreenProps {
  header?: ReactNode
  footer?: ReactNode
  /** encostado no rodapé, sem respiro lateral — o teclado numérico */
  keypad?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Fundo pink de ponta a ponta no celular; no desktop vira um cartão branco
 * centralizado sobre o mesmo pink.
 */
export function BrandScreen({
  header,
  footer,
  keypad,
  children,
  className,
}: BrandScreenProps) {
  return (
    <div className="bg-brand-500 lg:grid lg:min-h-svh lg:place-items-center lg:p-8">
      <div
        className={cn(
          'flex h-svh flex-col overflow-hidden',
          'lg:h-auto lg:w-full lg:max-w-lg lg:rounded-2xl lg:bg-white',
          'lg:shadow-2xl lg:shadow-black/20',
          className,
        )}
      >
        {header && <div className="shrink-0 px-6 pt-6 lg:px-10 lg:pt-10">{header}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-8 lg:px-10">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-ink-900/8 px-6 py-6 lg:border-0 lg:px-10 lg:pt-0 lg:pb-10">
            {footer}
          </div>
        )}

        {keypad}
      </div>
    </div>
  )
}
