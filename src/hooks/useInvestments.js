import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const QUERY_KEY = 'investments'

// CoinGecko symbol → ID mapping (crypto umum)
const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  XRP: 'ripple',
  TRX: 'tron',
  ATOM: 'cosmos',
  NEAR: 'near',
  OP: 'optimism',
  ARB: 'arbitrum',
}

async function fetchCryptoPricesIDR(symbols) {
  if (!symbols.length) return {}
  const unique = [...new Set(symbols.map((s) => s?.toUpperCase()).filter(Boolean))]
  const ids = unique.map((s) => COINGECKO_IDS[s]).filter(Boolean)
  if (!ids.length) return {}

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=idr`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`CoinGecko API returned ${res.status}`)
    const data = await res.json()

    const prices = {}
    unique.forEach((sym) => {
      const id = COINGECKO_IDS[sym]
      if (id && data[id]?.idr) prices[sym] = data[id].idr
    })
    return prices
  } catch (err) {
    console.error('Failed to fetch crypto prices:', err)
    throw err
  }
}

export function useInvestments() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      let query = supabase
        .from('investments')
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
    staleTime: 1000 * 60 * 5,
  })
}

export function useRefreshCryptoPrices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (investments) => {
      const cryptos = investments.filter((i) => i.type === 'kripto' && i.code)
      if (!cryptos.length) return {}

      const prices = await fetchCryptoPricesIDR(cryptos.map((i) => i.code))
      if (!Object.keys(prices).length) return prices

      const now = new Date().toISOString()
      const results = await Promise.allSettled(
        cryptos
          .filter((i) => prices[i.code?.toUpperCase()] !== undefined)
          .map((i) =>
            supabase
              .from('investments')
              .update({
                current_price: prices[i.code.toUpperCase()],
                price_updated_at: now,
              })
              .eq('id', i.id)
          )
      )

      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length) {
        console.error('Some crypto price updates failed:', failures)
        throw new Error(`${failures.length} dari ${results.length} update harga gagal`)
      }

      return prices
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useCreateInvestment() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      // Client-side validation
      if (!data.name?.trim()) throw new Error('Nama aset wajib diisi')
      if (!data.quantity || Number(data.quantity) <= 0) throw new Error('Jumlah harus lebih dari 0')
      if (!data.buy_price || Number(data.buy_price) <= 0) throw new Error('Harga beli harus lebih dari 0')

      const insertData = {
        ...data,
        user_id: user.id,
        current_price: data.current_price != null ? data.current_price : data.buy_price,
      }

      // Add family_id only if user has family
      if (family?.id) {
        insertData.family_id = family.id
      }

      const { error } = await supabase.from('investments').insert(insertData)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      // Whitelist allowed fields to prevent tampering
      const allowedFields = ['type', 'code', 'name', 'quantity', 'buy_price', 'current_price', 'buy_date', 'wallet_id', 'notes', 'interest_rate', 'maturity_date']
      const updateData = {}
      for (const key of allowedFields) {
        if (key in data) updateData[key] = data[key]
      }
      updateData.updated_at = new Date().toISOString()

      let query = supabase.from('investments').update(updateData).eq('id', id)
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

export function useDeleteInvestment() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      let query = supabase.from('investments').delete().eq('id', id)
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

export function usePensionSettings() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['pension_settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('pension_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  })
}

export function useSavePensionSettings() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (data) => {
      const upsertData = {
        ...data,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }
      
      // Add family_id only if user has family
      if (family?.id) {
        upsertData.family_id = family.id
      }

      const { error } = await supabase
        .from('pension_settings')
        .upsert(upsertData, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pension_settings'] }),
  })
}
