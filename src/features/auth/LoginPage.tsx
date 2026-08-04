import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { BrandScreen } from '../../components/layout/BrandScreen'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { APP } from '../../config/app'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || sending) return

    setSending(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    setSending(false)
    if (error) setError(error.message.toLowerCase())
    else setSent(true)
  }

  const header = (
    <p className="text-sm font-semibold tracking-[0.18em] text-ink-900/45 uppercase">
      {APP.name}
    </p>
  )

  if (sent) {
    return (
      <BrandScreen
        header={header}
        footer={
          <Button
            variant="outline"
            full
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            usar outro e-mail
          </Button>
        }
      >
        <Mail className="mb-6 size-10" strokeWidth={1.75} aria-hidden />
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          olha seu e-mail
        </h1>
        <p className="mt-5 text-lg leading-snug text-ink-900/60">
          mandamos um link para <span className="font-medium text-ink-900">{email}</span>.
          abre ele neste mesmo aparelho e pronto — sem senha nenhuma.
        </p>
      </BrandScreen>
    )
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      <BrandScreen
        header={header}
        footer={
          <Button type="submit" full disabled={!email.trim() || sending}>
            {sending ? 'enviando…' : 'entrar'}
          </Button>
        }
      >
        <h1 className="text-4xl leading-[1.08] font-bold tracking-tight lowercase">
          seu limite diário,
          <br />
          nos dois aparelhos
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
            className="w-full border-b border-ink-900/15 bg-transparent py-2 text-2xl font-medium tracking-tight outline-none placeholder:text-ink-900/30 focus:border-ink-900/50"
          />
        </label>

        <p className="mt-5 text-base leading-snug text-ink-900/60">
          a gente manda um link mágico. sem senha, sem cadastro, sem recuperação
          de conta pra você esquecer depois.
        </p>

        {error && (
          <p role="alert" className="mt-5 text-base font-medium text-accent-600">
            {error}
          </p>
        )}
      </BrandScreen>
    </form>
  )
}
