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
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))]
  const ids = unique.map((s) => COINGECKO_IDS[s]).filter(Boolean)
  if (!ids.length) return {}

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=idr`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return {}
    const data = await res.json()

    const prices = {}
    unique.forEach((sym) => {
      const id = COINGECKO_IDS[sym]
      if (id && data[id]?.idr) prices[sym] = data[id].idr
    })
    return prices
  } catch {
    return {}
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
      await Promise.all(
        cryptos
          .filter((i) => prices[i.code.toUpperCase()] !== undefined)
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
      const insertData = {
        ...data,
        user_id: user.id,
        current_price: data.current_price || data.buy_price,
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

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { error } = await supabase
        .from('investments')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('investments').delete().eq('id', id)
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
