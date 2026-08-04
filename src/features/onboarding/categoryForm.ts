import type { CategoryDraft, CategoryType, Cents } from '../../domain/types'

export interface CategoryForm {
  nome: string
  /** em 'meta' este valor é o total a juntar, não o mensal */
  valor: Cents
  /** só em 'fixa' */
  dia: number | null
  /** só em 'fixa': a conta vem todo mês, mas o valor muda */
  estimado: boolean
  /** só em 'meta': o prazo, YYYY-MM-DD */
  dataFinal: string | null
}

/** Qual campo o teclado numérico alimenta: em touch não existe foco de input. */
export type NumericTarget = 'valor' | 'dia'

export const emptyForm: CategoryForm = {
  nome: '',
  valor: 0,
  dia: null,
  estimado: false,
  dataFinal: null,
}

/**
 * Nome é o único obrigatório em fixa e flexível. Valor previsto ali é uma
 * previsão — energia varia, e exigir um número empurraria o usuário a inventar
 * um. Na meta é o contrário: sem total e sem prazo não há de onde tirar o
 * quanto por mês, então os dois são obrigatórios.
 */
export function isFilled(form: CategoryForm, tipo: CategoryType): boolean {
  if (form.nome.trim().length === 0) return false
  if (tipo !== 'meta') return true
  return form.valor > 0 && form.dataFinal !== null
}

export function toDraft(form: CategoryForm, tipo: CategoryType): CategoryDraft {
  const meta = tipo === 'meta'
  return {
    nome: form.nome.trim(),
    tipo,
    // na meta o mensal é calculado: o que o usuário digita é o total
    valorPrevisto: meta ? 0 : form.valor,
    valorEstimado: tipo === 'fixa' && form.estimado,
    diaVencimento: tipo === 'fixa' ? form.dia : null,
    metaTotal: meta ? form.valor : null,
    dataFinal: meta ? form.dataFinal : null,
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
