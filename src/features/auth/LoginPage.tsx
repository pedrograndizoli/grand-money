import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { supabase } from '../../lib/supabase'
import { APP } from '../../config/app'
import { lerRetornoDoLink } from './callback'

type Envio = 'link' | 'reset'
type Ocupado = 'senha' | 'link' | 'reset'

const AVISO_CODIGO_ORFAO =
  'esse link foi aberto num navegador diferente do que pediu ele, então não deu para usar. peça outro aqui e abra no mesmo aparelho.'

const CAMPO =
  'w-full border-b border-ink-900/15 bg-transparent py-2 text-2xl font-medium tracking-tight outline-none placeholder:text-ink-900/30 focus:border-ink-900/50'

/** As mensagens do Supabase vêm em inglês e cruas demais para uma tela de entrada. */
function mensagemDeErro(erro: string): string {
  const m = erro.toLowerCase()
  if (m.includes('invalid login credentials')) return 'e-mail ou senha não conferem'
  if (m.includes('email not confirmed')) return 'confirme seu e-mail antes de entrar'
  if (m.includes('email logins are disabled')) return 'login por e-mail está desligado no supabase'
  if (m.includes('expired') || m.includes('link is invalid') || m.includes('access_denied'))
    return 'esse link expirou ou já foi usado. peça outro aqui.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'muitas tentativas seguidas. espere um minuto'
  return m
}

/**
 * Senha é o caminho principal: o link mágico só abre no aparelho onde você
 * toca nele, e isso trava quem quer entrar num segundo aparelho. Os dois
 * métodos valem para o mesmo usuário — senha não substitui o link, soma.
 */
export function LoginPage() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviado, setEnviado] = useState<Envio | null>(null)
  const [ocupado, setOcupado] = useState<Ocupado | null>(null)
  const [erro, setErro] = useState<string | null>(null)

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
    if (!email.trim() || !senha || ocupado) return

    setOcupado('senha')
    setErro(null)
    setAvisoDoLink(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    setOcupado(null)
    // no sucesso não há o que fazer aqui: a sessão muda e o RequireAuth entra
    if (error) setErro(mensagemDeErro(error.message))
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

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    setOcupado(null)
    if (error) setErro(mensagemDeErro(error.message))
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

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    })

    setOcupado(null)
    if (error) setErro(mensagemDeErro(error.message))
    else setEnviado('reset')
  }

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
            <Button
              type="submit"
              full
              disabled={!email.trim() || !senha || ocupado !== null}
            >
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
