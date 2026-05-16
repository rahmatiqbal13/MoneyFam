import { create } from 'zustand'

export const useBudgetStore = create((set) => ({
  selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  setSelectedMonth: (month) => set({ selectedMonth: month }),
}))
