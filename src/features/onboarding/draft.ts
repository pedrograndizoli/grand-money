import type { CategoryDraft, Cents } from '../../domain/types'

const KEY = 'onboarding:draft'

export interface Draft {
  saldoInicial?: Cents
  /** categorias montadas nos passos 2 a 4, gravadas só no fim */
  categorias?: CategoryDraft[]
}

/** Guarda o rascunho entre os passos para um refresh não zerar tudo. */
export function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Draft) : {}
  } catch {
    return {}
  }
}

export function writeDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // modo privado sem storage: o onboarding ainda funciona sem refresh
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nada a limpar
  }
}
