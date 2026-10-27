import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { shouldSendNotification } from './useNotifications'
import { formatCurrency, toDateStr, fetchAllRows } from '@/lib/utils'

const QUERY_KEY = 'transactions'
const PAGE_SIZE = 50 // batas maksimal per halaman

// Pilihan jumlah data per halaman untuk daftar transaksi
export const TRANSACTIONS_PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

const clampPageSize = (size) => {
  const n = Number(size)
  return Number.isFinite(n) && n > 0 ? Math.min(n, PAGE_SIZE) : 20
}

// 'YYYY-MM-DD' → [tahun, bulan 1-12] tanpa new Date() (yang membaca string
// tanggal sebagai UTC dan bisa bergeser ke bulan sebelumnya di zona UTC-x)
const yearMonthOf = (dateStr) => [Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7))]

// Helper to create budget warning notification
async function checkAndCreateBudgetWarning(familyId, userId, categoryId, _amount) {
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
  const end = toDateStr(new Date(year, month, 0))
  
  const txs = await fetchAllRows(() => {
    const txQuery = supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', categoryId)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end)
    return familyId ? txQuery.eq('family_id', familyId) : txQuery.eq('user_id', userId)
  })
  
  const spent = txs.reduce((s, t) => s + Number(t.amount), 0)
  const budgetAmount = Number(budget.amount)
  const pct = (spent / budgetAmount) * 100
  const level = pct >= 100 ? 'over' : pct >= 80 ? 'near' : null
  if (!level) return
  
  // Check if we should send notification
  const shouldSend = await shouldSendNotification(userId, 'budget_warning')
  if (!shouldSend) return

  // Cukup 1x per kategori per level per bulan, bukan di setiap transaksi berikutnya
  const period = start.slice(0, 7)
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'budget_warning')
    .eq('user_id', userId)
    .contains('data', { category_id: categoryId, period, level })
    .limit(1)
  if (existing?.length) return
  
  // Create notification based on threshold
  if (level === 'over') {
    await supabase.from('notifications').insert({
      family_id: familyId,
      user_id: userId,
      type: 'budget_warning',
      title: 'Anggaran Terlampaui',
      message: `Pengeluaran untuk kategori ini telah melebihi anggaran (${Math.round(pct)}%). Total: Rp ${spent.toLocaleString('id-ID')}`,
      data: { category_id: categoryId, spent, budget: budgetAmount, pct, period, level },
    })
  } else {
    await supabase.from('notifications').insert({
      family_id: familyId,
      user_id: userId,
      type: 'budget_warning',
      title: 'Anggaran Hampir Habis',
      message: `Pengeluaran untuk kategori ini telah mencapai ${Math.round(pct)}% dari anggaran.`,
      data: { category_id: categoryId, spent, budget: budgetAmount, pct, period, level },
    })
  }
}

// Ingatkan user (opt-in, default off) kalau belum ada transaksi tercatat hari ini.
// Dicek malam hari saja, maksimal 1x/hari per user.
async function checkDailyReminder(familyId, userId) {
  if (!userId) return
  const shouldSend = await shouldSendNotification(userId, 'reminder_daily')
  if (!shouldSend) return

  const now = new Date()
  if (now.getHours() < 18) return

  const todayStr = toDateStr(now)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'reminder_daily')
    .eq('user_id', userId)
    .gte('created_at', startOfToday)
    .limit(1)
  if (existing?.length) return

  let txQuery = supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('date', todayStr)
  txQuery = familyId ? txQuery.eq('family_id', familyId) : txQuery.eq('user_id', userId)
  const { count } = await txQuery
  if (count > 0) return

  await supabase.from('notifications').insert({
    family_id: familyId || null,
    user_id: userId,
    type: 'reminder_daily',
    title: 'Belum Ada Transaksi Hari Ini',
    message: 'Jangan lupa catat pemasukan atau pengeluaran hari ini supaya laporan tetap akurat.',
    data: { date: todayStr },
  })
}

