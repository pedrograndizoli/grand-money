import type { CategoryDraft, CategoryType, Cents } from '../../domain/types'

export interface CategoryForm {
  nome: string
  valor: Cents
  /** só em 'fixa' */
  dia: number | null
}

/** Qual campo o teclado numérico alimenta: em touch não existe foco de input. */
export type NumericTarget = 'valor' | 'dia'

export const emptyForm: CategoryForm = { nome: '', valor: 0, dia: null }

/**
 * Nome é o único obrigatório. Valor previsto é uma previsão — energia varia, e
 * exigir um número aqui empurraria o usuário a inventar um.
 */
export function isFilled(form: CategoryForm): boolean {
  return form.nome.trim().length > 0
}

export function toDraft(form: CategoryForm, tipo: CategoryType): CategoryDraft {
  return {
    nome: form.nome.trim(),
    tipo,
    valorPrevisto: form.valor,
    diaVencimento: tipo === 'fixa' ? form.dia : null,
    metaTotal: null,
    cor: null,
  }
}

/** "3" e depois "1" viram dia 31; o que passaria de 31 recomeça no dígito novo. */
export function pushDay(dia: number | null, digit: number): number | null {
  const next = (dia ?? 0) * 10 + digit
  if (next >= 1 && next <= 31) return next
  return digit >= 1 ? digit : dia
}

export function popDay(dia: number | null): number | null {
  const next = Math.floor((dia ?? 0) / 10)
  return next === 0 ? null : next
}

/** Máscara do input de dia no desktop: 2 dígitos, teto em 31. */
export function parseDay(input: string): number | null {
  const digits = input.replace(/\D/g, '').slice(0, 2)
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return n < 1 ? null : Math.min(n, 31)
}
