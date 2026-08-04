import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEntry,
  deleteEntry,
  listEntries,
  updateEntry,
} from '../repositories/entries'
import { queryKeys } from '../lib/queryClient'
import type { EntryDraft } from '../domain/types'

export function useEntries() {
  return useQuery({
    queryKey: queryKeys.entries,
    queryFn: listEntries,
  })
}

function useEntriesInvalidation() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.entries })
}

export function useCreateEntry() {
  const invalidate = useEntriesInvalidation()
  return useMutation({
    mutationFn: (draft: EntryDraft) => createEntry(draft),
    onSuccess: invalidate,
  })
}

export function useUpdateEntry() {
  const invalidate = useEntriesInvalidation()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: EntryDraft }) =>
      updateEntry(id, draft),
    onSuccess: invalidate,
  })
}

export function useDeleteEntry() {
  const invalidate = useEntriesInvalidation()
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: invalidate,
  })
}
