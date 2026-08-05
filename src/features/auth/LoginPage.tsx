import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { supabase } from '../../lib/supabase'
import { APP } from '../../config/app'
import { lerRetornoDoLink } from './callback'
import { chamarAuth, mensagemDeErro } from './chamada'
import { useSession } from './sessionContext'

type Envio = 'link' | 'reset'
type Ocupado = 'senha' | 'link' | 'reset'

const AVISO_CODIGO_ORFAO =
  'esse link foi aberto num navegador diferente do que pediu ele, então não deu para usar. peça outro aqui e abra no mesmo aparelho.'

const CAMPO =
  'w-full border-b border-ink-900/15 bg-transparent py-2 text-2xl font-medium tracking-tight outline-none placeholder:text-ink-900/30 focus:border-ink-900/50'

/** para onde ir depois de entrar: de volta ao que o `RequireAuth` interrompeu */
function destinoDe(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : '/'
}

/**
 * Senha é o caminho principal: o link mágico só abre no aparelho onde você
 * toca nele, e isso trava quem quer entrar num segundo aparelho. Os dois
 * métodos valem para o mesmo usuário — senha não substitui o link, soma.
 */
export function LoginPage() {
  const location = useLocation()
  const { session } = useSession()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviado, setEnviado] = useState<Envio | null>(null)
  const [ocupado, setOcupado] = useState<Ocupado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [entrou, setEntrou] = useState(false)

  // por que você caiu aqui: o `RequireAuth` repassa o que voltou do link
  const [avisoDoLink, setAvisoDoLink] = useState(() => {
    const { erro: falha, codigoOrfao } = lerRetornoDoLink(
      location.search,
      location.hash,
    )
    if (falha) return mensagemDeErro(falha)
    return codigoOrfao ? AVISO_CODIGO_ORFAO : null
  })

  const header = (
    <p className="text-sm font-semibold tracking-[0.18em] text-ink-900/45 uppercase">
      {APP.name}
    </p>
  )

  async function entrarComSenha(e: FormEvent) {
    e.preventDefault()
    if (ocupado) return
    // o botão não fica mais cinza sem explicar: campo vazio vira mensagem
    if (!email.trim() || !senha) {
      setErro('digite seu e-mail e a senha')
      return
    }

    setOcupado('senha')
    setErro(null)
    setAvisoDoLink(null)

    const falha = await chamarAuth(() =>
      supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      }),
    )

    if (falha) {
      setOcupado(null)
      setErro(falha)
      return
    }
    // `ocupado` segue ligado de propósito: a tela só sai daqui quando a sessão
    // chegar no provider, e até lá o botão continua dizendo "entrando…"
    setEntrou(true)
  }

  async function enviarLink() {
    if (ocupado) return
    if (!email.trim()) {
      setErro('digite seu e-mail primeiro')
      return
    }

    setOcupado('link')
    setErro(null)
    setAvisoDoLink(null)

    const falha = await chamarAuth(() =>
      supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      }),
    )

    setOcupado(null)
    if (falha) setErro(falha)
    else setEnviado('link')
  }

  /**
   * O pedido precisa sair **daqui**: é o que guarda o code verifier neste
   * navegador. Um e-mail de recuperação disparado pelo painel do Supabase cai
   * numa URL que o supabase-js não consegue trocar por sessão, e o app
   * descarta em silêncio.
   */
  async function esqueciSenha() {
    if (ocupado) return
    if (!email.trim()) {
      setErro('digite seu e-mail primeiro')
      return
    }

    setOcupado('reset')
    setErro(null)
    setAvisoDoLink(null)

    const falha = await chamarAuth(() =>
      supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/nova-senha`,
      }),
    )

    setOcupado(null)
    if (falha) setErro(falha)
    else setEnviado('reset')
  }

  /**
   * Entrar dava certo e a tela continuava aqui: o `RequireAuth` só age nas
   * rotas que ele embrulha, e `/entrar` não é uma delas. Do lado de fora, o
   * botão parecia morto justamente quando a senha estava certa.
   *
   * A saída espera a sessão chegar ao provider — sair antes disso mandaria o
   * `RequireAuth` devolver o usuário para cá.
   */
  if (entrou && session) return <Navigate to={destinoDe(location.state)} replace />

  if (enviado) {
    return (
      <BrandScreen
        header={header}
        footer={
          <Button variant="outline" full onClick={() => setEnviado(null)}>
            voltar
          </Button>
        }
      >
        <Mail className="mb-6 size-10" strokeWidth={1.75} aria-hidden />
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          olha seu e-mail
        </h1>
        <p className="mt-5 text-lg leading-snug text-ink-900/60">
          mandamos um link{enviado === 'reset' && ' para trocar a senha'} para{' '}
          <span className="font-medium text-ink-900">{email}</span>. abra{' '}
          <span className="font-medium text-ink-900">neste mesmo navegador</span>
          : é aqui que ele foi pedido, e só aqui ele abre.
        </p>
      </BrandScreen>
    )
  }

  return (
    <form onSubmit={(e) => void entrarComSenha(e)} className="contents">
      <BrandScreen
        header={header}
        footer={
          <div className="flex flex-col gap-3">
            <Button type="submit" full disabled={ocupado !== null}>
              {ocupado === 'senha' ? 'entrando…' : 'entrar'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              full
              onClick={() => void enviarLink()}
              disabled={ocupado !== null}
            >
              {ocupado === 'link' ? 'enviando…' : 'receber um link por e-mail'}
            </Button>
          </div>
        }
      >
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          seu limite diário,
          <br />
          em qualquer aparelho
        </h1>

        {avisoDoLink && (
          <p
            role="alert"
            className="mt-6 rounded-2xl bg-ink-900/8 px-4 py-3 text-base leading-snug text-ink-900/75"
          >
            {avisoDoLink}
          </p>
        )}

        <label className="mt-10 block">
          <span className="sr-only">e-mail</span>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CAMPO}
          />
        </label>

        <label className="mt-6 block">
          <span className="sr-only">senha</span>
          <PasswordInput
            autoComplete="current-password"
            placeholder="sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={CAMPO}
          />
        </label>

        <button
          type="button"
          onClick={() => void esqueciSenha()}
          disabled={ocupado !== null}
          className="mt-5 text-base font-medium text-ink-900/60 underline underline-offset-4 hover:text-ink-900 disabled:opacity-50"
        >
          {ocupado === 'reset' ? 'enviando…' : 'esqueci minha senha'}
        </button>

        {erro && (
          <p role="alert" className="mt-5 text-base font-medium text-accent-600">
            {erro}
          </p>
        )}
      </BrandScreen>
    </form>
  )
}
