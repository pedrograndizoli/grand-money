import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  tone?: 'light' | 'dark'
  children: ReactNode
}

export function Sheet({
  open,
  onClose,
  title,
  tone = 'light',
  children,
}: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const dark = tone === 'dark'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="fechar"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/45 lg:bg-black/55"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[85svh] w-full flex-col overflow-hidden outline-none',
          'animate-sheet-up rounded-t-2xl',
          'lg:max-w-md lg:animate-pop-in lg:rounded-2xl',
          dark
            ? 'bg-surface-dark text-white'
            : 'bg-surface-2 text-ink-900 shadow-2xl shadow-black/10',
        )}
      >
        <header
          className={cn(
            'flex shrink-0 items-center justify-between gap-4 px-6 py-5',
            dark ? 'border-b border-line-dark' : 'border-b border-ink-300/60',
          )}
        >
          <h2 className="text-2xl font-semibold lowercase">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="fechar"
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
              dark ? 'hover:bg-white/10' : 'hover:bg-ink-900/8',
            )}
          >
            <X className="size-6" strokeWidth={2.25} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface SheetOptionProps {
  title: string
  description?: string
  selected?: boolean
  tone?: 'light' | 'dark'
  onClick: () => void
}

/** Linha de opção de um sheet: título forte + descrição, como no seletor de repetição. */
export function SheetOption({
  title,
  description,
  selected = false,
  tone = 'light',
  onClick,
}: SheetOptionProps) {
  const dark = tone === 'dark'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      className={cn(
        'flex w-full flex-col items-start gap-0.5 px-6 py-4 text-left transition-colors',
        dark
          ? 'border-b border-line-dark hover:bg-white/5'
          : 'border-b border-ink-300/60 hover:bg-ink-900/4',
        'last:border-b-0',
      )}
    >
      <span
        className={cn(
          'text-lg font-semibold lowercase',
          selected && (dark ? 'text-accent-500' : 'text-accent-600'),
        )}
      >
        {title}
      </span>
      {description && (
        <span className={cn('text-sm', dark ? 'text-white/45' : 'text-ink-600')}>
          {description}
        </span>
      )}
    </button>
  )
}
