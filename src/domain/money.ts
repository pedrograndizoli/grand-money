import type { Cents } from './types'

/** U+2212. O hífen do teclado é estreito demais ao lado de dígitos tabulares. */
const MINUS = '−'

const nf = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 123456 -> "1.234,56" (sem sinal, sem prefixo) */
export function formatCents(cents: Cents): string {
  return nf.format(Math.abs(cents) / 100)
}

/** 123456 -> "R$ 1.234,56" · -2332 -> "R$ −23,32" */
export function formatBRL(cents: Cents): string {
  return `R$ ${cents < 0 ? MINUS : ''}${formatCents(cents)}`
}

/** Assina explicitamente: usado em totais, onde +/− carrega informação. */
export function formatSigned(cents: Cents): string {
  if (cents === 0) return formatBRL(0)
  return `${cents < 0 ? MINUS : '+'}R$ ${formatCents(cents)}`
}

/**
 * Máscara de centavos: acumula dígitos da direita para a esquerda, como
 * caixa de supermercado. "1" -> 1 centavo, "12345" -> R$ 123,45.
 */
export function parseBRL(input: string): Cents {
  const digits = input.replace(/\D/g, '').slice(0, 11)
  if (!digits) return 0
  return Number.parseInt(digits, 10)
}

/** Teclado numérico: empurra um dígito pela direita. R$ 1,23 + "4" = R$ 12,34 */
export function pushDigit(cents: Cents, digit: number): Cents {
  const next = cents * 10 + digit
  return next > 99_999_999_99 ? cents : next
}

/** Teclado numérico: apaga o último dígito. */
export function popDigit(cents: Cents): Cents {
  return Math.floor(cents / 10)
}

/**
 * Divide um total em n parcelas sem perder centavo: a sobra vai na primeira,
 * que é como as maquininhas fazem.
 */
export function splitCents(total: Cents, n: number): Cents[] {
  if (n < 1) return [total]
  const base = Math.floor(total / n)
  const rest = total - base * n
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + rest : base))
}
