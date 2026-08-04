import type { StepKey } from './steps'

const KEY = 'onboarding:draft'

export type Draft = Partial<Record<StepKey, number>>

/** Guarda o rascunho entre os 5 passos para um refresh não zerar tudo. */
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
