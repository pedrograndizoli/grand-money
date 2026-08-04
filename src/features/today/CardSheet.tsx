import { useState } from 'react'
import { popDigit, pushDigit } from '../../domain/money'
import type { Card, Cents } from '../../domain/types'
import { useCreateCard, useUpdateCard } from '../../hooks/useCards'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { Sheet } from '../../components/ui/Sheet'
import { errorMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'

interface CardSheetProps {
  /** null cria um cartão novo */
  cartao: Card | null
  onClose: () => void
}

/**
 * Cartão é informado na mão: nome e teto do mês. O teto só avisa — o gasto no
 * cartão já saiu do livre no dia em que aconteceu.
 */
export function CardSheet({ cartao, onClose }: CardSheetProps) {
  const [nome, setNome] = useState(cartao?.nome ?? '')
  const [limite, setLimite] = useState<Cents>(cartao?.limiteMensal ?? 0)
  const create = useCreateCard()
  const update = useUpdateCard()

  const salvando = create.isPending || update.isPending
  const erro = create.error ?? update.error
  const valido = nome.trim().length > 0

  async function salvar() {
    if (!valido || salvando) return
    const draft = {
      nome: nome.trim(),
      limiteMensal: limite,
      cor: cartao?.cor ?? null,
    }
    try {
      if (cartao) await update.mutateAsync({ id: cartao.id, draft })
      else await create.mutateAsync(draft)
    } catch (e) {
      console.error('[grand money] falha ao salvar cartão', e)
      return
    }
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={cartao ? 'editar cartão' : 'novo cartão'}
      tone="dark"
    >
      <div className="px-6 pt-6 pb-2">
        <label className="block text-xs font-semibold text-white/45 lowercase">
          nome
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="nome do cartão"
          aria-label="nome do cartão"
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
            label="teto do mês"
            value={limite}
            onChange={setLimite}
            underline
          />
        </div>

        <p className="mt-4 text-sm leading-snug text-white/45 lowercase">
          {limite > 0
            ? 'o teto só avisa. o que você gasta no cartão já sai do diário no dia da compra, não na fatura.'
            : 'sem teto, o cartão só acompanha quanto passou nele no mês.'}
        </p>

        <Button
          variant="accent"
          full
          className="mt-6"
          onClick={() => void salvar()}
          disabled={!valido || salvando}
        >
          {salvando ? 'salvando…' : cartao ? 'salvar cartão' : 'criar cartão'}
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
        onDigit={(d) => setLimite((v) => pushDigit(v, d))}
        onBackspace={() => setLimite(popDigit)}
      />
    </Sheet>
  )
}
