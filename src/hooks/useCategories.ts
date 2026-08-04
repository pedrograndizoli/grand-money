import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategories,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../repositories/categories'
import { queryKeys } from '../lib/queryClient'
import type { CategoryDraft } from '../domain/types'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
  })
}

function useCategoriesInvalidation() {
  const qc = useQueryClient()
  // mexer numa categoria muda a alocação inteira, que também lê lançamentos
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.categories })
    void qc.invalidateQueries({ queryKey: queryKeys.entries })
  }
}

export function useCreateCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: (draft: CategoryDraft) => createCategory(draft),
    onSuccess: invalidate,
  })
}

export function useCreateCategories() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: (drafts: CategoryDraft[]) => createCategories(drafts),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: CategoryDraft }) =>
      updateCategory(id, draft),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
  })
}
