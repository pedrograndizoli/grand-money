import { useMemo, useState, type ReactNode } from 'react'
import { startOfMonth } from 'date-fns'
import { Check, Pencil, Plus, TriangleAlert } from 'lucide-react'
import { formatBRL } from '../../domain/money'
import { allocateMonth, fromISO } from '../../domain/projection'
import type {
  Allocation,
  CardUsage,
  FixedStatus,
  FlexAllocation,
  MetaStatus,
} from '../../domain/projection'
import { useCategories } from '../../hooks/useCategories'
import { useCards } from '../../hooks/useCards'
import { useEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { Button } from '../../components/ui/Button'
import { StatusPill } from '../../components/ui/StatusPill'
import { dayLabel, monthLabel } from '../../lib/date'
import { cn } from '../../lib/cn'
import { CardSheet } from './CardSheet'
import { CategorySheet } from './CategorySheet'
import { GuardarSheet } from './GuardarSheet'
import { MetaSheet } from './MetaSheet'

export function TodayPage() {
  const settings = useSettings()
  const categories = useCategories()
  const cards = useCards()
  const entries = useEntries()

  const today = useMemo(() => new Date(), [])
  const [guardarEm, setGuardarEm] = useState<MetaStatus | null>(null)
  const [editando, setEditando] = useState<MetaStatus | null>(null)
  /** null = fechado · string = editando esse cartão · 'novo' = criando */
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null)
  const [categoriaAberta, setCategoriaAberta] = useState<{
    tipo: 'fixa' | 'flexivel'
    /** id da categoria, ou 'novo' */
    id: string
  } | null>(null)

  const abrirCategoria = (tipo: 'fixa' | 'flexivel', id: string) =>
    setCategoriaAberta({ tipo, id })

  const alloc = useMemo<Allocation | null>(() => {
    if (!settings.data) return null
    return allocateMonth({
      settings: settings.data,
      categories: categories.data ?? [],
      cards: cards.data ?? [],
      entries: entries.data ?? [],
      // esta tela é sempre o mês corrente: "hoje" não existe em outro mês
      month: startOfMonth(today),
      today,
    })
  }, [settings.data, categories.data, cards.data, entries.data, today])

  // o sheet edita a categoria; a projeção só diz como ela está no mês
  const emEdicao = categories.data?.find((c) => c.id === editando?.categoryId)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-baseline justify-between gap-4 border-b border-ink-300/70 px-5 py-4 pr-14 lg:px-8 lg:pr-16">
        <h1 className="text-2xl font-bold tracking-tight lowercase">hoje</h1>
        <p className="truncate text-sm text-ink-600 lowercase">
          {dayLabel(today)}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {alloc && (
          <div className="grid items-start gap-x-8 gap-y-9 px-5 py-6 pb-12 lg:grid-cols-2 lg:px-8">
            <div className="flex flex-col gap-6">
              <Hero alloc={alloc} />
              <Ritmo alloc={alloc} />
              {alloc.tetosAcimaDoDisponivel && <AvisoTetos />}
            </div>

            <div className="flex flex-col gap-8">
              <Bloco title="tetos flexíveis">
                {alloc.flexiveis.map((f) => (
                  <FlexRow
                    key={f.categoryId}
                    flex={f}
                    onEditar={() => abrirCategoria('flexivel', f.categoryId)}
                  />
                ))}
                <NovoBotao
                  onClick={() => abrirCategoria('flexivel', 'novo')}
                  label={alloc.flexiveis.length > 0 ? 'outro teto' : 'novo teto'}
                />
              </Bloco>

              <Bloco title="contas fixas do mês">
                {ordenarFixas(alloc.fixas).map((f) => (
                  <FixedRow
                    key={f.categoryId}
                    fixa={f}
                    hoje={today.getDate()}
                    onEditar={() => abrirCategoria('fixa', f.categoryId)}
                  />
                ))}
                <NovoBotao
                  onClick={() => abrirCategoria('fixa', 'novo')}
                  label={alloc.fixas.length > 0 ? 'outra conta' : 'nova conta'}
                />
              </Bloco>

              {alloc.metas.length > 0 && (
                <Bloco title="metas">
                  {alloc.metas.map((m) => (
                    <MetaRow
                      key={m.categoryId}
                      meta={m}
                      onGuardar={() => setGuardarEm(m)}
                      onEditar={() => setEditando(m)}
                    />
                  ))}
                </Bloco>
              )}

              <Bloco title="cartões">
                {alloc.cartoes.map((c) => (
                  <CardRow
                    key={c.cardId}
                    cartao={c}
                    onEditar={() => setCartaoAberto(c.cardId)}
                  />
                ))}
                <NovoBotao
                  onClick={() => setCartaoAberto('novo')}
                  label={alloc.cartoes.length > 0 ? 'outro cartão' : 'novo cartão'}
                />
              </Bloco>
            </div>
          </div>
        )}
      </div>

      {guardarEm && (
        <GuardarSheet
          key={guardarEm.categoryId}
          meta={guardarEm}
          onClose={() => setGuardarEm(null)}
        />
      )}

      {editando && emEdicao && (
        <MetaSheet
          key={emEdicao.id}
          categoria={emEdicao}
          guardadoTotal={editando.guardadoTotal}
          onClose={() => setEditando(null)}
        />
      )}

      {cartaoAberto && (
        <CardSheet
          key={cartaoAberto}
          cartao={cards.data?.find((c) => c.id === cartaoAberto) ?? null}
          onClose={() => setCartaoAberto(null)}
        />
      )}

      {categoriaAberta && (
        <CategorySheet
          key={categoriaAberta.id}
          tipo={categoriaAberta.tipo}
          categoria={
            categories.data?.find((c) => c.id === categoriaAberta.id) ?? null
          }
          onClose={() => setCategoriaAberta(null)}
        />
      )}
    </div>
  )
}

