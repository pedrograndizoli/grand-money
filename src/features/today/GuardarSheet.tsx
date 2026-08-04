import { useState } from 'react'
import { formatBRL, popDigit, pushDigit } from '../../domain/money'
import type { Cents } from '../../domain/types'
import type { MetaStatus } from '../../domain/projection'
import { useCreateEntry } from '../../hooks/useEntries'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { Sheet } from '../../components/ui/Sheet'
import { todayISO } from '../../lib/date'
import { errorMessage } from '../../lib/errors'

interface GuardarSheetProps {
  meta: MetaStatus
  onClose: () => void
}

/**
 * Guardar é um lançamento de tipo `guardado` na meta, com a data de hoje: sai
 * do bolo livre e não volta. Escuro como o resto do fluxo de lançamento.
 */
export function GuardarSheet({ meta, onClose }: GuardarSheetProps) {
  const [valor, setValor] = useState<Cents>(0)
  const create = useCreateEntry()

  const salvar = async () => {
    if (valor <= 0 || create.isPending) return
    await create.mutateAsync({
      tipo: 'guardado',
      valor,
      descricao: null,
      data: todayISO(),
      categoryId: meta.categoryId,
      cardId: null,
      recorrencia: 'nenhuma',
      parcelas: null,
      tags: [],
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`guardar em ${meta.nome}`} tone="dark">
      <div className="px-6 pt-6 pb-2">
        <MoneyInput
          tone="dark"
          label="valor a guardar"
          value={valor}
          onChange={setValor}
          underline
          autoFocus
        />

        <p className="mt-3 text-sm text-white/45 lowercase">
          {meta.semPlano
            ? 'meta sem valor ou prazo: nada é reservado por mês'
            : meta.faltaTotal === 0
              ? 'meta batida — o que entrar aqui é extra'
              : meta.reserva > 0
                ? `falta guardar ${formatBRL(meta.reserva)} neste mês, de ${formatBRL(meta.faltaTotal)} até o fim`
                : 'a parte deste mês já está guardada'}
        </p>

        <Button
          variant="accent"
          full
          className="mt-6 bg-badge hover:bg-badge/85"
          onClick={() => void salvar()}
          disabled={valor <= 0 || create.isPending}
        >
          {create.isPending ? 'guardando…' : 'guardar'}
        </Button>

        {create.error && (
          <pre
            role="alert"
            className="mt-4 overflow-x-auto text-sm whitespace-pre-wrap text-accent-500"
          >
            {errorMessage(create.error)}
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
