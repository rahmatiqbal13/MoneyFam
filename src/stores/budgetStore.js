import { create } from 'zustand'
import { toDateStr } from '@/lib/utils'

export const useBudgetStore = create((set) => ({
  selectedMonth: toDateStr(new Date()).slice(0, 7), // YYYY-MM
  setSelectedMonth: (month) => set({ selectedMonth: month }),
}))