/** pendentes primeiro, por vencimento; as pagas descem para o fim da lista */
function ordenarFixas(fixas: FixedStatus[]): FixedStatus[] {
  return [...fixas].sort((a, b) => {
    const pagaA = a.pendente === 0 ? 1 : 0
    const pagaB = b.pendente === 0 ? 1 : 0
    if (pagaA !== pagaB) return pagaA - pagaB
    return (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99)
  })
}

function Hero({ alloc }: { alloc: Allocation }) {
  // em déficit não há diário: o número vira a conta do que falta entrar
  if (alloc.status === 'deficit') {
    return (
      <section className="rounded-2xl bg-ink-300/30 px-6 py-7">
        <p className="text-sm text-ink-600 lowercase">ainda sem diário</p>
        <p className="mt-2 text-3xl leading-tight font-semibold tracking-tight lowercase">
          falta entrar{' '}
          <span className="num font-bold">{formatBRL(alloc.falta)}</span>
        </p>
        <p className="mt-3 text-base leading-snug text-ink-600 lowercase">
          os compromissos do mês passam do que entrou até agora. cada entrada
          nova refaz essa conta.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-positive px-6 py-7">
      <p className="text-sm text-ink-900/60 lowercase">seu diário de hoje</p>
      <p className="num mt-1 text-5xl font-bold tracking-tight">
        {formatBRL(alloc.diario)}
      </p>
      <p className="mt-2 text-base text-ink-900/60 lowercase">
        {formatBRL(alloc.livre)} livres para {alloc.diasRestantes}{' '}
        {alloc.diasRestantes === 1 ? 'dia' : 'dias'}
      </p>
    </section>
  )
}

/**
 * Quanto do diário de hoje já foi usado. É ritmo, não poupança: o que sobra
 * aqui continua no bolo livre, não vira dinheiro guardado.
 */
function Ritmo({ alloc }: { alloc: Allocation }) {
  const diario = alloc.status === 'ok' ? alloc.diario : 0
  const gasto = alloc.gastoLivreHoje
  const passou = diario > 0 ? gasto > diario : gasto > 0
  const usado = diario > 0 ? Math.min(1, gasto / diario) : passou ? 1 : 0

  const legenda =
    alloc.status === 'deficit'
      ? 'sem diário, o gasto de hoje sai do que ainda falta entrar'
      : alloc.ritmoDoDia < 0
        ? `passou ${formatBRL(-alloc.ritmoDoDia)} do diário de hoje`
        : `ainda cabem ${formatBRL(alloc.ritmoDoDia)} hoje`

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-600 lowercase">gasto hoje</span>
        <span
          className={cn(
            'num text-sm font-medium',
            passou ? 'text-accent-500' : 'text-ink-900',
          )}
        >
          {diario > 0
            ? `${formatBRL(gasto)} de ${formatBRL(diario)}`
            : formatBRL(gasto)}
        </span>
      </div>
      <Bar value={usado} over={passou} className="mt-2" />
      <p className="mt-2 text-sm text-ink-600 lowercase">{legenda}</p>
    </section>
  )
}

