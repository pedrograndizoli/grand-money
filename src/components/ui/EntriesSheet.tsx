import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Wallet } from 'lucide-react'
import { Sheet } from './Sheet'
import { formatBRL } from '../../domain/money'
import { fromISO } from '../../domain/projection'
import type { Occurrence } from '../../domain/types'
import { recurrenceLabel } from '../../features/entry-form/recurrence'
import { cn } from '../../lib/cn'

interface EntriesSheetProps {
  open: boolean
  title: string
  occurrences: Occurrence[]
  /** mostra a data em cada linha — só faz sentido quando a lista cruza dias */
  comData?: boolean
  onClose: () => void
}

/** Lista de lançamentos que leva à edição de cada um. Serve o dia e o grupo. */
export function EntriesSheet({
  open,
  title,
  occurrences,
  comData = false,
  onClose,
}: EntriesSheetProps) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul>
        {occurrences.map((o, i) => {
          const entrada = o.tipo === 'entrada'
          const detalhe = [
            comData ? format(fromISO(o.data), 'dd/MM') : null,
            o.parcela
              ? `parcela ${o.parcela.atual} de ${o.parcela.total}`
              : o.recorrencia !== 'nenhuma'
                ? recurrenceLabel(o.recorrencia)
                : null,
          ]
            .filter(Boolean)
            .join(' · ')

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
                    o.tipo === 'saida' && 'bg-accent-600',
                    o.tipo === 'entrada' && 'bg-income-600',
                    o.tipo === 'guardado' && 'bg-badge',
                  )}
                  aria-hidden
                >
                  {o.tipo === 'saida' && (
                    <ArrowUpRight className="size-4" strokeWidth={3} />
                  )}
                  {o.tipo === 'entrada' && (
                    <ArrowDownLeft className="size-4" strokeWidth={3} />
                  )}
                  {o.tipo === 'guardado' && (
                    <Wallet className="size-4" strokeWidth={2.5} />
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
                    o.tipo === 'saida' && 'text-accent-600',
                    o.tipo === 'entrada' && 'text-income-600',
                    o.tipo === 'guardado' && 'text-badge',
                  )}
                >
                  {entrada ? '+' : '−'}
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
        {occurrences.length === 0
          ? 'nenhum lançamento aqui neste mês.'
          : 'toque num lançamento para editar ou apagar.'}
      </p>
    </Sheet>
  )
}
