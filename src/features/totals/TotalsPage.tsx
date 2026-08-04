import { useMemo, useState, type ReactNode } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  Receipt,
  Wallet,
} from 'lucide-react'
import { MonthStepper } from '../../components/layout/MonthStepper'
import { EntriesSheet } from '../../components/ui/EntriesSheet'
import { formatBRL } from '../../domain/money'
import { allocateMonth, expandEntries } from '../../domain/projection'
import type { Cents, Occurrence } from '../../domain/types'
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

  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)

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

  /**
   * As movimentações do mês, agrupadas pelo destino do dinheiro. O total de
   * cada grupo é a soma do que está listado dentro dele — abrir e conferir
   * fecha a conta.
   */
  const grupos = useMemo<Grupo[]>(() => {
    const occ = expandEntries(
      entries ?? [],
      startOfMonth(month),
      endOfMonth(month),
    )
    const porId = new Map((categories ?? []).map((c) => [c.id, c]))
    const saidas = occ.filter((o) => o.tipo === 'saida')
    const ehFixa = (o: Occurrence) =>
      o.categoryId !== null && porId.get(o.categoryId)?.tipo === 'fixa'

    return [
      grupo('entradas', 'entradas', 'o que entrou no mês', occ.filter((o) => o.tipo === 'entrada'), <ArrowDownLeft className="size-4" strokeWidth={3} />, 'bg-income-600 text-white'),
      grupo('livre', 'gasto livre', 'o dia a dia, fora das contas fixas', saidas.filter((o) => !ehFixa(o)), <ArrowUpRight className="size-4" strokeWidth={3} />, 'bg-accent-500 text-white'),
      grupo('fixas', 'contas fixas', 'o que foi pago nas contas do mês', saidas.filter(ehFixa), <Receipt className="size-4" strokeWidth={2.5} />, 'bg-accent-600 text-white'),
      grupo('guardado', 'guardado', 'saiu do livre e foi para uma meta', occ.filter((o) => o.tipo === 'guardado'), <Wallet className="size-4" strokeWidth={2.5} />, 'bg-badge text-white'),
      grupo('cartao', 'no cartão', 'recorte das saídas acima, não soma de novo', saidas.filter((o) => o.cardId !== null), <CreditCard className="size-4" strokeWidth={2.5} />, 'bg-solid text-on-solid'),
    ]
  }, [entries, categories, month])

  const aberto = grupos.find((g) => g.id === grupoAberto)

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
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

            <h2 className="px-5 pt-8 pb-2 text-sm text-ink-600 lowercase lg:px-8">
              movimentações do mês
            </h2>
            {grupos.map((g) => (
              <MovRow
                key={g.id}
                grupo={g}
                onAbrir={() => setGrupoAberto(g.id)}
              />
            ))}

            <h2 className="px-5 pt-8 pb-2 text-sm text-ink-600 lowercase lg:px-8">
              ainda comprometido
            </h2>
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

      <EntriesSheet
        open={aberto !== undefined}
        title={aberto?.label ?? ''}
        occurrences={aberto?.occ ?? []}
        comData
        onClose={() => setGrupoAberto(null)}
      />
    </div>
  )
}

interface Grupo {
  id: string
  label: string
  nota: string
  occ: Occurrence[]
  total: Cents
  icone: ReactNode
  cor: string
}

function grupo(
  id: string,
  label: string,
  nota: string,
  occ: Occurrence[],
  icone: ReactNode,
  cor: string,
): Grupo {
  // do mais recente para o mais antigo: o que acabou de acontecer vem primeiro
  const ordenado = [...occ].sort((a, b) => b.data.localeCompare(a.data))
  return {
    id,
    label,
    nota,
    occ: ordenado,
    total: ordenado.reduce((s, o) => s + o.valor, 0),
    icone,
    cor,
  }
}

function MovRow({ grupo, onAbrir }: { grupo: Grupo; onAbrir: () => void }) {
  const vazio = grupo.occ.length === 0

  const conteudo = (
    <>
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          grupo.cor,
          vazio && 'opacity-40',
        )}
        aria-hidden
      >
        {grupo.icone}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base lowercase">{grupo.label}</span>
        <span className="block truncate text-sm text-ink-600 lowercase">
          {vazio
            ? 'nenhum lançamento'
            : `${grupo.occ.length} ${grupo.occ.length === 1 ? 'lançamento' : 'lançamentos'} · ${grupo.nota}`}
        </span>
      </span>

      <span
        className={cn('num shrink-0 text-base font-medium', vazio && 'text-ink-600')}
      >
        {formatBRL(grupo.total)}
      </span>
    </>
  )

  const classe =
    'flex w-full items-center gap-3 border-b border-ink-300/50 px-5 py-4 text-left lg:px-8'

  if (vazio) return <div className={classe}>{conteudo}</div>

  return (
    <button
      type="button"
      onClick={onAbrir}
      className={cn(classe, 'transition-colors hover:bg-ink-900/3')}
    >
      {conteudo}
      <ChevronRight
        className="size-5 shrink-0 text-ink-300"
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
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
