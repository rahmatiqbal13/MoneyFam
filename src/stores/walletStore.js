import { create } from 'zustand'

export const useWalletStore = create((set) => ({
  selectedWallet: null,
  setSelectedWallet: (wallet) => set({ selectedWallet: wallet }),
}))
