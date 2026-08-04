import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

export const queryKeys = {
  settings: ['settings'] as const,
  categories: ['categories'] as const,
  cards: ['cards'] as const,
  /**
   * Uma chave só para todos os lançamentos. Chave por mês seria errada:
   * um lançamento mensal criado em janeiro muda a projeção de todo mês
   * seguinte, então qualquer mutação invalida o conjunto inteiro.
   */
  entries: ['entries'] as const,
}
