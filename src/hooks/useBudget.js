import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const QUERY_KEY = 'budgets'

export function useBudgets(yearMonth) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id, yearMonth],
    queryFn: async () => {
      if (!user?.id || !yearMonth) return []
      const [year, month] = yearMonth.split('-').map(Number)

      // Build budget query
      let budgetQuery = supabase
        .from('budgets')
        .select('*, categories(id, name, icon, color)')
        .eq('year', year)
        .eq('month', month)
      
      if (family?.id) {
        budgetQuery = budgetQuery.eq('family_id', family.id)
      } else {
        budgetQuery = budgetQuery.is('family_id', null)
      }
      
      const { data: budgets, error } = await budgetQuery
      if (error) throw error

      // Get spending per category this month
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let txQuery = supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        txQuery = txQuery.eq('family_id', family.id)
      } else {
        txQuery = txQuery.eq('user_id', user.id)
      }

      const { data: txs } = await txQuery

      const spending = {}
      for (const t of txs || []) {
        spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount)
      }

      return (budgets || []).map((b) => ({
        ...b,
        spent: spending[b.category_id] || 0,
      }))
    },
    enabled: !!user?.id && !!yearMonth,
    staleTime: 1000 * 30,
  })
}

export function useCreateBudget() {
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

      const { error } = await supabase.from('budgets').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase.from('budgets').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useCopyBudgetFromLastMonth() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (yearMonth) => {
      const [year, month] = yearMonth.split('-').map(Number)
      const prevDate = new Date(year, month - 2, 1)
      const prevYear = prevDate.getFullYear()
      const prevMonth = prevDate.getMonth() + 1

      // Check if current month already has budgets
      const { data: existingBudgets, error: existingError } = await supabase
        .from('budgets')
        .select('category_id')
        .eq('year', year)
        .eq('month', month)
      
      if (family?.id) {
        existingBudgets?.forEach((_, i) => {
          if (existingBudgets[i]) existingBudgets[i].family_id = family.id
        })
      } else if (user?.id) {
        existingBudgets?.forEach((_, i) => {
          if (existingBudgets[i]) existingBudgets[i].user_id = user.id
        })
      }
      
      if (existingError) throw existingError
      if (existingBudgets && existingBudgets.length > 0) {
        throw new Error(`Bulan ini sudah memiliki ${existingBudgets.length} anggaran. Penyalinan dibatalkan untuk mencegah penimpaan data.`)
      }

      let prevQuery = supabase
        .from('budgets')
        .select('category_id, amount')
        .eq('year', prevYear)
        .eq('month', prevMonth)
      
      if (family?.id) {
        prevQuery = prevQuery.eq('family_id', family.id)
      } else {
        prevQuery = prevQuery.eq('user_id', user.id)
      }
      
      const { data: prevBudgets, error } = await prevQuery

      if (error) throw error
      if (!prevBudgets?.length) throw new Error('Tidak ada anggaran bulan lalu')

      const inserts = prevBudgets.map((b) => ({
        category_id: b.category_id,
        amount: b.amount,
        year,
        month,
        user_id: user.id,
        ...(family?.id ? { family_id: family.id } : {}),
      }))

      const { error: insertError } = await supabase.from('budgets').insert(inserts)
      if (insertError) throw insertError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
