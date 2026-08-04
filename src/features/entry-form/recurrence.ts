import type { Recurrence } from '../../domain/types'

export const RECURRENCES: ReadonlyArray<{
  value: Recurrence
  label: string
  description: string
}> = [
  {
    value: 'nenhuma',
    label: 'não repete',
    description: 'acontece uma vez só, nessa data',
  },
  {
    value: 'mensal',
    label: 'mensalmente',
    description: 'repete o mesmo valor mensalmente',
  },
  {
    value: 'semanal',
    label: 'semanalmente',
    description: 'repete o mesmo valor semanalmente',
  },
  {
    value: 'diaria',
    label: 'diariamente',
    description: 'repete o mesmo valor diariamente',
  },
  {
    value: 'parcelado',
    label: 'parcelado',
    description: 'divide o valor pelo número de parcelas',
  },
]

export function recurrenceLabel(value: Recurrence): string {
  return RECURRENCES.find((r) => r.value === value)?.label ?? 'não repete'
}