// Kirim ringkasan bulan lalu (opt-in) di awal bulan berjalan (tanggal 1-5), sekali per bulan.
async function checkMonthlyReport(familyId, userId) {
  if (!userId) return
  const shouldSend = await shouldSendNotification(userId, 'monthly_report')
  if (!shouldSend) return

  const now = new Date()
  if (now.getDate() > 5) return

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = prevMonthDate.getFullYear()
  const month = prevMonthDate.getMonth() + 1
  const period = `${year}-${String(month).padStart(2, '0')}`

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'monthly_report')
    .eq('user_id', userId)
    .contains('data', { period })
    .limit(1)
  if (existing?.length) return

  const start = `${period}-01`
  const end = toDateStr(new Date(year, month, 0))
  const txs = await fetchAllRows(() => {
    const txQuery = supabase
      .from('transactions')
      .select('type, amount')
      .in('type', ['income', 'expense'])
      .gte('date', start)
      .lte('date', end)
    return familyId ? txQuery.eq('family_id', familyId) : txQuery.eq('user_id', userId)
  })
  if (!txs.length) return

  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const savings = income - expense
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(prevMonthDate)

  await supabase.from('notifications').insert({
    family_id: familyId || null,
    user_id: userId,
    type: 'monthly_report',
    title: `Ringkasan ${monthLabel}`,
    message: `Pemasukan ${formatCurrency(income)}, Pengeluaran ${formatCurrency(expense)}, Tabungan ${formatCurrency(savings)}.`,
    data: { period },
  })
}

// Jalankan pengecekan pengingat harian & laporan bulanan sekali per mount (mis. dari Dashboard).
export function useActivityReminders() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || checkedRef.current) return
    checkedRef.current = true
    checkDailyReminder(family?.id || null, user.id).catch((err) => console.error('Daily reminder error:', err))
    checkMonthlyReport(family?.id || null, user.id).catch((err) => console.error('Monthly report error:', err))
  }, [user?.id, family?.id])
}

