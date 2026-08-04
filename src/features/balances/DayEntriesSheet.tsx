import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { formatBRL } from '../../domain/money'
import { fromISO } from '../../domain/projection'
import type { Occurrence } from '../../domain/types'
import { recurrenceLabel } from '../entry-form/recurrence'
import { cn } from '../../lib/cn'

interface DayEntriesSheetProps {
  /** YYYY-MM-DD do dia aberto, ou null quando fechado */
  date: string | null
  occurrences: Occurrence[]
  onClose: () => void
}

export function DayEntriesSheet({
  date,
  occurrences,
  onClose,
}: DayEntriesSheetProps) {
  const navigate = useNavigate()

  const titulo = date
    ? format(fromISO(date), "d 'de' MMMM", { locale: ptBR }).toLowerCase()
    : ''

  return (
    <Sheet open={date !== null} onClose={onClose} title={titulo}>
      <ul>
        {occurrences.map((o, i) => {
          const saida = o.tipo === 'saida'
          const detalhe = o.parcela
            ? `parcela ${o.parcela.atual} de ${o.parcela.total}`
            : o.recorrencia !== 'nenhuma'
              ? recurrenceLabel(o.recorrencia)
              : null

          return (
            <li key={`${o.entryId}-${i}`}>
              <button
                type="button"
                onClick={() => navigate(`/lancamento/${o.entryId}`)}
                className="flex w-full items-center gap-4 border-b border-ink-300/60 px-6 py-4 text-left transition-colors hover:bg-ink-900/4"
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-white',
                    saida ? 'bg-accent-600' : 'bg-income-600',
                  )}
                  aria-hidden
                >
                  {saida ? (
                    <ArrowUpRight className="size-4" strokeWidth={3} />
                  ) : (
                    <ArrowDownLeft className="size-4" strokeWidth={3} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium lowercase">
                    {o.descricao || 'sem descrição'}
                  </span>
                  {(detalhe || o.tags.length > 0) && (
                    <span className="mt-0.5 block truncate text-sm text-ink-600 lowercase">
                      {[detalhe, ...o.tags].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>

                <span
                  className={cn(
                    'num shrink-0 text-base font-medium',
                    saida ? 'text-accent-600' : 'text-income-600',
                  )}
                >
                  {saida ? '−' : '+'}
                  {formatBRL(o.valor)}
                </span>

                <ChevronRight
                  className="size-5 shrink-0 text-ink-300"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>

      <p className="px-6 py-5 text-sm text-ink-600 lowercase">
        toque num lançamento para editar ou apagar.
      </p>
    </Sheet>
  )
}
