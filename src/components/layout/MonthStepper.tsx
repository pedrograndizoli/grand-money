import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '../../store/useMonth'
import { monthLabel } from '../../lib/date'

export function MonthStepper() {
  const { month, next, prev } = useMonth()

  return (
    <div className="flex flex-1 items-center justify-center gap-1">
      <Step label="mês anterior" onClick={prev}>
        <ChevronLeft className="size-6" strokeWidth={2.5} />
      </Step>
      <h1 className="min-w-[6.5rem] text-center text-2xl font-bold tracking-tight lowercase">
        {monthLabel(month)}
      </h1>
      <Step label="próximo mês" onClick={next}>
        <ChevronRight className="size-6" strokeWidth={2.5} />
      </Step>
    </div>
  )
}

function Step({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full text-ink-900 transition-colors hover:bg-ink-900/8"
    >
      {children}
    </button>
  )
}
