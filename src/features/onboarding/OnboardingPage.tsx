import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { ProgressDots } from '../../components/ui/ProgressDots'
import { useCreateCategories } from '../../hooks/useCategories'
import { useSaveSettings, useSettings } from '../../hooks/useSettings'
import { popDigit, pushDigit } from '../../domain/money'
import { errorMessage } from '../../lib/errors'
import { CategoryComposer } from './CategoryComposer'
import { emptyForm, isFilled, popDay, pushDay, toDraft } from './categoryForm'
import type { CategoryForm, NumericTarget } from './categoryForm'
import { STEPS } from './steps'
import { clearDraft, readDraft, writeDraft } from './draft'
import type { CategoryDraft, Cents } from '../../domain/types'

export function OnboardingPage() {
  const { step } = useParams()
  const navigate = useNavigate()
  const save = useSaveSettings()
  const saveCategories = useCreateCategories()
  const settings = useSettings()

  const index = Number(step) - 1
  const valid = Number.isInteger(index) && index >= 0 && index < STEPS.length
  const current = valid ? STEPS[index] : STEPS[0]

  const [saldo, setSaldo] = useState<Cents>(0)
  const [categorias, setCategorias] = useState<CategoryDraft[]>([])
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [target, setTarget] = useState<NumericTarget>('valor')
  const seeded = useRef(false)

  // preenche com o que já existe: entrar por "atualizar meu saldo" precisa
  // mostrar o valor atual, não um campo em branco
  useEffect(() => {
    if (seeded.current || settings.isPending) return
    seeded.current = true
    const draft = readDraft()
    setSaldo(draft.saldoInicial ?? settings.data?.saldoInicial ?? 0)
    setCategorias(draft.categorias ?? [])
  }, [settings.isPending, settings.data])

  // o formulário é do passo: uma conta fixa não vaza para os tetos
  useEffect(() => {
    setForm(emptyForm)
    setTarget('valor')
  }, [current.key])

  if (!valid) return <Navigate to="/onboarding/1" replace />

  const isLast = index === STEPS.length - 1
  const salvando = save.isPending || saveCategories.isPending
  const erro = save.error ?? saveCategories.error

  function persist(cats: CategoryDraft[]) {
    writeDraft({ saldoInicial: saldo, categorias: cats })
  }

  /**
   * Guarda o que está no formulário. Mesmo nome no mesmo tipo atualiza a linha
   * em vez de duplicar — tocar duas vezes no chip "aluguel" é corrigir, não criar.
   */
  function commit(): CategoryDraft[] {
    if (current.kind !== 'categorias' || !isFilled(form)) return categorias

    const draft = toDraft(form, current.tipo)
    const chave = draft.nome.toLowerCase()
    const i = categorias.findIndex(
      (c) => c.tipo === draft.tipo && c.nome.toLowerCase() === chave,
    )

    const next = [...categorias]
    if (i === -1) next.push(draft)
    else next[i] = draft

    setCategorias(next)
    setForm(emptyForm)
    setTarget('valor')
    persist(next)
    return next
  }

  function remove(item: CategoryDraft) {
    const next = categorias.filter((c) => c !== item)
    setCategorias(next)
    persist(next)
  }

  async function finish(cats: CategoryDraft[]) {
    try {
      await save.mutateAsync({
        saldoInicial: saldo,
        saldoRef: format(new Date(), 'yyyy-MM-dd'),
      })
      await saveCategories.mutateAsync(cats)
    } catch (e) {
      console.error('[grand money] falha ao salvar onboarding', e)
      return // a mensagem de erro sai pelo bloco de erro
    }
    clearDraft()
    navigate('/', { replace: true })
  }

  /** avançar e voltar gravam o formulário: nada digitado desaparece calado */
  async function next() {
    const cats = commit()
    persist(cats)
    if (!isLast) {
      navigate(`/onboarding/${index + 2}`)
      return
    }
    await finish(cats)
  }

  async function skip() {
    persist(categorias)
    if (!isLast) {
      navigate(`/onboarding/${index + 2}`)
      return
    }
    await finish(categorias)
  }

  function back() {
    persist(commit())
    if (index === 0) navigate('/bem-vindo')
    else navigate(`/onboarding/${index}`)
  }

  const numeroNoDia = current.kind === 'categorias' && target === 'dia'

  function onDigit(digit: number) {
    if (current.kind === 'saldo') {
      setSaldo((v) => pushDigit(v, digit))
      return
    }
    if (numeroNoDia) {
      setForm((f) => ({ ...f, dia: pushDay(f.dia, digit) }))
      return
    }
    setForm((f) => ({ ...f, valor: pushDigit(f.valor, digit) }))
  }

  function onBackspace() {
    if (current.kind === 'saldo') {
      setSaldo(popDigit)
      return
    }
    if (numeroNoDia) {
      setForm((f) => ({ ...f, dia: popDay(f.dia) }))
      return
    }
    setForm((f) => ({ ...f, valor: popDigit(f.valor) }))
  }

  return (
    <BrandScreen
      header={
        <div className="relative flex h-10 items-center">
          <button
            type="button"
            onClick={back}
            aria-label="voltar"
            className="-ml-2 grid size-10 place-items-center rounded-full transition-colors hover:bg-ink-900/8"
          >
            <ArrowLeft className="size-7" strokeWidth={2.25} />
          </button>
          <ProgressDots
            total={STEPS.length}
            current={index + 1}
            className="absolute left-1/2 -translate-x-1/2"
          />
        </div>
      }
      footer={
        <div className="flex flex-col gap-3">
          <Button full onClick={() => void next()} disabled={salvando}>
            {isLast
              ? salvando
                ? 'salvando…'
                : 'ver meu diário'
              : 'próximo'}
          </Button>

          {current.kind === 'categorias' && current.opcional && (
            <Button
              variant="ghost"
              size="md"
              full
              onClick={() => void skip()}
              disabled={salvando}
            >
              pular
            </Button>
          )}
        </div>
      }
      keypad={<NumericKeypad onDigit={onDigit} onBackspace={onBackspace} />}
    >
      <h1
        key={current.key}
        className="animate-slide-in text-[2.1rem] leading-[1.08] font-bold tracking-tight lowercase sm:text-4xl"
      >
        {current.question}
      </h1>

      {current.kind === 'saldo' ? (
        <>
          <div className="mt-8">
            <MoneyInput
              value={saldo}
              onChange={setSaldo}
              label={current.question}
              size="xl"
              underline
              autoFocus
            />
          </div>

          <p className="mt-6 pb-8 text-lg leading-snug text-ink-900/60">
            {current.help}
          </p>
        </>
      ) : (
        <CategoryComposer
          step={current}
          form={form}
          onFormChange={setForm}
          target={target}
          onTargetChange={setTarget}
          items={categorias.filter((c) => c.tipo === current.tipo)}
          onAdd={() => void commit()}
          onRemove={remove}
        />
      )}

      {erro && (
        <div role="alert" className="pb-8">
          <p className="text-base font-medium text-accent-600 lowercase">
            não deu pra salvar:
          </p>
          <pre className="mt-1 overflow-x-auto text-sm whitespace-pre-wrap text-accent-600/80">
            {errorMessage(erro)}
          </pre>
        </div>
      )}
    </BrandScreen>
  )
}
