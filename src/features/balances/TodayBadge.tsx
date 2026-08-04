import { cn } from '../../lib/cn'

/** Ícone de calendário com o dia de hoje impresso — atalho para voltar ao mês atual. */
export function TodayBadge({
  day,
  onClick,
}: {
  day: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`ir para hoje, dia ${day}`}
      className="group relative shrink-0 pt-1.5"
    >
      <span
        aria-hidden
        className="absolute top-0 left-1.5 h-2 w-1 rounded-sm bg-ink-900"
      />
      <span
        aria-hidden
        className="absolute top-0 right-1.5 h-2 w-1 rounded-sm bg-ink-900"
      />
      <span
        className={cn(
          'relative grid size-9 place-items-center overflow-hidden rounded-md',
          'bg-ink-300/40 transition-colors group-hover:bg-ink-300/70',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-2.5 bg-accent-500"
        />
        <span className="num mt-2 text-sm leading-none font-bold">{day}</span>
      </span>
    </button>
  )
}
