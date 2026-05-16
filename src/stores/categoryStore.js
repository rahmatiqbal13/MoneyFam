import { create } from 'zustand'

export const useCategoryStore = create((set) => ({
  activeTab: 'expense',
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
