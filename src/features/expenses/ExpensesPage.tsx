import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { endOfMonth, isSameMonth, startOfMonth } from 'date-fns'
import { Check, Receipt } from 'lucide-react'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { StatusPill } from '../../components/ui/StatusPill'
import { formatBRL } from '../../domain/money'
import { allocateMonth, expandEntries, toISO } from '../../domain/projection'
import type { FixedStatus } from '../../domain/projection'
import type { Occurrence } from '../../domain/types'
import { useCards } from '../../hooks/useCards'
import { useCategories } from '../../hooks/useCategories'
import { useEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { useMonth } from '../../store/useMonth'
import { recurrenceLabel } from '../entry-form/recurrence'
import { cn } from '../../lib/cn'

/**
 * Os gastos do mês, separados entre o que já saiu e o que ainda falta sair.
 *
 * Nada disso é status gravado: "pago" é o lançamento existir com data até hoje,
 * e "a pagar" são as contas fixas cujo previsto ainda não foi coberto por
 * lançamento, mais as saídas marcadas para os próximos dias do mês.
 */
export function ExpensesPage() {
  const { month } = useMonth()
  const navigate = useNavigate()
  const settings = useSettings()
  const categories = useCategories()
  const cards = useCards()
  const entries = useEntries()

  const today = useMemo(() => new Date(), [])

  const dados = useMemo(() => {
    if (!settings.data) return null

    const alloc = allocateMonth({
      settings: settings.data,
      categories: categories.data ?? [],
      cards: cards.data ?? [],
      entries: entries.data ?? [],
      month,
      today,
    })

    const hoje = toISO(today)
    const saidas = expandEntries(
      entries.data ?? [],
      startOfMonth(month),
      endOfMonth(month),
    ).filter((o) => o.tipo === 'saida')

    const pagos = saidas
      .filter((o) => o.data <= hoje)
      .sort((a, b) => b.data.localeCompare(a.data))
    const agendados = saidas
      .filter((o) => o.data > hoje)
      .sort((a, b) => a.data.localeCompare(b.data))

    // conta fixa sem lançamento que a cubra ainda é uma conta a pagar
    const pendentes = alloc.fixas
      .filter((f) => f.pendente > 0)
      .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99))

    const soma = (occ: Occurrence[]) => occ.reduce((s, o) => s + o.valor, 0)
    const totalPago = soma(pagos)
    const totalAPagar = soma(agendados) + alloc.pendenteFixas

    return { pagos, agendados, pendentes, totalPago, totalAPagar }
  }, [settings.data, categories.data, cards.data, entries.data, month, today])

  const nomeDaCategoria = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.nome])),
    [categories.data],
  )
  const nomeDoCartao = useMemo(
    () => new Map((cards.data ?? []).map((c) => [c.id, c.nome])),
    [cards.data],
  )

  // atrasada só faz sentido olhando o calendário: em mês futuro nada atrasou
  const mesPassado = startOfMonth(month) < startOfMonth(today)
  const mesCorrente = isSameMonth(month, today)
  const atrasada = (dia: number | null) =>
    mesPassado || (mesCorrente && dia !== null && dia < today.getDate())

  const vazio =
    dados !== null &&
    dados.pagos.length === 0 &&
    dados.agendados.length === 0 &&
    dados.pendentes.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
      <header className="flex shrink-0 items-center border-b border-ink-300/70 px-4 py-3 lg:px-6">
        <MonthStepper />
      </header>

      {dados && (
        <div className="flex shrink-0 gap-6 border-b border-ink-300/70 px-5 py-3 lg:px-8">
          <p className="text-sm text-ink-600 lowercase">
            pago{' '}
            <span className="num font-bold text-ink-900">
              {formatBRL(dados.totalPago)}
            </span>
          </p>
          <p className="text-sm text-ink-600 lowercase">
            a pagar{' '}
            <span
              className={cn(
                'num font-bold',
                dados.totalAPagar > 0 ? 'text-accent-600' : 'text-ink-900',
              )}
            >
              {formatBRL(dados.totalAPagar)}
            </span>
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {vazio && (
          <div className="px-5 py-16 text-center lg:px-8">
            <Receipt
              className="mx-auto size-8 text-ink-300"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-4 text-base text-ink-600 lowercase">
              nenhum gasto neste mês ainda.
            </p>
          </div>
        )}

        {dados && (dados.pendentes.length > 0 || dados.agendados.length > 0) && (
          <>
            <SectionTitle
              title="a pagar"
              total={dados.totalAPagar}
              destaque
            />

            {dados.pendentes.map((f) => (
              <FixedPendingRow
                key={f.categoryId}
                fixa={f}
                atrasada={atrasada(f.diaVencimento)}
              />
            ))}

            {dados.agendados.map((o, i) => (
              <OccurrenceRow
                key={`${o.entryId}-${o.data}-${i}`}
                occ={o}
                categoria={o.categoryId ? nomeDaCategoria.get(o.categoryId) : undefined}
                cartao={o.cardId ? nomeDoCartao.get(o.cardId) : undefined}
                agendado
                onClick={() => navigate(`/lancamento/${o.entryId}`)}
              />
            ))}
          </>
        )}

        {dados && dados.pagos.length > 0 && (
          <>
            <SectionTitle title="pago" total={dados.totalPago} />
            {dados.pagos.map((o, i) => (
              <OccurrenceRow
                key={`${o.entryId}-${o.data}-${i}`}
                occ={o}
                categoria={o.categoryId ? nomeDaCategoria.get(o.categoryId) : undefined}
                cartao={o.cardId ? nomeDoCartao.get(o.cardId) : undefined}
                onClick={() => navigate(`/lancamento/${o.entryId}`)}
              />
            ))}
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}

function SectionTitle({
  title,
  total,
  destaque,
}: {
  title: string
  total: number
  destaque?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 pt-7 pb-2 lg:px-8">
      <h2 className="text-sm text-ink-600 lowercase">{title}</h2>
      <span
        className={cn(
          'num text-sm font-medium',
          destaque ? 'text-accent-600' : 'text-ink-600',
        )}
      >
        {formatBRL(total)}
      </span>
    </div>
  )
}

/** Conta fixa cujo previsto ainda não foi coberto por lançamento no mês. */
function FixedPendingRow({
  fixa,
  atrasada,
}: {
  fixa: FixedStatus
  atrasada: boolean
}) {
  const parcial = fixa.pago > 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-ink-300/50 py-3.5',
        'border-l-4 pr-5 pl-4 lg:pr-8 lg:pl-7',
        atrasada ? 'border-l-accent-600 bg-accent-100/40' : 'border-l-accent-500',
      )}
    >
      <span className="num w-9 shrink-0 text-sm text-ink-600">
        {fixa.diaVencimento ?? '—'}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-medium lowercase">
            {fixa.nome}
          </span>
          {atrasada ? (
            <StatusPill tone="atrasada">atrasada</StatusPill>
          ) : (
            <StatusPill tone="aberta">
              {fixa.estimado ? 'estimada' : 'a pagar'}
            </StatusPill>
          )}
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate text-sm lowercase',
            atrasada ? 'text-accent-600' : 'text-ink-600',
          )}
        >
          {fixa.diaVencimento === null
            ? 'conta fixa sem vencimento'
            : atrasada
              ? `venceu dia ${fixa.diaVencimento}`
              : `vence dia ${fixa.diaVencimento}`}
          {fixa.estimado && ' · valor varia'}
          {parcial &&
            ` · ${formatBRL(fixa.pago)} de ${formatBRL(fixa.previsto)} pagos`}
        </span>
      </span>

      <span className="num shrink-0 text-base font-medium text-accent-600">
        {fixa.estimado && '≈ '}
        {formatBRL(fixa.pendente)}
      </span>
    </div>
  )
}

