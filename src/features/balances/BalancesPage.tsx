import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { formatBRL } from '../../domain/money'
import { allocateMonth } from '../../domain/projection'
import type {
  Allocation,
  FixedStatus,
  FlexAllocation,
  MetaStatus,
} from '../../domain/projection'
import { useCategories } from '../../hooks/useCategories'
import { useEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useMonth } from '../../store/useMonth'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { cn } from '../../lib/cn'

export function BalancesPage() {
  const { month } = useMonth()
  const settings = useSettings()
  const categories = useCategories()
  const entries = useEntries()

  const today = useMemo(() => new Date(), [])

  const alloc = useMemo<Allocation | null>(() => {
    if (!settings.data) return null
    return allocateMonth({
      settings: settings.data,
      categories: categories.data ?? [],
      entries: entries.data ?? [],
      month,
      today,
    })
  }, [settings.data, categories.data, entries.data, month, today])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center border-b border-ink-300/70 px-4 py-3 lg:px-6">
        <MonthStepper />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!alloc ? null : (
          <>
            <Hero alloc={alloc} />

            {alloc.tetosAcimaDoDisponivel && (
              <div className="flex items-start gap-3 border-b border-ink-300/70 bg-negative/60 px-5 py-4 lg:px-8">
                <TriangleAlert
                  className="mt-0.5 size-5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
                <p className="text-base leading-snug lowercase">
                  seus tetos flexíveis somam mais do que sobrou. alguma categoria
                  vai ter que ceder.
                </p>
              </div>
            )}

            <Section title="o mês até aqui">
              <Line label="recebido" value={alloc.recebido} />
              <Line label="gasto livre" value={alloc.gastoLivre} negativo />
              <Line label="pago em contas fixas" value={alloc.pagoFixas} negativo />
              <Line label="guardado" value={alloc.guardado} negativo />
            </Section>

            <Section title="comprometido">
              <Line label="contas fixas a pagar" value={alloc.pendenteFixas} negativo />
              <Line label="ainda a guardar" value={alloc.reservaMeta} negativo />
              <Line label="livre" value={alloc.livre} forte />
            </Section>

            {alloc.fixas.length > 0 && (
              <Section title="contas fixas">
                {alloc.fixas.map((f) => (
                  <FixedRow key={f.categoryId} fixa={f} />
                ))}
              </Section>
            )}

            {alloc.flexiveis.length > 0 && (
              <Section title="tetos flexíveis">
                {alloc.flexiveis.map((f) => (
                  <FlexRow key={f.categoryId} flex={f} />
                ))}
              </Section>
            )}

            {alloc.metas.length > 0 && (
              <Section title="metas">
                {alloc.metas.map((m) => (
                  <MetaRow key={m.categoryId} meta={m} />
                ))}
              </Section>
            )}

            {categories.data?.length === 0 && (
              <p className="px-5 py-8 text-base leading-snug text-ink-600 lowercase lg:px-8">
                você ainda não tem categorias. sem elas, toda saída conta como
                gasto livre.
              </p>
            )}

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  )
}

