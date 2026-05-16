import { create } from 'zustand'

export const useTransactionStore = create((set) => ({
  filters: {
    search: '',
    type: '',
    category_id: '',
    wallet_id: '',
    dateFrom: '',
    dateTo: '',
  },
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () =>
    set({
      filters: {
        search: '',
        type: '',
        category_id: '',
        wallet_id: '',
        dateFrom: '',
        dateTo: '',
      },
    }),
}))
