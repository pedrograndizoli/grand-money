import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL, formatCents } from '../../domain/money'
import { fromISO, projectMonth } from '../../domain/projection'
import type { Allocation, DayProjection, MonthProjection } from '../../domain/projection'
import { useCategories } from '../../hooks/useCategories'
import { useCards } from '../../hooks/useCards'
import { useEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useMonth } from '../../store/useMonth'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { cn } from '../../lib/cn'
import { EntriesSheet } from '../../components/ui/EntriesSheet'
import { LegendButton } from './LegendButton'
import { TodayBadge } from './TodayBadge'

/** dia · lançamentos · diário · saldo — as quatro colunas ficam alinhadas linha a linha */
const GRID =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_6rem_7rem] lg:grid-cols-[4rem_minmax(0,1fr)_9rem_10rem]'

export function BalancesPage() {
  const { month, goToToday } = useMonth()
  const settings = useSettings()
  const categories = useCategories()
  const cards = useCards()
  const entries = useEntries()

  const today = useMemo(() => new Date(), [])
  const [diaAberto, setDiaAberto] = useState<string | null>(null)

  const proj = useMemo<MonthProjection | null>(() => {
    if (!settings.data) return null
    return projectMonth({
      settings: settings.data,
      categories: categories.data ?? [],
      cards: cards.data ?? [],
      entries: entries.data ?? [],
      month,
      today,
    })
  }, [settings.data, categories.data, cards.data, entries.data, month, today])

  const scroller = useRef<HTMLDivElement>(null)
  const linhaDeHoje = useRef<HTMLDivElement>(null)
  const pronto = proj !== null

  // abrir no dia de hoje; nos outros meses, começar do dia 1
  useEffect(() => {
    if (linhaDeHoje.current) linhaDeHoje.current.scrollIntoView({ block: 'center' })
    else scroller.current?.scrollTo({ top: 0 })
  }, [month, pronto])

  const doDiaAberto =
    proj?.dias.find((d) => d.data === diaAberto)?.occurrences ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-ink-300/70 px-3 py-3 pr-14 lg:px-6 lg:pr-16">
        <TodayBadge day={today.getDate()} onClick={goToToday} />
        <MonthStepper />
        <LegendButton />
      </header>

      {proj && <Resumo alloc={proj.alloc} />}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {proj && (
          <>
            <div
              className={cn(
                GRID,
                'sticky top-0 z-10 border-b border-ink-300/70 bg-surface text-xs text-ink-600 lowercase',
              )}
            >
              <span className="py-2 text-center">dia</span>
              <span className="py-2 pl-2">lançamentos</span>
              <span className="py-2 pr-1 text-right">diário</span>
              <span className="py-2 pr-3 text-right">saldo</span>
            </div>

            {proj.dias.map((d) => (
              <DayRow
                key={d.data}
                dia={d}
                ref={d.isToday ? linhaDeHoje : undefined}
                onOpen={() => setDiaAberto(d.data)}
              />
            ))}

            <div className="h-6" />
          </>
        )}
      </div>

      <EntriesSheet
        open={diaAberto !== null}
        title={
          diaAberto
            ? format(fromISO(diaAberto), "d 'de' MMMM", { locale: ptBR }).toLowerCase()
            : ''
        }
        occurrences={doDiaAberto}
        onClose={() => setDiaAberto(null)}
      />
    </div>
  )
}

/** O cabeçalho da tabela: de onde saem os números de cada linha. */
function Resumo({ alloc }: { alloc: Allocation }) {
  if (alloc.diasRestantes === 0) {
    return (
      <p className="shrink-0 border-b border-ink-300/70 px-4 py-3 text-sm text-ink-600 lowercase lg:px-6">
        mês encerrado · recebido{' '}
        <span className="num">{formatBRL(alloc.recebido)}</span> · gasto livre{' '}
        <span className="num">{formatBRL(alloc.gastoLivre)}</span>
      </p>
    )
  }

  if (alloc.status === 'deficit') {
    return (
      <p className="shrink-0 border-b border-ink-300/70 bg-negative/50 px-4 py-3 text-sm lowercase lg:px-6">
        falta entrar{' '}
        <span className="num font-bold">{formatBRL(alloc.falta)}</span> — sem
        diário enquanto os compromissos passam do que entrou
      </p>
    )
  }

  return (
    <p className="shrink-0 border-b border-ink-300/70 px-4 py-3 text-sm text-ink-600 lowercase lg:px-6">
      diário de{' '}
      <span className="num font-bold text-ink-900">{formatBRL(alloc.diario)}</span> ·{' '}
      <span className="num">{formatBRL(alloc.livre)}</span> livres para{' '}
      {alloc.diasRestantes} {alloc.diasRestantes === 1 ? 'dia' : 'dias'}
    </p>
  )
}

function DayRow({
  dia,
  ref,
  onOpen,
}: {
  dia: DayProjection
  ref?: React.Ref<HTMLDivElement>
  onOpen: () => void
}) {
  const temLancamento = dia.occurrences.length > 0

  const celulas = (
    <>
      <span className="flex items-center justify-center py-3">
        <span
          className={cn(
            'num grid size-7 place-items-center rounded-md text-sm',
            dia.isToday && 'bg-solid font-bold text-on-solid',
            !dia.isToday && dia.passado && 'text-ink-600',
          )}
        >
          {dia.dia}
        </span>
      </span>

      <span className="flex min-w-0 flex-col justify-center gap-0.5 py-2 pl-2 text-xs">
        {dia.entradas > 0 && (
          <span className="num truncate text-income-600">
            +{formatCents(dia.entradas)}
          </span>
        )}
        {dia.saidas > 0 && (
          <span className="num truncate text-accent-600">
            −{formatCents(dia.saidas)}
          </span>
        )}
        {dia.guardado > 0 && (
          <span className="num truncate text-badge">
            −{formatCents(dia.guardado)}
          </span>
        )}
      </span>

      <span className="flex items-center justify-end gap-1.5 py-3 pr-1">
        {dia.diario > 0 ? (
          <>
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full bg-badge text-[9px] leading-none font-bold text-white"
            >
              D
            </span>
            <span className="num text-[13px]">{formatBRL(dia.diario)}</span>
          </>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </span>

      <span
        className={cn(
          'flex items-center justify-end py-3 pr-3',
          dia.saldo !== null && (dia.saldo < 0 ? 'bg-negative' : 'bg-positive'),
        )}
      >
        {dia.saldo === null ? (
          <span className="text-ink-300">—</span>
        ) : (
          <span className="num text-[13px] font-medium">
            {formatBRL(dia.saldo)}
          </span>
        )}
      </span>
    </>
  )

  if (!temLancamento) {
    return (
      <div ref={ref} className={cn(GRID, 'border-b border-ink-300/50')}>
        {celulas}
      </div>
    )
  }

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`lançamentos do dia ${dia.dia}`}
        className={cn(
          GRID,
          'w-full border-b border-ink-300/50 text-left transition-colors hover:bg-ink-900/4',
        )}
      >
        {celulas}
      </button>
    </div>
  )
}
