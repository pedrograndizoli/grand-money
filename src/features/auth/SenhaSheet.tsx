import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/cn'

const MINIMO = 6

const CAMPO = cn(
  'mt-1 w-full border-b border-line-dark bg-transparent py-2',
  'text-xl font-medium outline-none',
  'placeholder:font-normal placeholder:text-white/30 focus:border-white/45',
)

/**
 * Define ou troca a senha da conta que já está logada. Não cria usuário: o
 * `updateUser` mexe na mesma linha de `auth.users`, então o uuid — e tudo que
 * pende dele por `user_id` — continua o mesmo.
 */
export function SenhaSheet({ onClose }: { onClose: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const curta = senha.length > 0 && senha.length < MINIMO
  const diferente = confirma.length > 0 && confirma !== senha
  const valido = senha.length >= MINIMO && confirma === senha

  async function salvar() {
    if (!valido || salvando) return
    setSalvando(true)
    setErro(null)

    const { error } = await supabase.auth.updateUser({ password: senha })

    setSalvando(false)
    if (error) {
      setErro(error.message.toLowerCase())
      return
    }
    setPronto(true)
  }

  return (
    <Sheet open onClose={onClose} title="senha de acesso" tone="dark">
      <div className="px-6 pt-6 pb-8">
        {pronto ? (
          <>
            <p className="text-lg leading-snug lowercase">
              senha atualizada. dá para entrar com ela em qualquer aparelho, sem
              depender do link do e-mail.
            </p>
            <Button full className="mt-6" onClick={onClose}>
              fechar
            </Button>
          </>
        ) : (
          <>
            <label className="block text-xs font-semibold text-white/45 lowercase">
              nova senha
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={`mínimo ${MINIMO} caracteres`}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={CAMPO}
            />

            <label className="mt-6 block text-xs font-semibold text-white/45 lowercase">
              repita a senha
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="a mesma de novo"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              className={CAMPO}
            />

            <p className="mt-5 text-sm leading-snug text-white/45 lowercase">
              {curta
                ? `a senha precisa de pelo menos ${MINIMO} caracteres.`
                : diferente
                  ? 'as duas não estão iguais.'
                  : 'isso não cria conta nova: é a mesma conta, com mais um jeito de entrar. o link mágico continua funcionando.'}
            </p>

            <Button
              full
              className="mt-6"
              onClick={() => void salvar()}
              disabled={!valido || salvando}
            >
              {salvando ? 'salvando…' : 'salvar senha'}
            </Button>

            {erro && (
              <pre
                role="alert"
                className="mt-4 overflow-x-auto text-sm whitespace-pre-wrap text-accent-500"
              >
                {erro}
              </pre>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
