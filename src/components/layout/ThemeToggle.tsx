import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../store/useTheme'
import { cn } from '../../lib/cn'

/** A View Transitions API ainda não está na lib do TS. */
interface ViewTransition {
  ready: Promise<void>
}
type ComTransicao = Document & {
  startViewTransition?: (cb: () => void) => ViewTransition
}

const DURACAO = 520

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  function trocar(e: React.MouseEvent<HTMLButtonElement>) {
    const doc = document as ComTransicao
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // sem suporte (firefox) ou com movimento reduzido: troca seca, sem círculo
    if (!doc.startViewTransition || reduzido) {
      toggle()
      return
    }

    // o círculo nasce no botão e cresce até cobrir o canto mais distante
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const raio = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    // flushSync para o ícone já estar trocado no retrato que a API tira
    const transicao = doc.startViewTransition(() => {
      flushSync(() => {
        toggle()
      })
    })

    void transicao.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${raio}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: DURACAO,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
  }

  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={dark ? 'usar tema claro' : 'usar tema escuro'}
      aria-pressed={dark}
      className={cn(
        'grid size-10 place-items-center rounded-full text-ink-600',
        'transition-colors hover:bg-ink-900/8 hover:text-ink-900',
        className,
      )}
    >
      {dark ? (
        <Sun className="size-5" strokeWidth={2} />
      ) : (
        <Moon className="size-5" strokeWidth={2} />
      )}
    </button>
  )
}
