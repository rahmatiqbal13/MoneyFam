import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const QUERY_KEY = 'wallets'

export function useWallets() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      let query = supabase
        .from('wallets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      
      // If user has family, get family wallets
      // Otherwise, get personal wallets (user_id = current user)
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      const insertData = {
        ...data,
        user_id: user.id,
        balance: data.initial_balance || 0,
      }
      
      // Only add family_id if user has a family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      const { error } = await supabase.from('wallets').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const allowedFields = ['name', 'icon', 'type', 'balance', 'is_active']
      const updateData = {}
      for (const key of allowedFields) {
        if (key in data) updateData[key] = data[key]
      }
      updateData.updated_at = new Date().toISOString()

      let query = supabase.from('wallets').update(updateData).eq('id', id)
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteWallet() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      // Check if wallet has any transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('wallet_id', id)
        .limit(1)
      
      if (txError) throw txError
      
      if (transactions && transactions.length > 0) {
        throw new Error('Tidak dapat menghapus kantong yang memiliki transaksi. Hapus atau pindahkan transaksi terlebih dahulu.')
      }
      
      // Check if wallet is target of any transfers
      const { data: transfers, error: transferError } = await supabase
        .from('transactions')
        .select('id')
        .eq('to_wallet_id', id)
        .limit(1)
      
      if (transferError) throw transferError
      
      if (transfers && transfers.length > 0) {
        throw new Error('Tidak dapat menghapus kantong yang menjadi tujuan transfer. Selesaikan transfer terlebih dahulu.')
      }
      
      let query = supabase.from('wallets').delete().eq('id', id)
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useTransferBetweenWallets() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ from_wallet_id, to_wallet_id, amount, date, note }) => {
      if (from_wallet_id === to_wallet_id) {
        throw new Error('Kantong asal dan tujuan tidak boleh sama.')
      }
      if (Number(amount) <= 0) {
        throw new Error('Jumlah transfer harus lebih besar dari 0.')
      }

      // Check balance before transfer (defense-in-depth)
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance, name')
        .eq('id', from_wallet_id)
        .single()
      
      if (walletError) throw walletError
      
      if (Number(wallet.balance) < Number(amount)) {
        throw new Error(`Saldo tidak cukup di kantong "${wallet.name}". Saldo: ${wallet.balance}, Dibutuhkan: ${amount}`)
      }
      
      // Insert as a transaction with type='transfer' so the DB trigger handles
      // balance updates automatically and transfers appear in the transaction list.
      const insertData = {
        user_id: user.id,
        wallet_id: from_wallet_id,
        to_wallet_id,
        type: 'transfer',
        amount,
        date,
        description: note || 'Transfer antar kantong',
        note,
      }
      
      // Only add family_id if user has a family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      const { error } = await supabase.from('transactions').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
