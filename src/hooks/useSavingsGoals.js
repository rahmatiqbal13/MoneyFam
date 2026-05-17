import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const TX_KEY = 'transactions'
const QUERY_KEY = 'savings_goals'
const PAYMENTS_KEY = 'savings_payments'

export function useSavingsGoals() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      let query = supabase
        .from('savings_goals')
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

export function useSavingsPayments(goalId) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, goalId],
    queryFn: async () => {
      if (!goalId) return []
      
      const { data, error } = await supabase
        .from('savings_goal_payments')
        .select(`
          *,
          wallets:wallet_id(id, name, icon),
          categories:category_id(id, name, icon)
        `)
        .eq('goal_id', goalId)
        .order('payment_date', { ascending: false })
        .order('payment_time', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!goalId,
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      const insertData = {
        ...data,
        user_id: user.id,
      }
      
      // Add family_id only if user has family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      const { error } = await supabase.from('savings_goals').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase
        .from('savings_goals')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

// Add payment to savings goal with optional wallet
export function useAddSavingsPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      goalId, 
      amount, 
      type,
      paymentDate, 
      paymentTime,
      walletId, 
      categoryId, 
      note 
    }) => {
      const { data, error } = await supabase.rpc('add_savings_payment', {
        p_goal_id: goalId,
        p_amount: amount,
        p_type: type,
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
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.goalId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Update savings payment
export function useUpdateSavingsPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      goalId,
      amount, 
      paymentDate, 
      paymentTime,
      note 
    }) => {
      const { error } = await supabase.rpc('update_savings_payment', {
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
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.goalId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Delete savings payment
export function useDeleteSavingsPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ paymentId, goalId }) => {
      const { error } = await supabase.rpc('delete_savings_payment', {
        p_payment_id: paymentId
      })
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, variables.goalId] })
      queryClient.invalidateQueries({ queryKey: [TX_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

// Legacy function - now uses add_savings_payment
export function useAddToSavingsGoal() {
  return useAddSavingsPayment()
}
