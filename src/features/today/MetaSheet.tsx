import { useState } from 'react'
import { formatBRL, popDigit, pushDigit } from '../../domain/money'
import { fromISO, mensalDaMeta } from '../../domain/projection'
import type { Category, Cents } from '../../domain/types'
import { useUpdateCategory } from '../../hooks/useCategories'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { Sheet } from '../../components/ui/Sheet'
import { monthLabel, todayISO } from '../../lib/date'
import { errorMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'

interface MetaSheetProps {
  categoria: Category
  /** o que já foi guardado nela somando todos os meses — o plano se refaz em cima disso */
  guardadoTotal: Cents
  onClose: () => void
}

/**
 * Editar a meta é mexer no total e no prazo: o quanto por mês não é campo, é
 * consequência. A prévia mostra a conta se refazendo enquanto se digita.
 */
export function MetaSheet({ categoria, guardadoTotal, onClose }: MetaSheetProps) {
  const [nome, setNome] = useState(categoria.nome)
  const [total, setTotal] = useState<Cents>(categoria.metaTotal ?? 0)
  const [prazo, setPrazo] = useState<string | null>(categoria.dataFinal)
  const update = useUpdateCategory()

  const valido = nome.trim().length > 0 && total > 0 && prazo !== null
  const falta = Math.max(0, total - guardadoTotal)
  const mensal = mensalDaMeta(falta, prazo, new Date())

  async function salvar() {
    if (!valido || update.isPending) return
    try {
      await update.mutateAsync({
        id: categoria.id,
        draft: {
          nome: nome.trim(),
          tipo: 'meta',
          // na meta o mensal é calculado: nada a gravar aqui
          valorPrevisto: 0,
          valorEstimado: false,
          diaVencimento: null,
          metaTotal: total,
          dataFinal: prazo,
          cor: categoria.cor,
        },
      })
    } catch (e) {
      console.error('[grand money] falha ao salvar meta', e)
      return
    }
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="editar meta" tone="dark">
      <div className="px-6 pt-6 pb-2">
        <label className="block text-xs font-semibold text-white/45 lowercase">
          nome
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="nome da meta"
          aria-label="nome da meta"
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
            label="valor da meta"
            value={total}
            onChange={setTotal}
            underline
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <label
            className="text-xs font-semibold text-white/45 lowercase"
            htmlFor="prazo-da-meta"
          >
            até quando
          </label>
          <input
            id="prazo-da-meta"
            type="date"
            value={prazo ?? ''}
            min={todayISO()}
            onChange={(e) => setPrazo(e.target.value || null)}
            className={cn(
              'num h-11 rounded-full border border-white/20 bg-transparent px-4',
              'text-lg font-semibold outline-none [color-scheme:dark] focus:border-white/45',
            )}
          />
        </div>

        <p className="mt-5 text-sm leading-snug text-white/45 lowercase">
          {!valido ? (
            'com o valor e o prazo, o app divide pelos meses que faltam.'
          ) : falta === 0 ? (
            'meta batida: nada mais é reservado por mês.'
          ) : (
            <>
              faltam{' '}
              <span className="num font-semibold text-white">
                {formatBRL(falta)}
              </span>
              , que viram{' '}
              <span className="num font-semibold text-white">
                {formatBRL(mensal)}
              </span>{' '}
              por mês até {prazo && monthLabel(fromISO(prazo))}.
            </>
          )}
        </p>

        {guardadoTotal > 0 && (
          <p className="num mt-1 text-sm text-white/45">
            {formatBRL(guardadoTotal)}
            <span className="lowercase"> já guardados</span>
          </p>
        )}

        <Button
          variant="accent"
          full
          className="mt-6 bg-badge hover:bg-badge/85"
          onClick={() => void salvar()}
          disabled={!valido || update.isPending}
        >
          {update.isPending ? 'salvando…' : 'salvar meta'}
        </Button>

        {update.error && (
          <pre
            role="alert"
            className="mt-4 overflow-x-auto text-sm whitespace-pre-wrap text-accent-500"
          >
            {errorMessage(update.error)}
          </pre>
        )}
      </div>

      <NumericKeypad
        tone="dark"
        onDigit={(d) => setTotal((v) => pushDigit(v, d))}
        onBackspace={() => setTotal(popDigit)}
      />
    </Sheet>
  )
}
