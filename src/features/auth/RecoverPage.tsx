import { useNavigate } from 'react-router-dom'
import { KeyRound, LinkIcon } from 'lucide-react'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Splash } from '../../components/layout/Splash'
import { APP } from '../../config/app'
import { useSession } from './sessionContext'
import { useNovaSenha, MINIMO_SENHA } from './useNovaSenha'

const CAMPO =
  'w-full border-b border-ink-900/15 bg-transparent py-2 text-2xl font-medium tracking-tight outline-none placeholder:text-ink-900/30 focus:border-ink-900/50'

/**
 * Onde o link de redefinição cai (`/nova-senha`). O link vem com um `?code=`
 * que o supabase-js troca por sessão sozinho — mas só neste navegador, o que
 * pediu o link. Aberto em outro, não há sessão nenhuma para trocar a senha, e
 * a tela precisa dizer isso em vez de fingir um formulário que vai falhar.
 */
export function RecoverPage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const f = useNovaSenha()

  const header = (
    <p className="text-sm font-semibold tracking-[0.18em] text-ink-900/45 uppercase">
      {APP.name}
    </p>
  )

  if (loading) return <Splash />

  if (!session) {
    return (
      <BrandScreen
        header={header}
        footer={
          <Button full onClick={() => void navigate('/entrar', { replace: true })}>
            pedir outro link
          </Button>
        }
      >
        <LinkIcon className="mb-6 size-10" strokeWidth={1.75} aria-hidden />
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          esse link não vale aqui
        </h1>
        <p className="mt-5 text-lg leading-snug text-ink-900/60">
          ou ele já foi usado, ou expirou, ou foi aberto num navegador diferente
          do que pediu — é assim que ele protege a conta. peça outro e abra no
          mesmo aparelho onde pedir.
        </p>
      </BrandScreen>
    )
  }

  if (f.pronto) {
    return (
      <BrandScreen
        header={header}
        footer={
          <Button full onClick={() => void navigate('/', { replace: true })}>
            ir para o app
          </Button>
        }
      >
        <KeyRound className="mb-6 size-10" strokeWidth={1.75} aria-hidden />
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          senha trocada
        </h1>
        <p className="mt-5 text-lg leading-snug text-ink-900/60">
          agora dá para entrar com ela em qualquer aparelho, sem depender do
          e-mail.
        </p>
      </BrandScreen>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void f.salvar()
      }}
      className="contents"
    >
      <BrandScreen
        header={header}
        footer={
          <Button type="submit" full disabled={!f.valido || f.salvando}>
            {f.salvando ? 'salvando…' : 'salvar senha'}
          </Button>
        }
      >
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          escolha uma
          <br />
          senha nova
        </h1>

        <label className="mt-10 block">
          <span className="sr-only">nova senha</span>
          <PasswordInput
            autoFocus
            autoComplete="new-password"
            placeholder={`mínimo ${MINIMO_SENHA} caracteres`}
            value={f.senha}
            onChange={(e) => f.setSenha(e.target.value)}
            className={CAMPO}
          />
        </label>

        <label className="mt-6 block">
          <span className="sr-only">repita a senha</span>
          <PasswordInput
            autoComplete="new-password"
            placeholder="a mesma de novo"
            value={f.confirma}
            onChange={(e) => f.setConfirma(e.target.value)}
            className={CAMPO}
          />
        </label>

        <p className="mt-5 text-base leading-snug text-ink-900/60">
          {f.curta
            ? `a senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`
            : f.diferente
              ? 'as duas não estão iguais.'
              : 'é a mesma conta de sempre: trocar a senha não mexe em nada do que você já lançou.'}
        </p>

        {f.erro && (
          <p role="alert" className="mt-5 text-base font-medium text-accent-600">
            {f.erro}
          </p>
        )}
      </BrandScreen>
    </form>
  )
}
