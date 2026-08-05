import type { AuthError } from '@supabase/supabase-js'
import { errorMessage } from '../../lib/errors'

/** depois disso, desistir e devolver a tela ao usuário */
const LIMITE_MS = 20_000

const TEMPO_ESGOTADO =
  'a conexão travou no meio do caminho. confira a internet e tente de novo.'

/** As mensagens do Supabase vêm em inglês e cruas demais para uma tela de entrada. */
export function mensagemDeErro(erro: string): string {
  const m = erro.toLowerCase()
  if (m.includes('invalid login credentials')) return 'e-mail ou senha não conferem'
  if (m.includes('email not confirmed')) return 'confirme seu e-mail antes de entrar'
  if (m.includes('email logins are disabled')) return 'login por e-mail está desligado no supabase'
  if (m.includes('expired') || m.includes('link is invalid') || m.includes('access_denied'))
    return 'esse link expirou ou já foi usado. peça outro aqui.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'muitas tentativas seguidas. espere um minuto'
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'não consegui falar com o servidor. confira a internet e tente de novo.'
  return m
}

/**
 * Toda chamada de auth passa por aqui, e **sempre termina**: com sucesso, com
 * erro, ou com tempo esgotado. Duas coisas fora do controle do supabase-js
 * deixavam o botão preso em "entrando…" para sempre, sem mensagem nenhuma:
 *
 * - a promessa **rejeitar** — `signInWithPassword` relança o que não for erro
 *   de auth, inclusive o que um assinante de `onAuthStateChange` jogar;
 * - a promessa **nunca voltar** — um `fetch` pendurado (trocar de wi-fi para
 *   4G no meio do envio basta) não rejeita, e métodos que esperam o lock do
 *   supabase-js podem ficar na fila indefinidamente.
 *
 * Nos dois casos a única saída era recarregar a página, porque quem desliga o
 * "ocupado" é a linha depois do `await`, e ela nunca chegava a rodar.
 */
export async function chamarAuth(
  executar: () => Promise<{ error: AuthError | null }>,
): Promise<string | null> {
  let relogio: ReturnType<typeof setTimeout> | undefined

  try {
    const { error } = await Promise.race([
      executar(),
      new Promise<never>((_, rejeitar) => {
        relogio = setTimeout(() => rejeitar(new Error(TEMPO_ESGOTADO)), LIMITE_MS)
      }),
    ])
    return error ? mensagemDeErro(error.message) : null
  } catch (e) {
    return mensagemDeErro(errorMessage(e))
  } finally {
    clearTimeout(relogio)
  }
}
