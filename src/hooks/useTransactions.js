import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { shouldSendNotification } from './useNotifications'

const QUERY_KEY = 'transactions'

// Helper to create budget warning notification
async function checkAndCreateBudgetWarning(familyId, userId, categoryId, amount) {
  if (!categoryId || !userId) return
  
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // Get budget for this category
  let budgetQuery = supabase
    .from('budgets')
    .select('*')
    .eq('category_id', categoryId)
    .eq('year', year)
    .eq('month', month)
  
  if (familyId) {
    budgetQuery = budgetQuery.eq('family_id', familyId)
  } else {
    budgetQuery = budgetQuery.eq('user_id', userId)
  }
  
  const { data: budget } = await budgetQuery.maybeSingle()
  
  if (!budget) return
  
  // Get current spending
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]
  
  let txQuery = supabase
    .from('transactions')
    .select('amount')
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)
  
  if (familyId) {
    txQuery = txQuery.eq('family_id', familyId)
  } else {
    txQuery = txQuery.eq('user_id', userId)
  }
  
  const { data: txs } = await txQuery
  
  const spent = txs?.reduce((s, t) => s + Number(t.amount), 0) || 0
  const budgetAmount = Number(budget.amount)
  const pct = (spent / budgetAmount) * 100
  
  // Check if we should send notification
  const shouldSend = await shouldSendNotification(userId, 'budget_warning')
  if (!shouldSend) return
  
  // Create notification based on threshold
  if (pct >= 100) {
    await supabase.from('notifications').insert({
      family_id: familyId,
      user_id: userId,
      type: 'budget_warning',
      title: 'Anggaran Terlampaui',
      message: `Pengeluaran untuk kategori ini telah melebihi anggaran (${Math.round(pct)}%). Total: Rp ${spent.toLocaleString('id-ID')}`,
      data: { category_id: categoryId, spent, budget: budgetAmount, pct },
    })
  } else if (pct >= 80) {
    await supabase.from('notifications').insert({
      family_id: familyId,
      user_id: userId,
      type: 'budget_warning',
      title: 'Anggaran Hampir Habis',
      message: `Pengeluaran untuk kategori ini telah mencapai ${Math.round(pct)}% dari anggaran.`,
      data: { category_id: categoryId, spent, budget: budgetAmount, pct },
    })
  }
}

export function useTransactions(filters = {}) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return []
      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, icon, color, type),
          wallets!wallet_id(id, name, icon, color)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // Filter by family if exists, otherwise by user
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }

      if (filters.type) query = query.eq('type', filters.type)
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.wallet_id) query = query.eq('wallet_id', filters.wallet_id)
      if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('date', filters.dateTo)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })
}

export function useRecentTransactions(limit = 5) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'recent', family?.id, user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []
      
      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, icon, color, type),
          wallets!wallet_id(id, name, icon, color)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      
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

export function useMonthlyStats(year, month) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'monthly-stats', family?.id, user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return { income: 0, expense: 0, savings: 0 }
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let query = supabase
        .from('transactions')
        .select('type, amount')
        .in('type', ['income', 'expense'])
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const income = (data || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = (data || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return { income, expense, savings: income - expense }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

export function useLast6MonthsData() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'last-6-months', family?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
          start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
        })
      }

      const start = months[0].start
      const end = months[months.length - 1].end

      let query = supabase
        .from('transactions')
        .select('type, amount, date')
        .in('type', ['income', 'expense'])
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      return months.map((m) => {
        const monthTxs = (data || []).filter((t) => {
          const d = new Date(t.date)
          return d.getFullYear() === m.year && d.getMonth() + 1 === m.month
        })
        const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        return { ...m, income, expense }
      })
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCategorySpending(year, month) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'category-spending', family?.id, user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return []
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let query = supabase
        .from('transactions')
        .select('amount, categories(id, name, color)')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const grouped = {}
      for (const t of data || []) {
        const cat = t.categories
        if (!cat) continue
        if (!grouped[cat.id]) {
          grouped[cat.id] = { name: cat.name, color: cat.color, value: 0 }
        }
        grouped[cat.id].value += Number(t.amount)
      }
      return Object.values(grouped).sort((a, b) => b.value - a.value)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

