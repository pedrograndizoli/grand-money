import { useMemo } from 'react'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { formatBRL } from '../../domain/money'
import { allocateMonth } from '../../domain/projection'
import { useCategories } from '../../hooks/useCategories'
import { useCards } from '../../hooks/useCards'
import { useEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useMonth } from '../../store/useMonth'
import { cn } from '../../lib/cn'

export function TotalsPage() {
  const { month } = useMonth()
  const { data: settings } = useSettings()
  const { data: categories } = useCategories()
  const { data: cards } = useCards()
  const { data: entries } = useEntries()

  const alloc = useMemo(() => {
    if (!settings) return null
    return allocateMonth({
      settings,
      categories: categories ?? [],
      cards: cards ?? [],
      entries: entries ?? [],
      month,
      today: new Date(),
    })
  }, [settings, categories, cards, entries, month])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center border-b border-ink-300/70 px-4 py-3 lg:px-6">
        <MonthStepper />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!alloc ? null : (
          <>
            <section className="border-b border-ink-300/70 px-5 py-7 lg:px-8">
              <p className="text-sm text-ink-600 lowercase">
                {alloc.status === 'deficit' ? 'falta entrar' : 'livre no mês'}
              </p>
              <p
                className={cn(
                  'num mt-1 text-5xl font-bold tracking-tight',
                  alloc.status === 'deficit' && 'text-accent-600',
                )}
              >
                {formatBRL(
                  alloc.status === 'deficit' ? alloc.falta : alloc.livre,
                )}
              </p>
            </section>

            <Line label="saldo de partida" value={settings!.saldoInicial} />
            <Line label="recebido até hoje" value={alloc.recebido} positivo />
            <Line label="gasto livre" value={alloc.gastoLivre} negativo />
            <Line label="pago em contas fixas" value={alloc.pagoFixas} negativo />
            <Line label="guardado em metas" value={alloc.guardado} negativo />
            <Line
              label="contas fixas a pagar"
              value={alloc.pendenteFixas}
              negativo
            />
            <Line label="ainda a guardar" value={alloc.reservaMeta} negativo />

            <h2 className="px-5 pt-8 pb-2 text-sm text-ink-600 lowercase lg:px-8">
              por categoria
            </h2>
            {alloc.fixas.map((f) => (
              <Line
                key={f.categoryId}
                label={`${f.nome} · fixa`}
                value={f.pago}
                raw={`${formatBRL(f.pago)} / ${formatBRL(f.previsto)}`}
              />
            ))}
            {alloc.flexiveis.map((f) => (
              <Line
                key={f.categoryId}
                label={`${f.nome} · teto`}
                value={f.gasto}
                raw={`${formatBRL(f.gasto)} / ${formatBRL(f.alocado)}`}
              />
            ))}
            {alloc.metas.map((m) => (
              <Line
                key={m.categoryId}
                label={`${m.nome} · meta`}
                value={m.guardado}
                raw={`${formatBRL(m.guardado)} / ${formatBRL(m.previsto)}`}
              />
            ))}

            {alloc.cartoes.length > 0 && (
              <>
                <h2 className="px-5 pt-8 pb-2 text-sm text-ink-600 lowercase lg:px-8">
                  por cartão
                </h2>
                {alloc.cartoes.map((c) => (
                  <Line
                    key={c.cardId}
                    label={c.nome}
                    value={c.gasto}
                    raw={
                      c.limite > 0
                        ? `${formatBRL(c.gasto)} / ${formatBRL(c.limite)}`
                        : formatBRL(c.gasto)
                    }
                  />
                ))}
              </>
            )}

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  raw,
  positivo,
  negativo,
}: {
  label: string
  value: number
  raw?: string
  positivo?: boolean
  negativo?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-300/50 px-5 py-4 lg:px-8">
      <span className="text-base lowercase">{label}</span>
      <span
        className={cn(
          'num text-base font-medium',
          positivo && value > 0 && 'text-income-600',
          negativo && value > 0 && 'text-accent-600',
        )}
      >
        {raw ?? formatBRL(value)}
      </span>
    </div>
  )
}
