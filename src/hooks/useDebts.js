import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const TX_KEY = 'transactions'
const QUERY_KEY = 'debts'
const PAYMENTS_KEY = 'debt_payments'

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

export function useDebtPayments(debtId) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, debtId],
    queryFn: async () => {
      if (!debtId) return []
      
      const { data, error } = await supabase
        .from('debt_payments')
        .select(`
          *,
          wallets:wallet_id(id, name, icon),
          categories:category_id(id, name, icon)
        `)
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false })
        .order('payment_time', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!debtId,
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

// Add payment to debt with optional wallet
export function useAddDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      debtId, 
      amount, 
      paymentDate, 
      paymentTime,
      walletId, 
      categoryId, 
      note 
    }) => {
      const { data, error } = await supabase.rpc('add_debt_payment', {
        p_debt_id: debtId,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_payment_time: paymentTime,
        p_wallet_id: walletId || null,
        p_category_id: categoryId || null,
        p_note: note || null
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.debtId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Update debt payment
export function useUpdateDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      debtId,
      amount, 
      paymentDate, 
      paymentTime,
      note 
    }) => {
      const { error } = await supabase.rpc('update_debt_payment', {
        p_payment_id: paymentId,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_payment_time: paymentTime,
        p_note: note || null
      })
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.debtId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Delete debt payment
export function useDeleteDebtPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ paymentId, debtId }) => {
      const { error } = await supabase.rpc('delete_debt_payment', {
        p_payment_id: paymentId
      })
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.debtId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Mark debt as paid with payment history
export function useMarkDebtPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      remainingAmount, 
      paymentDate,
      paymentTime,
      walletId, 
      categoryId, 
      note 
    }) => {
      if (remainingAmount > 0) {
        // Use new function that creates payment history
        const { data, error } = await supabase.rpc('mark_debt_paid_with_payment', {
          p_debt_id: id,
          p_payment_date: paymentDate,
          p_payment_time: paymentTime,
          p_wallet_id: walletId || null,
          p_category_id: categoryId || null,
          p_note: note || 'Pelunasan'
        })
        if (error) throw error
        return data
      } else {
        // Already paid, just mark
        const { error } = await supabase
          .from('debts')
          .update({ is_paid: true, remaining_amount: 0, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.id] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Legacy function for partial payments - now uses add_debt_payment
export function usePayDebt() {
  return useAddDebtPayment()
}