// N bulan terakhir berakhir di bulan yang dipilih (untuk Reports trend chart)
export function useMonthlyTrend(year, month, count = 6) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'monthly-trend', family?.id, user?.id, year, month, count],
    queryFn: async () => {
      if (!user?.id) return []
      const months = []
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        months.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(d),
          start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
        })
      }

      let query = supabase
        .from('transactions')
        .select('type, amount, date')
        .in('type', ['income', 'expense'])
        .gte('date', months[0].start)
        .lte('date', months[months.length - 1].end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      return months.map((m) => {
        const txs = (data || []).filter((t) => {
          const d = new Date(t.date)
          return d.getFullYear() === m.year && d.getMonth() + 1 === m.month
        })
        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        return { ...m, income, expense }
      })
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

// Pengeluaran per kategori dengan detail (jumlah transaksi, %)
export function useReportCategoryDetail(year, month) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'report-category-detail', family?.id, user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return []
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let query = supabase
        .from('transactions')
        .select('amount, categories(id, name, icon, color)')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const grouped = {}
      for (const t of data || []) {
        const cat = t.categories
        if (!cat) continue
        if (!grouped[cat.id]) {
          grouped[cat.id] = { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, amount: 0, count: 0 }
        }
        grouped[cat.id].amount += Number(t.amount)
        grouped[cat.id].count++
      }

      const sorted = Object.values(grouped).sort((a, b) => b.amount - a.amount)
      const total = sorted.reduce((s, c) => s + c.amount, 0)
      return sorted.map((c) => ({ ...c, pct: total ? (c.amount / total) * 100 : 0, total }))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

// Top N transaksi terbesar (expense) bulan ini
export function useTopTransactions(year, month, limit = 5) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'top-transactions', family?.id, user?.id, year, month, limit],
    queryFn: async () => {
      if (!user?.id) return []
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      // Tidak join wallets karena transactions punya 2 FK ke wallets (wallet_id & to_wallet_id)
      // yang bisa menyebabkan ambiguitas di PostgREST
      let query = supabase
        .from('transactions')
        .select('id, amount, date, description, wallet_id, categories(id, name, icon, color)')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
        .order('amount', { ascending: false })
        .limit(limit)
      
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

// Pemasukan & pengeluaran per anggota keluarga
export function useMemberSpending(year, month) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'member-spending', family?.id, user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return []
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let txQuery = supabase
        .from('transactions')
        .select('amount, type, user_id')
        .in('type', ['income', 'expense'])
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        txQuery = txQuery.eq('family_id', family.id)
      } else {
        txQuery = txQuery.eq('user_id', user.id)
      }

      const [txResult, profileResult] = await Promise.all([
        txQuery,
        family?.id 
          ? supabase.from('profiles').select('id, full_name, role').eq('family_id', family.id)
          : supabase.from('profiles').select('id, full_name, role').eq('id', user.id),
      ])

      if (txResult.error) throw txResult.error

      const profileMap = new Map((profileResult.data || []).map(p => [p.id, p]))

      const grouped = {}
      for (const t of txResult.data || []) {
        if (!t.user_id) continue
        if (!grouped[t.user_id]) {
          const profile = profileMap.get(t.user_id)
          grouped[t.user_id] = {
            id: t.user_id,
            name: profile?.full_name || 'Anggota',
            role: profile?.role || 'member',
            income: 0,
            expense: 0,
          }
        }
        if (t.type === 'income') grouped[t.user_id].income += Number(t.amount)
        if (t.type === 'expense') grouped[t.user_id].expense += Number(t.amount)
      }

      return Object.values(grouped).sort((a, b) => b.expense - a.expense)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

// Pengeluaran per hari dalam satu bulan (untuk spending heatmap)
export function useDailySpending(year, month) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'daily-spending', family?.id, user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return {}
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      let query = supabase
        .from('transactions')
        .select('amount, date')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const byDay = {}
      for (const t of data || []) {
        const day = t.date
        byDay[day] = (byDay[day] || 0) + Number(t.amount)
      }
      return byDay
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })
}

// Statistik untuk range tanggal bebas (harian/mingguan/tahunan)
export function usePeriodStats(dateFrom, dateTo) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'period-stats', family?.id, user?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.id || !dateFrom || !dateTo) return { income: 0, expense: 0, savings: 0 }
      
      let query = supabase
        .from('transactions')
        .select('type, amount')
        .in('type', ['income', 'expense'])
        .gte('date', dateFrom)
        .lte('date', dateTo)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const income = (data || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = (data || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return { income, expense, savings: income - expense }
    },
    enabled: !!user?.id && !!dateFrom && !!dateTo,
    staleTime: 1000 * 60,
  })
}

// Pengeluaran per kategori untuk range tanggal bebas
export function usePeriodCategoryDetail(dateFrom, dateTo) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'period-category-detail', family?.id, user?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.id || !dateFrom || !dateTo) return []
      
      let query = supabase
        .from('transactions')
        .select('amount, categories(id, name, icon, color)')
        .eq('type', 'expense')
        .gte('date', dateFrom)
        .lte('date', dateTo)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const grouped = {}
      for (const t of data || []) {
        const cat = t.categories
        if (!cat) continue
        if (!grouped[cat.id]) {
          grouped[cat.id] = { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, amount: 0, count: 0 }
        }
        grouped[cat.id].amount += Number(t.amount)
        grouped[cat.id].count++
      }

      const sorted = Object.values(grouped).sort((a, b) => b.amount - a.amount)
      const total = sorted.reduce((s, c) => s + c.amount, 0)
      return sorted.map((c) => ({ ...c, pct: total ? (c.amount / total) * 100 : 0 }))
    },
    enabled: !!user?.id && !!dateFrom && !!dateTo,
    staleTime: 1000 * 60,
  })
}

// Statistik tahunan (12 bulan)
export function useYearlyStats(year) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, 'yearly-stats', family?.id, user?.id, year],
    queryFn: async () => {
      if (!user?.id) return []
      const start = `${year}-01-01`
      const end = `${year}-12-31`

      let query = supabase
        .from('transactions')
        .select('type, amount, date')
        .in('type', ['income', 'expense'])
        .gte('date', start)
        .lte('date', end)
      
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error

      const months = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const label = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(year, i, 1))
        return { month: m, label, income: 0, expense: 0 }
      })

      for (const t of data || []) {
        const m = new Date(t.date).getMonth()
        if (t.type === 'income') months[m].income += Number(t.amount)
        if (t.type === 'expense') months[m].expense += Number(t.amount)
      }

      return months
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      const insertData = {
        ...data,
        user_id: user.id,
      }
      
      // Only add family_id if user has a family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      const { error } = await supabase.from('transactions').insert(insertData)
      if (error) throw error
      
      // Check budget warning after creating expense transaction
      if (data.type === 'expense' && data.category_id) {
        await checkAndCreateBudgetWarning(family?.id || null, user.id, data.category_id, data.amount)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase.from('transactions').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useDeleteAllTransactions() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      let error
      if (family?.id) {
        ;({ error } = await supabase.rpc('delete_all_family_transactions', { p_family_id: family.id }))
      } else {
        ;({ error } = await supabase.rpc('delete_all_user_transactions', { p_user_id: user.id }))
      }
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