function OccurrenceRow({
  occ,
  categoria,
  cartao,
  agendado,
  onClick,
}: {
  occ: Occurrence
  categoria?: string
  cartao?: string
  agendado?: boolean
  onClick: () => void
}) {
  const detalhe = [
    categoria ?? 'sem categoria',
    cartao,
    occ.parcela
      ? `parcela ${occ.parcela.atual} de ${occ.parcela.total}`
      : occ.recorrencia !== 'nenhuma'
        ? recurrenceLabel(occ.recorrencia)
        : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-ink-300/50 py-3.5 text-left',
        'border-l-4 pr-5 pl-4 transition-colors hover:bg-ink-900/3 lg:pr-8 lg:pl-7',
        agendado ? 'border-l-accent-500' : 'border-l-income-500',
      )}
    >
      <span className="num w-9 shrink-0 text-sm text-ink-600">
        {Number(occ.data.slice(8, 10))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-medium lowercase">
            {occ.descricao || categoria || 'sem descrição'}
          </span>
          {agendado ? (
            <StatusPill tone="aberta">agendado</StatusPill>
          ) : (
            <StatusPill tone="paga">
              <Check className="size-3" strokeWidth={3} aria-hidden />
              pago
            </StatusPill>
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ink-600 lowercase">
          {detalhe}
        </span>
      </span>

      <span
        className={cn(
          'num shrink-0 text-base font-medium',
          agendado ? 'text-accent-600' : 'text-ink-900',
        )}
      >
        {formatBRL(occ.valor)}
      </span>
    </button>
  )
}
