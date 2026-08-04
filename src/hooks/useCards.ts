import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCard, listCards, updateCard } from '../repositories/cards'
import { queryKeys } from '../lib/queryClient'
import type { CardDraft } from '../domain/types'

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: listCards,
  })
}

function useCardsInvalidation() {
  const qc = useQueryClient()
  // o teto do cartão é lido junto com os lançamentos do mês
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.cards })
    void qc.invalidateQueries({ queryKey: queryKeys.entries })
  }
}

export function useCreateCard() {
  const invalidate = useCardsInvalidation()
  return useMutation({
    mutationFn: (draft: CardDraft) => createCard(draft),
    onSuccess: invalidate,
  })
}

export function useUpdateCard() {
  const invalidate = useCardsInvalidation()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: CardDraft }) =>
      updateCard(id, draft),
    onSuccess: invalidate,
  })
}