function AvisoTetos() {
  return (
    <p className="flex items-start gap-2 text-sm leading-snug text-ink-600 lowercase">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      seus tetos flexíveis somam mais do que sobrou — algum vai ter que ceder.
    </p>
  )
}

function Bar({
  value,
  over,
  tone = 'ink',
  className,
}: {
  /** 0 a 1 */
  value: number
  over: boolean
  /** `meta` usa a cor do guardado; `ink` é gasto contra um teto */
  tone?: 'ink' | 'meta' | 'batida'
  className?: string
}) {
  const preenchimento =
    tone === 'meta' ? 'bg-badge' : tone === 'batida' ? 'bg-income-500' : 'bg-ink-900'

  return (
    <div
      className={cn(
        'h-1.5 overflow-hidden rounded-full bg-ink-300/50',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          over ? 'bg-accent-500' : preenchimento,
        )}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  )
}

/** Última linha de cada bloco: é daqui que sai toda categoria e todo cartão. */
function NovoBotao({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <li className="pt-3">
      <Button variant="outline" size="sm" onClick={onClick}>
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        {label}
      </Button>
    </li>
  )
}

function Bloco({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-sm text-ink-600 lowercase">{title}</h2>
      <ul className="mt-1 divide-y divide-ink-300/50">{children}</ul>
    </section>
  )
}

function FlexRow({
  flex,
  onEditar,
}: {
  flex: FlexAllocation
  onEditar: () => void
}) {
  const passou = flex.restante < 0
  const usado =
    flex.alocado > 0 ? Math.min(1, flex.gasto / flex.alocado) : passou ? 1 : 0

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={onEditar}
        aria-label={`editar o teto ${flex.nome}`}
        className="-mx-2 w-full rounded-lg px-2 py-1 text-left transition-colors hover:bg-ink-900/4"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-base font-medium lowercase">
            <span className="truncate">{flex.nome}</span>
            <Pencil
              className="size-3.5 shrink-0 text-ink-300"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
          {passou ? (
            <StatusPill tone="atrasada">
              passou {formatBRL(-flex.restante)}
            </StatusPill>
          ) : (
            <StatusPill tone="neutra">
              restam {formatBRL(flex.restante)}
            </StatusPill>
          )}
        </span>
        <span className="mt-2 flex items-center gap-3">
          <Bar value={usado} over={passou} className="flex-1" />
          <span className="num shrink-0 text-xs text-ink-600">
            {formatBRL(flex.gasto)} / {formatBRL(flex.alocado)}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * O teto do cartão avisa, não reserva: o gasto dele já saiu do livre no dia da
 * compra. Por isso a barra aqui é irmã da do teto flexível, não da meta.
 */
function CardRow({
  cartao,
  onEditar,
}: {
  cartao: CardUsage
  onEditar: () => void
}) {
  const usado =
    cartao.limite > 0
      ? Math.min(1, cartao.gasto / cartao.limite)
      : cartao.gasto > 0
        ? 1
        : 0

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={onEditar}
        aria-label={`editar o cartão ${cartao.nome}`}
        className="-mx-2 w-full rounded-lg px-2 py-1 text-left transition-colors hover:bg-ink-900/4"
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="flex min-w-0 items-center gap-1.5 text-base font-medium lowercase">
            <span className="truncate">{cartao.nome}</span>
            <Pencil
              className="size-3.5 shrink-0 text-ink-300"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
          <span
            className={cn(
              'num shrink-0 text-sm',
              cartao.acimaDoLimite
                ? 'font-medium text-accent-500'
                : 'text-ink-600',
            )}
          >
            {cartao.limite > 0
              ? `${formatBRL(cartao.gasto)} / ${formatBRL(cartao.limite)}`
              : formatBRL(cartao.gasto)}
          </span>
        </span>
        <Bar
          value={usado}
          over={cartao.acimaDoLimite}
          className="mt-2 w-full"
        />
      </button>
    </li>
  )
}