function Hero({ alloc }: { alloc: Allocation }) {
  if (alloc.status === 'deficit') {
    return (
      <section className="border-b border-ink-300/70 bg-negative/50 px-5 py-7 lg:px-8">
        <p className="text-sm text-ink-600 lowercase">falta entrar</p>
        <p className="num mt-1 text-5xl font-bold tracking-tight">
          {formatBRL(alloc.falta)}
        </p>
        <p className="mt-3 text-base leading-snug text-ink-900/70 lowercase">
          seus compromissos do mês passam do que entrou até agora. ainda não há
          diário — assim que cair mais entrada, ele aparece.
        </p>
      </section>
    )
  }

  return (
    <section className="border-b border-ink-300/70 bg-positive/60 px-5 py-7 lg:px-8">
      <p className="text-sm text-ink-600 lowercase">seu diário</p>
      <p className="num mt-1 text-5xl font-bold tracking-tight">
        {formatBRL(alloc.diario)}
      </p>
      <p className="mt-2 text-base text-ink-600 lowercase">
        {formatBRL(alloc.livre)} livres para {alloc.diasRestantes}{' '}
        {alloc.diasRestantes === 1 ? 'dia' : 'dias'}
      </p>

      <p className="mt-4 border-t border-ink-900/10 pt-4 text-base lowercase">
        hoje você já gastou{' '}
        <span className="num font-medium">{formatBRL(alloc.gastoLivreHoje)}</span>
        {' · '}
        <span
          className={cn(
            'num font-medium',
            alloc.ritmoDoDia < 0 ? 'text-accent-600' : 'text-ink-900',
          )}
        >
          {alloc.ritmoDoDia < 0 ? 'passou de' : 'dentro do ritmo por'}{' '}
          {formatBRL(Math.abs(alloc.ritmoDoDia))}
        </span>
      </p>
    </section>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="px-5 pt-7 pb-2 text-sm text-ink-600 lowercase lg:px-8">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Line({
  label,
  value,
  negativo,
  forte,
}: {
  label: string
  value: number
  negativo?: boolean
  forte?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-300/50 px-5 py-3.5 lg:px-8">
      <span className="text-base lowercase">{label}</span>
      <span
        className={cn(
          'num text-base font-medium',
          forte && 'text-lg font-bold',
          value !== 0 && negativo && 'text-accent-600',
          value < 0 && 'text-accent-600',
        )}
      >
        {negativo && value > 0 ? '−' : ''}
        {formatBRL(value)}
      </span>
    </div>
  )
}

function FixedRow({ fixa }: { fixa: FixedStatus }) {
  const quitada = fixa.pendente === 0
  return (
    <div className="border-b border-ink-300/50 px-5 py-3.5 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-base font-medium lowercase">
          {fixa.nome}
          {fixa.diaVencimento && (
            <span className="ml-2 text-sm font-normal text-ink-600">
              vence dia {fixa.diaVencimento}
            </span>
          )}
        </span>
        <span
          className={cn(
            'num shrink-0 text-base font-medium',
            quitada ? 'text-income-600' : 'text-ink-900',
          )}
        >
          {quitada ? 'paga' : formatBRL(fixa.pendente)}
        </span>
      </div>
      {!quitada && fixa.pago > 0 && (
        <p className="num mt-1 text-sm text-ink-600">
          {formatBRL(fixa.pago)} de {formatBRL(fixa.previsto)}
        </p>
      )}
    </div>
  )
}

function FlexRow({ flex }: { flex: FlexAllocation }) {
  const estourou = flex.restante < 0
  const usado = flex.alocado > 0 ? Math.min(1, flex.gasto / flex.alocado) : 0

  return (
    <div className="border-b border-ink-300/50 px-5 py-3.5 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-base font-medium lowercase">
          {flex.nome}
        </span>
        <span
          className={cn(
            'num shrink-0 text-base font-medium',
            estourou && 'text-accent-600',
          )}
        >
          {estourou ? '−' : ''}
          {formatBRL(Math.abs(flex.restante))}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-300/40">
          <div
            className={cn(
              'h-full rounded-full',
              estourou ? 'bg-accent-600' : 'bg-accent-500',
            )}
            style={{ width: `${usado * 100}%` }}
          />
        </div>
        <span className="num shrink-0 text-xs text-ink-600">
          {formatBRL(flex.gasto)} / {formatBRL(flex.alocado)}
        </span>
      </div>
    </div>
  )
}

function MetaRow({ meta }: { meta: MetaStatus }) {
  return (
    <div className="border-b border-ink-300/50 px-5 py-3.5 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-base font-medium lowercase">
          {meta.nome}
        </span>
        <span className="num shrink-0 text-base font-medium">
          {formatBRL(meta.guardado)} / {formatBRL(meta.previsto)}
        </span>
      </div>
      {meta.metaTotal !== null && (
        <p className="num mt-1 text-sm text-ink-600">
          objetivo {formatBRL(meta.metaTotal)}
        </p>
      )}
    </div>
  )
}
