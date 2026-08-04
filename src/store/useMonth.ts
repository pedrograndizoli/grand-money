import { addMonths, startOfMonth } from 'date-fns'
import { create } from 'zustand'

interface MonthState {
  /** sempre o primeiro dia do mês visível */
  month: Date
  next: () => void
  prev: () => void
  goToToday: () => void
  setMonth: (date: Date) => void
}

export const useMonth = create<MonthState>((set) => ({
  month: startOfMonth(new Date()),
  next: () => set((s) => ({ month: addMonths(s.month, 1) })),
  prev: () => set((s) => ({ month: addMonths(s.month, -1) })),
  goToToday: () => set({ month: startOfMonth(new Date()) }),
  setMonth: (date) => set({ month: startOfMonth(date) }),
}))