function FixedRow({
  fixa,
  hoje,
  onEditar,
}: {
  fixa: FixedStatus
  hoje: number
  onEditar: () => void
}) {
  const paga = fixa.pendente === 0
  const atrasada =
    !paga && fixa.diaVencimento !== null && fixa.diaVencimento < hoje

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={onEditar}
        aria-label={`editar a conta ${fixa.nome}`}
        className="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-ink-900/4"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5 text-base lowercase">
            <span className={cn('truncate', paga ? 'text-ink-600' : 'font-medium')}>
              {fixa.nome}
            </span>
            <Pencil
              className="size-3.5 shrink-0 text-ink-300"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-600 lowercase">
            {fixa.diaVencimento !== null && `vence dia ${fixa.diaVencimento}`}
            {fixa.estimado &&
              (fixa.diaVencimento !== null ? ' · valor varia' : 'valor varia')}
            {paga && fixa.pago > 0 && ` · ${formatBRL(fixa.pago)} pagos`}
          </span>
        </span>

        {paga ? (
          <StatusPill tone="paga">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            paga
          </StatusPill>
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            {atrasada && <StatusPill tone="atrasada">atrasada</StatusPill>}
            <span className="num text-base font-medium text-accent-600">
              {fixa.estimado && '≈ '}
              {formatBRL(fixa.pendente)}
            </span>
          </span>
        )}
      </button>
    </li>
  )
}

function MetaRow({
  meta,
  onGuardar,
  onEditar,
}: {
  meta: MetaStatus
  onGuardar: () => void
  onEditar: () => void
}) {
  const batida = !meta.semPlano && meta.faltaTotal === 0

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <button
        type="button"
        onClick={onEditar}
        aria-label={`editar a meta ${meta.nome}`}
        className="-mx-2 min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-ink-900/4"
      >
        <span className="flex items-center gap-1.5 text-base font-medium lowercase">
          <span className="truncate">{meta.nome}</span>
          <Pencil
            className="size-3.5 shrink-0 text-ink-300"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>

        {meta.semPlano ? (
          <span className="mt-0.5 block text-sm text-ink-600 lowercase">
            sem valor ou prazo — não entra na conta do mês
          </span>
        ) : (
          <>
            <span className="num mt-0.5 block text-sm text-ink-600">
              {batida ? (
                <span className="font-medium text-income-600 lowercase">
                  meta batida
                </span>
              ) : (
                <>
                  {formatBRL(meta.guardado)} de {formatBRL(meta.previsto)}
                  <span className="lowercase"> neste mês</span>
                </>
              )}
            </span>

            {/* o progresso é da meta inteira, não do mês: é o que responde
                "quanto já juntei e quanto ainda falta" */}
            <Progresso meta={meta} batida={batida} />
          </>
        )}
      </button>
      <Button size="sm" className="shrink-0" onClick={onGuardar}>
        guardar
      </Button>
    </li>
  )
}

/** Quanto da meta inteira já está guardado, somando todos os meses. */
function Progresso({ meta, batida }: { meta: MetaStatus; batida: boolean }) {
  const total = meta.metaTotal ?? 0
  const fracao = total > 0 ? Math.min(1, meta.guardadoTotal / total) : 0

  return (
    <>
      <span className="mt-2 flex items-center gap-3">
        <Bar
          value={fracao}
          over={false}
          tone={batida ? 'batida' : 'meta'}
          className="flex-1"
        />
        <span className="num shrink-0 text-xs text-ink-600">
          {Math.round(fracao * 100)}%
        </span>
      </span>

      <span className="num mt-1.5 block text-sm text-ink-600">
        {formatBRL(meta.guardadoTotal)} de {formatBRL(total)}
        {!batida && (
          <>
            <span className="lowercase"> · faltam </span>
            {formatBRL(meta.faltaTotal)}
            <span className="lowercase"> {prazoEmTexto(meta)}</span>
          </>
        )}
      </span>
    </>
  )
}

/** O mensal vem de dividir o que falta pelos meses até o prazo — o prazo manda. */
function prazoEmTexto(meta: MetaStatus): string {
  if (meta.mesesRestantes === 0) return 'com o prazo vencido'
  if (!meta.dataFinal) return ''
  return `até ${monthLabel(fromISO(meta.dataFinal))}, em ${meta.mesesRestantes} ${meta.mesesRestantes === 1 ? 'mês' : 'meses'}`
}
