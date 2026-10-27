import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { shouldSendNotification } from './useNotifications'
import { formatCurrency } from '@/lib/utils'

const TX_KEY = 'transactions'
const QUERY_KEY = 'debts'
const PAYMENTS_KEY = 'debt_payments'
const DUE_SOON_DAYS = 3

// Cek hutang yang mendekati/lewat jatuh tempo dan kirim notifikasi (maks. 1x/24 jam per hutang).
async function checkDebtDueReminders(familyId, userId, debts) {
  if (!userId || !debts?.length) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const candidates = debts.filter((d) => d.type === 'debt' && !d.is_paid && d.due_date)
    .map((d) => {
      const due = new Date(d.due_date)
      due.setHours(0, 0, 0, 0)
      const daysUntil = Math.round((due - today) / (1000 * 60 * 60 * 24))
      return { ...d, daysUntil }
    })
    .filter((d) => d.daysUntil <= DUE_SOON_DAYS)

  if (!candidates.length) return

  const shouldSend = await shouldSendNotification(userId, 'debt_due')
  if (!shouldSend) return

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  for (const debt of candidates) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'debt_due')
      .eq('user_id', userId)
      .contains('data', { debt_id: debt.id })
      .gte('created_at', since)
      .limit(1)
    if (existing?.length) continue

    const title = debt.daysUntil < 0
      ? 'Hutang Terlambat Dibayar'
      : debt.daysUntil === 0
      ? 'Hutang Jatuh Tempo Hari Ini'
      : 'Hutang Segera Jatuh Tempo'
    const message = debt.daysUntil < 0
      ? `"${debt.name}" sudah lewat ${Math.abs(debt.daysUntil)} hari dari jatuh tempo. Sisa: ${formatCurrency(debt.remaining_amount)}`
      : debt.daysUntil === 0
      ? `"${debt.name}" jatuh tempo hari ini. Sisa: ${formatCurrency(debt.remaining_amount)}`
      : `"${debt.name}" jatuh tempo dalam ${debt.daysUntil} hari. Sisa: ${formatCurrency(debt.remaining_amount)}`

    await supabase.from('notifications').insert({
      family_id: familyId || null,
      user_id: userId,
      type: 'debt_due',
      title,
      message,
      data: { debt_id: debt.id },
    })
  }
}

// Jalankan pengecekan reminder jatuh tempo hutang sekali per mount (mis. dari Dashboard).
export function useDebtDueReminders() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)
  const { data: debts } = useDebts()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || !debts || checkedRef.current) return
    checkedRef.current = true
    checkDebtDueReminders(family?.id || null, user.id, debts)
      .catch((err) => console.error('Debt due reminder error:', err))
  }, [user?.id, family?.id, debts])
}

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
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const allowedFields = ['name', 'amount', 'remaining_amount', 'due_date', 'is_paid', 'type', 'description']
      const updateData = {}
      for (const key of allowedFields) {
        if (key in data) updateData[key] = data[key]
      }
      updateData.updated_at = new Date().toISOString()

      let query = supabase.from('debts').update(updateData).eq('id', id)
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

export function useDeleteDebt() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      let query = supabase.from('debts').delete().eq('id', id)
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
      debtId: _debtId,
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
    mutationFn: async ({ paymentId, debtId: _debtId }) => {
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
      paymentDate,
      paymentTime,
      walletId, 
      categoryId, 
      note 
    }) => {
      // Biarkan server menghitung remainingAmount
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
