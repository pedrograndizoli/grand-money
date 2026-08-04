import { useState } from 'react'
import { popDigit, pushDigit } from '../../domain/money'
import type { Category, CategoryType, Cents } from '../../domain/types'
import { useCreateCategory, useUpdateCategory } from '../../hooks/useCategories'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { Sheet } from '../../components/ui/Sheet'
import { errorMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'

interface CategorySheetProps {
  /** null cria uma categoria nova do tipo `tipo` */
  categoria: Category | null
  tipo: Extract<CategoryType, 'fixa' | 'flexivel'>
  onClose: () => void
}

const TEXTO = {
  fixa: {
    novo: 'nova conta fixa',
    editar: 'editar conta',
    valor: 'valor da conta',
    salvar: 'salvar conta',
    ajuda: 'esse valor fica reservado antes de virar diário.',
  },
  flexivel: {
    novo: 'novo teto',
    editar: 'editar teto',
    valor: 'teto do mês',
    salvar: 'salvar teto',
    ajuda: 'teto não reserva dinheiro: só avisa quando você passa dele.',
  },
} as const

/** Cria e edita conta fixa e teto flexível. Meta tem sheet próprio: os campos são outros. */
export function CategorySheet({ categoria, tipo, onClose }: CategorySheetProps) {
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [valor, setValor] = useState<Cents>(categoria?.valorPrevisto ?? 0)
  const [dia, setDia] = useState<number | null>(categoria?.diaVencimento ?? null)
  const [estimado, setEstimado] = useState(categoria?.valorEstimado ?? false)

  const create = useCreateCategory()
  const update = useUpdateCategory()

  const t = TEXTO[tipo]
  const fixa = tipo === 'fixa'
  const salvando = create.isPending || update.isPending
  const erro = create.error ?? update.error
  const valido = nome.trim().length > 0

  async function salvar() {
    if (!valido || salvando) return
    const draft = {
      nome: nome.trim(),
      tipo,
      valorPrevisto: valor,
      valorEstimado: fixa && estimado,
      diaVencimento: fixa ? dia : null,
      metaTotal: null,
      dataFinal: null,
      cor: categoria?.cor ?? null,
    }
    try {
      if (categoria) await update.mutateAsync({ id: categoria.id, draft })
      else await create.mutateAsync(draft)
    } catch (e) {
      console.error('[grand money] falha ao salvar categoria', e)
      return
    }
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={categoria ? t.editar : t.novo}
      tone="dark"
    >
      <div className="px-6 pt-6 pb-2">
        <label className="block text-xs font-semibold text-white/45 lowercase">
          nome
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={fixa ? 'aluguel, energia…' : 'mercado, lazer…'}
          aria-label="nome da categoria"
          autoComplete="off"
          className={cn(
            'mt-1 w-full border-b border-line-dark bg-transparent py-2',
            'text-xl font-semibold lowercase outline-none',
            'placeholder:font-normal placeholder:text-white/30 focus:border-white/45',
          )}
        />

        <div className="mt-6">
          <MoneyInput
            tone="dark"
            label={t.valor}
            value={valor}
            onChange={setValor}
            underline
          />
        </div>

        {fixa && (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
              <label
                className="text-xs font-semibold text-white/45 lowercase"
                htmlFor="dia-vencimento"
              >
                vence dia
              </label>
              <input
                id="dia-vencimento"
                type="number"
                min={1}
                max={31}
                value={dia ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setDia(
                    e.target.value === '' || Number.isNaN(n)
                      ? null
                      : Math.min(31, Math.max(1, n)),
                  )
                }}
                className={cn(
                  'num h-11 w-24 rounded-full border border-white/20 bg-transparent px-4',
                  'text-lg font-semibold outline-none focus:border-white/45',
                  'placeholder:font-normal placeholder:text-white/30',
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => setEstimado((v) => !v)}
              aria-pressed={estimado}
              className="mt-6 flex w-full items-center gap-3 text-left"
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-md border transition-colors',
                  estimado
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-white/25',
                )}
                aria-hidden
              >
                {estimado && '✓'}
              </span>
              <span className="text-base lowercase">o valor muda todo mês</span>
            </button>

            <p className="mt-2 text-sm leading-snug text-white/45 lowercase">
              {estimado
                ? 'o valor acima é só uma estimativa para reservar. lançar o pagamento fecha a conta do mês, pelo valor que ela vier.'
                : t.ajuda}
            </p>
          </>
        )}

        {!fixa && (
          <p className="mt-4 text-sm leading-snug text-white/45 lowercase">
            {t.ajuda}
          </p>
        )}

        <Button
          variant="accent"
          full
          className="mt-6"
          onClick={() => void salvar()}
          disabled={!valido || salvando}
        >
          {salvando ? 'salvando…' : categoria ? t.salvar : `criar ${fixa ? 'conta' : 'teto'}`}
        </Button>

        {erro && (
          <pre
            role="alert"
            className="mt-4 overflow-x-auto text-sm whitespace-pre-wrap text-accent-500"
          >
            {errorMessage(erro)}
          </pre>
        )}
      </div>

      <NumericKeypad
        tone="dark"
        onDigit={(d) => setValor((v) => pushDigit(v, d))}
        onBackspace={() => setValor(popDigit)}
      />
    </Sheet>
  )
}
