import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, saveSettings } from '../repositories/settings'
import { queryKeys } from '../lib/queryClient'
import type { Settings } from '../domain/types'

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Omit<Settings, 'updatedAt'>>) =>
      saveSettings(patch),
    onSuccess: (settings) => {
      qc.setQueryData(queryKeys.settings, settings)
      qc.invalidateQueries({ queryKey: queryKeys.entries })
    },
  })
}
