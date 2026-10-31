import { create } from 'zustand'

// App-wide entry points that any page can trigger (header buttons, envelope
// detail "Catat dari amplop ini", etc.). Layout renders the matching UI.
export const useUiStore = create((set) => ({
  txModalOpen: false,
  catatOpen: false,
  catatCategoryId: null,

  openTxModal: () => set({ txModalOpen: true, catatOpen: false }),
  closeTxModal: () => set({ txModalOpen: false }),
  openCatat: (categoryId = null) => set({ catatOpen: true, catatCategoryId: categoryId }),
  closeCatat: () => set({ catatOpen: false }),
}))
