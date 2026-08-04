import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { APP } from '../../config/app'

const CAMPO =
  'w-full border-b border-ink-900/15 bg-transparent py-2 text-2xl font-medium tracking-tight outline-none placeholder:text-ink-900/30 focus:border-ink-900/50'

/** As mensagens do Supabase vêm em inglês e cruas demais para uma tela de entrada. */
function mensagemDeErro(erro: string): string {
  const m = erro.toLowerCase()
  if (m.includes('invalid login credentials')) return 'e-mail ou senha não conferem'
  if (m.includes('email not confirmed')) return 'confirme seu e-mail antes de entrar'
  if (m.includes('email logins are disabled')) return 'login por e-mail está desligado no supabase'
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
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState<'senha' | 'link' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

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

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    setOcupado(null)
    if (error) setErro(mensagemDeErro(error.message))
    else setEnviado(true)
  }

  if (enviado) {
    return (
      <BrandScreen
        header={header}
        footer={
          <Button variant="outline" full onClick={() => setEnviado(false)}>
            voltar
          </Button>
        }
      >
        <Mail className="mb-6 size-10" strokeWidth={1.75} aria-hidden />
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          olha seu e-mail
        </h1>
        <p className="mt-5 text-lg leading-snug text-ink-900/60">
          mandamos um link para{' '}
          <span className="font-medium text-ink-900">{email}</span>. ele só entra
          no aparelho onde você tocar nele — se for outro, volte e use a senha.
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
          <input
            type="password"
            autoComplete="current-password"
            placeholder="sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={CAMPO}
          />
        </label>

        <p className="mt-5 text-base leading-snug text-ink-900/60">
          esqueceu a senha? peça o link por e-mail, entre por ele e troque a
          senha no menu.
        </p>

        {erro && (
          <p role="alert" className="mt-5 text-base font-medium text-accent-600">
            {erro}
          </p>
        )}
      </BrandScreen>
    </form>
  )
}
