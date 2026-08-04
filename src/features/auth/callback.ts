/**
 * O que sobra na URL quando se volta de um link de e-mail.
 *
 * O supabase-js devolve erro ora no fragmento (`#error=…`, fluxo implícito),
 * ora na query — depende de onde o link morreu. E existe um terceiro caso, que
 * é o mais traiçoeiro: um `?code=` que o próprio supabase-js **ignora em
 * silêncio** quando não acha o code verifier no localStorage deste navegador.
 * Sem isso aqui, esse caso vira uma tela de login em branco, sem explicação.
 */
export interface RetornoDoLink {
  erro: string | null
  /** veio código, mas este navegador não é o que pediu o link */
  codigoOrfao: boolean
}

export function lerRetornoDoLink(
  search: string,
  hash: string,
): RetornoDoLink {
  const query = new URLSearchParams(search)
  const frag = new URLSearchParams(hash.replace(/^#/, ''))
  const ler = (chave: string) => query.get(chave) ?? frag.get(chave)

  const descricao = ler('error_description')
  const codigo = ler('error_code') ?? ler('error')

  return {
    erro: descricao ? descricao.replace(/\+/g, ' ').toLowerCase() : codigo,
    codigoOrfao: Boolean(ler('code')) && !descricao && !codigo,
  }
}
