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
  page: 0,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, page: 0 })),
  setPage: (page) => set({ page }),
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
      page: 0,
    }),
}))
