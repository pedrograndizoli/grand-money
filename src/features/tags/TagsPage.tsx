import { useMemo } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { Tag } from 'lucide-react'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { formatBRL } from '../../domain/money'
import { expandEntries } from '../../domain/projection'
import { useEntries } from '../../hooks/useEntries'
import { useMonth } from '../../store/useMonth'

export function TagsPage() {
  const { month } = useMonth()
  const { data: entries, isPending } = useEntries()

  const grupos = useMemo(() => {
    const occ = expandEntries(
      entries ?? [],
      startOfMonth(month),
      endOfMonth(month),
    ).filter((o) => o.tipo === 'saida')

    const soma = new Map<string, { total: number; qtd: number }>()
    for (const o of occ) {
      const chave = o.tags.length ? o.tags : ['sem tag']
      for (const tag of chave) {
        const atual = soma.get(tag) ?? { total: 0, qtd: 0 }
        atual.total += o.valor
        atual.qtd += 1
        soma.set(tag, atual)
      }
    }

    return [...soma.entries()]
      .map(([tag, v]) => ({ tag, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [entries, month])

  const maior = grupos[0]?.total ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
      <header className="flex shrink-0 items-center border-b border-ink-300/70 px-4 py-3 lg:px-6">
        <MonthStepper />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? null : grupos.length === 0 ? (
          <div className="px-5 py-16 text-center lg:px-8">
            <Tag
              className="mx-auto size-8 text-ink-300"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-4 text-base text-ink-600 lowercase">
              nenhuma saída neste mês ainda.
            </p>
          </div>
        ) : (
          grupos.map(({ tag, total, qtd }) => (
            <div
              key={tag}
              className="border-b border-ink-300/50 px-5 py-4 lg:px-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-base font-medium lowercase">
                  {tag}
                </span>
                <span className="num shrink-0 text-base font-medium">
                  {formatBRL(total)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-300/40">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${maior ? (total / maior) * 100 : 0}%` }}
                  />
                </div>
                <span className="num shrink-0 text-xs text-ink-600">
                  {qtd}×
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
