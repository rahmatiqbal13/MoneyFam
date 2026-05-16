import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const TX_KEY = 'transactions'

const QUERY_KEY = 'savings_goals'

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

// Tambah/kurangi dana ke tabungan (atomic - BUG-004 fix)
export function useAddToSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, amount, walletId, goalName, categoryId }) => {
      // Use atomic RPC function to ensure data consistency
      const { error } = await supabase.rpc('add_to_savings_goal_atomic', {
        p_goal_id: id,
        p_amount: amount,
        p_wallet_id: walletId || null,
        p_category_id: categoryId || null,
        p_goal_name: goalName
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
