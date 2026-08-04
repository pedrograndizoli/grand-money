import { Plus, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useIsTouch } from '../../hooks/useIsTouch'
import { formatBRL } from '../../domain/money'
import { fromISO, mensalDaMeta } from '../../domain/projection'
import { monthLabel, todayISO } from '../../lib/date'
import { cn } from '../../lib/cn'
import { isFilled, parseDay } from './categoryForm'
import type { CategoryForm, NumericTarget } from './categoryForm'
import type { CategoryStep } from './steps'
import type { CategoryDraft } from '../../domain/types'

const LABEL = 'block text-xs font-semibold lowercase text-ink-900/50'

interface DayInputProps {
  dia: number | null
  onChange: (dia: number | null) => void
  active: boolean
  onActivate: () => void
}

/**
 * Em touch o dia é só texto, alimentado pelo `NumericKeypad`, para não subir o
 * teclado do sistema por cima da tela — mesma escolha do `MoneyInput`.
 */
function DayInput({ dia, onChange, active, onActivate }: DayInputProps) {
  const isTouch = useIsTouch()
  const box =
    'num flex h-11 w-24 items-center gap-px rounded-full border px-4 text-xl transition-colors'
  const empty = dia === null

  if (isTouch) {
    return (
      <div
        role="textbox"
        aria-readonly="true"
        aria-label="dia do vencimento"
        tabIndex={0}
        onClick={onActivate}
        onFocus={onActivate}
        className={cn(box, active ? 'border-ink-900/45' : 'border-ink-900/20')}
      >
        <span
          className={cn(
            empty ? 'text-ink-900/35' : 'font-semibold text-ink-900',
          )}
        >
          {empty ? '—' : dia}
        </span>
        {active && (
          <span
            aria-hidden
            className="animate-caret inline-block h-6 w-px bg-ink-900"
          />
        )}
      </div>
    )
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label="dia do vencimento"
      value={empty ? '' : String(dia)}
      placeholder="—"
      onFocus={onActivate}
      onChange={(e) => onChange(parseDay(e.target.value))}
      className={cn(
        box,
        'border-ink-900/20 bg-transparent font-semibold outline-none',
        'placeholder:font-normal placeholder:text-ink-900/35 focus:border-ink-900/45',
      )}
    />
  )
}

/** O mensal da meta não é digitado: mostra a conta acontecendo enquanto se digita. */
function Plano({
  valor,
  dataFinal,
}: {
  valor: number
  dataFinal: string | null
}) {
  if (valor <= 0 || !dataFinal) {
    return (
      <p className="mt-4 text-sm leading-snug text-ink-900/60">
        com o valor e o prazo, o app divide pelos meses que faltam.
      </p>
    )
  }

  return (
    <p className="mt-4 text-sm leading-snug text-ink-900/60">
      são{' '}
      <span className="num font-semibold text-ink-900">
        {formatBRL(mensalDaMeta(valor, dataFinal, new Date()))}
      </span>{' '}
      por mês até {monthLabel(fromISO(dataFinal))}, separados do seu diário.
    </p>
  )
}

interface CategoryComposerProps {
  step: CategoryStep
  form: CategoryForm
  onFormChange: (form: CategoryForm) => void
  target: NumericTarget
  onTargetChange: (target: NumericTarget) => void
  /** só as categorias deste tipo, na ordem em que foram adicionadas */
  items: readonly CategoryDraft[]
  onAdd: () => void
  onRemove: (item: CategoryDraft) => void
}

