import { create } from 'zustand'

const EMPTY_FILTERS = {
  search: '',
  type: '',
  category_id: '',
  wallet_id: '',
  user_id: '',
  dateFrom: '',
  dateTo: '',
}

export const useTransactionStore = create((set) => ({
  filters: { ...EMPTY_FILTERS },
  page: 0,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, page: 0 })),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ filters: { ...EMPTY_FILTERS }, page: 0 }),
}))