export function useTransactions(filters = {}, page = 0, pageSize = 20) {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)
  const size = clampPageSize(pageSize)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id, filters, page, size],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 }
      const from = page * size
      const to = from + size - 1

      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, icon, color, type),
          wallets!wallet_id(id, name, icon, color)
        `, { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }

      if (filters.type) query = query.eq('type', filters.type)
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.wallet_id) query = query.eq('wallet_id', filters.wallet_id)
      if (filters.user_id) query = query.eq('user_id', filters.user_id)
      if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('date', filters.dateTo)
      if (filters.search) {
        // Escape Postgres wildcard characters to prevent unintended wildcard expansion
        const escaped = filters.search.replace(/[%_]/g, '\\$&')
        query = query.ilike('description', `%${escaped}%`)
      }

      // Ambil profil anggota keluarga secara terpisah (tidak ada FK langsung
      // transactions -> profiles untuk di-embed lewat PostgREST) supaya UI
      // bisa menampilkan siapa yang mencatat tiap transaksi.
      const [txResult, profileResult] = await Promise.all([
        query,
        family?.id
          ? supabase.from('profiles').select('id, full_name').eq('family_id', family.id)
          : Promise.resolve({ data: null, error: null }),
      ])

      if (txResult.error) throw txResult.error
      if (profileResult.error) throw profileResult.error

      let data = txResult.data || []
      if (profileResult.data) {
        const profileMap = new Map(profileResult.data.map((p) => [p.id, p.full_name]))
        data = data.map((t) => ({ ...t, creator_name: profileMap.get(t.user_id) || null }))
      }

      return { data, count: txResult.count || 0 }
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

      const [txResult, profileResult] = await Promise.all([
        query,
        family?.id
          ? supabase.from('profiles').select('id, full_name').eq('family_id', family.id)
          : Promise.resolve({ data: null, error: null }),
      ])

      if (txResult.error) throw txResult.error
      if (profileResult.error) throw profileResult.error

      let data = txResult.data || []
      if (profileResult.data) {
        const profileMap = new Map(profileResult.data.map((p) => [p.id, p.full_name]))
        data = data.map((t) => ({ ...t, creator_name: profileMap.get(t.user_id) || null }))
      }

      return data
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
      const end = toDateStr(new Date(year, month, 0))

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('type, amount')
          .in('type', ['income', 'expense'])
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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
          start: toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
          end: toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        })
      }

      const start = months[0].start
      const end = months[months.length - 1].end

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('type, amount, date')
          .in('type', ['income', 'expense'])
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

      return months.map((m) => {
        const monthTxs = data.filter((t) => {
          const [y, mo] = yearMonthOf(t.date)
          return y === m.year && mo === m.month
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
      const end = toDateStr(new Date(year, month, 0))

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('amount, categories(id, name, color)')
          .eq('type', 'expense')
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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
          start: toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
          end: toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        })
      }

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('type, amount, date')
          .in('type', ['income', 'expense'])
          .gte('date', months[0].start)
          .lte('date', months[months.length - 1].end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

      return months.map((m) => {
        const txs = data.filter((t) => {
          const [y, mo] = yearMonthOf(t.date)
          return y === m.year && mo === m.month
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
      const end = toDateStr(new Date(year, month, 0))

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('amount, categories(id, name, icon, color)')
          .eq('type', 'expense')
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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
      const end = toDateStr(new Date(year, month, 0))

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
      const end = toDateStr(new Date(year, month, 0))

      const txRows = fetchAllRows(() => {
        const txQuery = supabase
          .from('transactions')
          .select('amount, type, user_id')
          .in('type', ['income', 'expense'])
          .gte('date', start)
          .lte('date', end)
        return family?.id ? txQuery.eq('family_id', family.id) : txQuery.eq('user_id', user.id)
      })

      const fetchProfiles = (cols) => {
        const q = supabase.from('profiles').select(cols)
        return family?.id ? q.eq('family_id', family.id) : q.eq('id', user.id)
      }

      let [txData, profileResult] = await Promise.all([
        txRows,
        fetchProfiles('id, full_name, role, avatar_color, emoji'),
      ])

      // Migrasi avatar_color/emoji mungkin belum diterapkan → fallback tanpa kolom itu.
      if (
        profileResult.error &&
        (profileResult.error.code === '42703' || /column|schema cache/i.test(profileResult.error.message || ''))
      ) {
        profileResult = await fetchProfiles('id, full_name, role')
      }

      const profileMap = new Map((profileResult.data || []).map(p => [p.id, p]))

      const grouped = {}
      for (const t of txData) {
        if (!t.user_id) continue
        if (!grouped[t.user_id]) {
          const profile = profileMap.get(t.user_id)
          grouped[t.user_id] = {
            id: t.user_id,
            name: profile?.full_name || 'Anggota',
            role: profile?.role || 'member',
            avatar_color: profile?.avatar_color || null,
            emoji: profile?.emoji || null,
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
      const end = toDateStr(new Date(year, month, 0))

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('amount, date')
          .eq('type', 'expense')
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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
      
      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('type, amount')
          .in('type', ['income', 'expense'])
          .gte('date', dateFrom)
          .lte('date', dateTo)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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
      
      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('amount, categories(id, name, icon, color)')
          .eq('type', 'expense')
          .gte('date', dateFrom)
          .lte('date', dateTo)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

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

      const data = await fetchAllRows(() => {
        const query = supabase
          .from('transactions')
          .select('type, amount, date')
          .in('type', ['income', 'expense'])
          .gte('date', start)
          .lte('date', end)
        return family?.id ? query.eq('family_id', family.id) : query.eq('user_id', user.id)
      })

      const months = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const label = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(year, i, 1))
        return { month: m, label, income: 0, expense: 0 }
      })

      for (const t of data || []) {
        const m = yearMonthOf(t.date)[1] - 1
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
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      await queryClient.invalidateQueries({ queryKey: ['budgets'] })

      // Check budget warning after successful transaction creation
      // Run asynchronously so it doesn't block the mutation
      if (variables.type === 'expense' && variables.category_id) {
        checkAndCreateBudgetWarning(family?.id || null, user.id, variables.category_id, variables.amount)
          .catch((err) => console.error('Budget warning error:', err))
      }
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      let query = supabase.from('transactions').update(data).eq('id', id)
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      const { error } = await query
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
      await queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      let query = supabase.from('transactions').delete().eq('id', id)
      if (family?.id) {
        query = query.eq('family_id', family.id)
      } else {
        query = query.eq('user_id', user.id)
      }
      const { error } = await query
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
      await queryClient.invalidateQueries({ queryKey: ['budgets'] })
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
        ({ error } = await supabase.rpc('delete_all_family_transactions', { p_family_id: family.id }))
      } else {
        ({ error } = await supabase.rpc('delete_all_user_transactions', { p_user_id: user.id }))
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
