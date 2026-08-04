import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { useSaveSettings } from '../../hooks/useSettings'
import { clearDraft } from './draft'
import { errorMessage } from '../../lib/errors'

export function WelcomePage() {
  const navigate = useNavigate()
  const save = useSaveSettings()

  /** pular grava tudo zerado: sem settings o app volta pra cá em loop */
  async function skip() {
    if (save.isPending) return
    try {
      await save.mutateAsync({
        saldoInicial: 0,
        saldoRef: format(new Date(), 'yyyy-MM-dd'),
      })
    } catch (e) {
      console.error('[grand money] falha ao salvar settings', e)
      return // a mensagem de erro sai por save.isError
    }
    clearDraft()
    navigate('/', { replace: true })
  }

  return (
    <BrandScreen
      header={
        <button
          type="button"
          onClick={() => void skip()}
          aria-label="pular"
          className="-ml-2 grid size-10 place-items-center rounded-full transition-colors hover:bg-ink-900/8"
        >
          <X className="size-7" strokeWidth={2.25} />
        </button>
      }
      footer={
        <div className="flex flex-col gap-3">
          <Button full onClick={() => navigate('/onboarding/1')}>
            calcular previsão de diário
          </Button>
          <Button variant="outline" full onClick={skip} disabled={save.isPending}>
            calcular depois
          </Button>
        </div>
      }
    >
      <h1 className="text-[2.1rem] leading-[1.08] font-bold tracking-tight lowercase sm:text-4xl">
        que bom que você chegou! bora calcular quanto você pode gastar por dia?
      </h1>

      <p className="mt-6 text-lg leading-snug text-ink-900/60">
        é o seu limite diário, sem as contas fixas. uma previsão que funciona
        como um velocímetro de gastos para você se orientar.
      </p>

      {save.isError && (
        <div role="alert" className="mt-6">
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
