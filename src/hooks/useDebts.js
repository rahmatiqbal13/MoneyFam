import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const TX_KEY = 'transactions'

const QUERY_KEY = 'debts'

export function useDebts() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      let query = supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Filter by family if exists, otherwise by user
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
    staleTime: 1000 * 30,
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      const insertData = {
        ...data,
        user_id: user.id,
        remaining_amount: data.amount,
      }
      
      // Add family_id only if user has family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      const { error } = await supabase.from('debts').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase
        .from('debts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

// Mark debt as paid atomically (BUG-005 fix)
export function useMarkDebtPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, remainingAmount, walletId, debtName, categoryId }) => {
      if (remainingAmount > 0) {
        // Use atomic RPC function
        const { error } = await supabase.rpc('mark_debt_paid_atomic', {
          p_debt_id: id,
          p_wallet_id: walletId || null,
          p_category_id: categoryId || null,
          p_amount: remainingAmount
        })
        if (error) throw error
      } else {
        // No payment needed, just mark as paid
        const { error } = await supabase
          .from('debts')
          .update({ is_paid: true, remaining_amount: 0, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Catat pembayaran sebagian atomically (BUG-005 fix)
export function usePayDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payAmount, walletId, debtName, categoryId }) => {
      // Use atomic RPC function
      const { error } = await supabase.rpc('pay_debt_atomic', {
        p_debt_id: id,
        p_payment_amount: payAmount,
        p_wallet_id: walletId || null,
        p_category_id: categoryId || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}
