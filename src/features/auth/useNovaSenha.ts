import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export const MINIMO_SENHA = 6

/**
 * A regra da senha nova, uma vez só: o sheet do menu e a tela que o link de
 * recuperação abre pedem a mesma coisa, e se cada um validasse por conta
 * própria os dois mínimos acabariam diferentes.
 *
 * `updateUser` mexe na linha que já existe em `auth.users` — o uuid não muda, e
 * nada que pende dele por `user_id` se perde.
 */
export function useNovaSenha() {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const curta = senha.length > 0 && senha.length < MINIMO_SENHA
  const diferente = confirma.length > 0 && confirma !== senha
  const valido = senha.length >= MINIMO_SENHA && confirma === senha

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

  return {
    senha,
    setSenha,
    confirma,
    setConfirma,
    curta,
    diferente,
    valido,
    salvando,
    erro,
    pronto,
    salvar,
  }
}
