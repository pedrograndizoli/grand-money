interface PostgrestLike {
  message?: string
  details?: string
  hint?: string
  code?: string
}

/**
 * App de uso pessoal: esconder a causa atrás de "algo deu errado" só custa
 * tempo de depuração. O erro cru vai para a tela.
 */
export function errorMessage(e: unknown): string {
  if (!e) return 'erro desconhecido'
  if (typeof e === 'string') return e

  const err = e as PostgrestLike
  const parts = [err.message, err.details, err.hint].filter(Boolean)
  const code = err.code ? ` [${err.code}]` : ''
  const texto = parts.length ? parts.join(' — ') : String(e)

  return `${texto}${code}`.toLowerCase()
}
