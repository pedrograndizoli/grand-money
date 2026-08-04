import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumericKeypad } from '../../components/ui/NumericKeypad'
import { ProgressDots } from '../../components/ui/ProgressDots'
import { useSaveSettings, useSettings } from '../../hooks/useSettings'
import { popDigit, pushDigit } from '../../domain/money'
import { errorMessage } from '../../lib/errors'
import { STEPS, type StepKey } from './steps'
import { clearDraft, readDraft, writeDraft } from './draft'

export function OnboardingPage() {
  const { step } = useParams()
  const navigate = useNavigate()
  const save = useSaveSettings()
  const settings = useSettings()

  const index = Number(step) - 1
  const valid = Number.isInteger(index) && index >= 0 && index < STEPS.length
  const current = valid ? STEPS[index] : STEPS[0]

  const [value, setValue] = useState(0)
  const seeded = useRef<StepKey | null>(null)

  // preenche com o que já existe: entrar por "atualizar meu saldo" precisa
  // mostrar o valor atual, não um campo em branco
  useEffect(() => {
    if (!valid || settings.isPending || seeded.current === current.key) return
    seeded.current = current.key
    setValue(readDraft()[current.key] ?? settings.data?.saldoInicial ?? 0)
  }, [valid, current.key, settings.isPending, settings.data])

  if (!valid) return <Navigate to="/onboarding/1" replace />

  const isLast = index === STEPS.length - 1

  async function next() {
    const draft = { ...readDraft(), [current.key]: value }
    writeDraft(draft)

    if (!isLast) {
      navigate(`/onboarding/${index + 2}`)
      return
    }

    try {
      await save.mutateAsync({
        saldoInicial: draft.saldoInicial ?? settings.data?.saldoInicial ?? 0,
        saldoRef: format(new Date(), 'yyyy-MM-dd'),
      })
    } catch (e) {
      console.error('[grand money] falha ao salvar settings', e)
      return // a mensagem de erro sai por save.isError
    }
    clearDraft()
    navigate('/', { replace: true })
  }

  function back() {
    writeDraft({ ...readDraft(), [current.key]: value })
    if (index === 0) navigate('/bem-vindo')
    else navigate(`/onboarding/${index}`)
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
        <Button full onClick={() => void next()} disabled={save.isPending}>
          {isLast
            ? save.isPending
              ? 'salvando…'
              : 'ver meu diário'
            : 'próximo'}
        </Button>
      }
      keypad={
        <NumericKeypad
          onDigit={(d) => setValue((v) => pushDigit(v, d))}
          onBackspace={() => setValue(popDigit)}
        />
      }
    >
      <h1
        key={current.key}
        className="animate-slide-in text-[2.1rem] leading-[1.08] font-bold tracking-tight lowercase sm:text-4xl"
      >
        {current.question}
      </h1>

      <div className="mt-8">
        <MoneyInput
          value={value}
          onChange={setValue}
          label={current.question}
          size="xl"
          underline
          autoFocus
        />
      </div>

      <p className="mt-6 pb-8 text-lg leading-snug text-ink-900/60">
        {current.help}
      </p>

      {save.isError && (
        <div role="alert" className="pb-8">
          <p className="text-base font-medium text-accent-600 lowercase">
            não deu pra salvar:
          </p>
          <pre className="mt-1 overflow-x-auto text-sm whitespace-pre-wrap text-accent-600/80">
            {errorMessage(save.error)}
          </pre>
        </div>
      )}
    </BrandScreen>
  )
}