export function CategoryComposer({
  step,
  form,
  onFormChange,
  target,
  onTargetChange,
  items,
  onAdd,
  onRemove,
}: CategoryComposerProps) {
  const usados = new Set(items.map((c) => c.nome.trim().toLowerCase()))
  const sugestoes = step.sugestoes.filter((nome) => !usados.has(nome))

  return (
    <div className="pb-8">
      <p className="mt-4 text-base leading-snug text-ink-900/60">{step.help}</p>

      {sugestoes.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {sugestoes.map((nome) => (
            <button
              key={nome}
              type="button"
              onClick={() => {
                onFormChange({ ...form, nome })
                onTargetChange('valor')
              }}
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-full border border-ink-900/20 px-4',
                'text-sm lowercase transition-colors',
                'hover:border-ink-900/45 hover:bg-ink-900/5 active:bg-ink-900/10',
              )}
            >
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
              {nome}
            </button>
          ))}
        </div>
      )}

      <div className="mt-7">
        <input
          value={form.nome}
          onChange={(e) => onFormChange({ ...form, nome: e.target.value })}
          placeholder="nome"
          aria-label="nome da categoria"
          autoComplete="off"
          className={cn(
            'w-full border-b border-ink-900/15 bg-transparent py-2',
            'text-2xl font-semibold tracking-tight lowercase outline-none',
            'placeholder:font-normal placeholder:text-ink-900/30',
          )}
        />
      </div>

      <div className="mt-5">
        <span className={LABEL}>{step.valorLabel}</span>
        <MoneyInput
          value={form.valor}
          onChange={(valor) => onFormChange({ ...form, valor })}
          label={step.valorLabel}
          size="lg"
          underline
          active={target === 'valor'}
          onActivate={() => onTargetChange('valor')}
        />
      </div>

      {step.tipo === 'fixa' && (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <span className={LABEL}>vence dia</span>
            <DayInput
              dia={form.dia}
              onChange={(dia) => onFormChange({ ...form, dia })}
              active={target === 'dia'}
              onActivate={() => onTargetChange('dia')}
            />
          </div>

          {/* energia e água vêm todo mês com valor diferente: o previsto delas
              é estimativa, e o pagamento fecha a conta pelo valor que veio */}
          <button
            type="button"
            onClick={() => onFormChange({ ...form, estimado: !form.estimado })}
            aria-pressed={form.estimado}
            className="mt-5 flex w-full items-center gap-3 text-left"
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-md border transition-colors',
                form.estimado
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-900/25',
              )}
              aria-hidden
            >
              {form.estimado && '✓'}
            </span>
            <span className="text-base lowercase">o valor muda todo mês</span>
          </button>
        </>
      )}

      {step.tipo === 'meta' && (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <label className={LABEL} htmlFor="prazo-da-meta">
              até quando
            </label>
            <input
              id="prazo-da-meta"
              type="date"
              value={form.dataFinal ?? ''}
              min={todayISO()}
              onChange={(e) =>
                onFormChange({ ...form, dataFinal: e.target.value || null })
              }
              className={cn(
                'num h-11 rounded-full border border-ink-900/20 bg-transparent px-4',
                'text-lg font-semibold outline-none focus:border-ink-900/45',
              )}
            />
          </div>

          <Plano valor={form.valor} dataFinal={form.dataFinal} />
        </>
      )}

      <Button
        variant="outline"
        size="md"
        full
        className="mt-7"
        onClick={onAdd}
        disabled={!isFilled(form, step.tipo)}
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        {step.addLabel}
      </Button>

      {items.length > 0 && (
        <ul className="mt-8 border-t border-ink-900/12">
          {items.map((c) => (
            <li
              key={c.nome}
              className="animate-fade-in flex items-center gap-3 border-b border-ink-900/12 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-lg lowercase">
                {c.nome}
              </span>

              {c.diaVencimento !== null && (
                <span className="num shrink-0 text-sm text-ink-900/55">
                  dia {c.diaVencimento}
                </span>
              )}

              {c.valorEstimado && (
                <span className="shrink-0 text-sm text-ink-900/55 lowercase">
                  varia
                </span>
              )}

              {c.dataFinal !== null && (
                <span className="num shrink-0 text-sm text-ink-900/55">
                  até {monthLabel(fromISO(c.dataFinal))}
                </span>
              )}

              <span className="num shrink-0 text-lg font-semibold">
                {formatBRL(c.tipo === 'meta' ? (c.metaTotal ?? 0) : c.valorPrevisto)}
              </span>

              <button
                type="button"
                onClick={() => onRemove(c)}
                aria-label={`remover ${c.nome}`}
                className={cn(
                  '-mr-2 grid size-9 shrink-0 place-items-center rounded-full',
                  'text-ink-900/45 transition-colors hover:bg-ink-900/8 hover:text-ink-900',
                )}
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
