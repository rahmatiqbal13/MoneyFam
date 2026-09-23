import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toDateStr } from '@/lib/utils'
import { parseCSV, readFileAsText, convertOlloToMoneyFam, generateCSV, convertMoneyFamToOllo } from '@/utils/csvUtils'

const CATEGORY_ICON_MAP = [
  // Indonesian & English expense
  { keywords: ['makan', 'minum', 'food', 'drink', 'kuliner', 'restoran', 'kafe'], icon: '🍔' },
  { keywords: ['transport', 'mobil', 'motor', 'bensin', 'parkir', 'ojek', 'grab', 'gojek', 'commute'], icon: '🚗' },
  { keywords: ['belanja', 'shopping', 'toko', 'market', 'mall', 'supermarket', 'grocery'], icon: '🛒' },
  { keywords: ['kesehatan', 'health', 'obat', 'dokter', 'rumah sakit', 'klinik', 'apotek'], icon: '💊' },
  { keywords: ['pendidikan', 'education', 'sekolah', 'kuliah', 'kursus', 'buku', 'les'], icon: '📚' },
  { keywords: ['hiburan', 'entertainment', 'game', 'film', 'bioskop', 'hobby', 'streaming'], icon: '🎬' },
  { keywords: ['pakaian', 'baju', 'fashion', 'clothing', 'sepatu', 'tas'], icon: '👕' },
  { keywords: ['tagihan', 'listrik', 'air', 'internet', 'utilities', 'pln', 'token', 'wifi'], icon: '⚡' },
  { keywords: ['rumah', 'housing', 'sewa', 'kontrakan', 'kos', 'renovasi'], icon: '🏠' },
  { keywords: ['komunikasi', 'pulsa', 'phone', 'hp', 'telepon', 'data'], icon: '📱' },
  { keywords: ['kecantikan', 'beauty', 'perawatan', 'salon', 'spa', 'kosmetik'], icon: '💄' },
  { keywords: ['olahraga', 'sport', 'gym', 'fitness', 'renang'], icon: '🏋️' },
  { keywords: ['perjalanan', 'travel', 'liburan', 'wisata', 'hotel', 'tiket', 'pesawat'], icon: '✈️' },
  { keywords: ['donasi', 'sedekah', 'amal', 'charity', 'zakat', 'infaq'], icon: '🤲' },
  { keywords: ['tabungan', 'saving', 'investasi', 'investment', 'deposit'], icon: '🐷' },
  { keywords: ['cicilan', 'hutang', 'debt', 'kredit', 'angsuran', 'pinjaman'], icon: '💳' },
  // Income
  { keywords: ['gaji', 'salary', 'wage', 'upah'], icon: '💼' },
  { keywords: ['bonus', 'thr', 'insentif', 'reward'], icon: '🎁' },
  { keywords: ['freelance', 'proyek', 'project', 'jasa'], icon: '💻' },
  { keywords: ['bisnis', 'usaha', 'business', 'jualan', 'dagang'], icon: '🏪' },
  { keywords: ['kiriman', 'transfer', 'remittance'], icon: '💰' },
  { keywords: ['piutang', 'pengembalian', 'refund', 'reimburse'], icon: '💸' },
]

function getCategoryIcon(categoryName) {
  const lower = (categoryName || '').toLowerCase()
  for (const entry of CATEGORY_ICON_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.icon
  }
  return '📦'
}

function getCategoryColor(categoryName) {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]
  let hash = 0
  for (let i = 0; i < (categoryName || '').length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Hook for importing data from Ollo CSV
 */
export function useDataImport() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (file) => {
      if (!user?.id) throw new Error('Anda harus login terlebih dahulu')

      const csvContent = await readFileAsText(file)
      const rawData = await parseCSV(csvContent)

      if (!rawData || rawData.length === 0) {
        throw new Error('File CSV kosong atau format tidak valid')
      }

      const { wallets, categories, transactions } = convertOlloToMoneyFam(rawData)

      let walletQuery = supabase.from('wallets').select('id, name')
      if (family?.id) {
        walletQuery = walletQuery.eq('family_id', family.id)
      } else {
        walletQuery = walletQuery.eq('user_id', user.id)
      }
      const { data: existingWallets, error: walletFetchError } = await walletQuery
      if (walletFetchError) {
        console.error('[Import] Error fetch wallets:', walletFetchError)
        throw new Error('Gagal mengambil data wallet yang sudah ada')
      }

      // Build category query based on family existence
      let catQuery = supabase.from('categories').select('id, name, type')
      if (family?.id) {
        catQuery = catQuery.or(`family_id.eq.${family.id},family_id.is.null`)
      } else {
        catQuery = catQuery.is('family_id', null)
      }
      const { data: existingCategories, error: catFetchError } = await catQuery
      if (catFetchError) {
        console.error('[Import] Error fetch categories:', catFetchError)
        throw new Error('Gagal mengambil data kategori yang sudah ada')
      }

      const existingWalletMap = new Map((existingWallets || []).map(w => [w.name.toLowerCase().trim(), w]))
      const existingCategoryMap = new Map((existingCategories || []).map(c => [c.name.toLowerCase().trim(), c]))
      
      // Batch create missing wallets (single round-trip)
      const walletIdMap = new Map()
      // Pre-fill existing
      for (const wallet of wallets) {
        const normalizedName = wallet.name.toLowerCase().trim()
        if (existingWalletMap.has(normalizedName)) {
          walletIdMap.set(wallet.name, existingWalletMap.get(normalizedName).id)
        }
      }
      // Insert all new wallets at once
      const newWalletsList = wallets.filter(w => !existingWalletMap.has(w.name.toLowerCase().trim()))
      if (newWalletsList.length > 0) {
        const walletInserts = newWalletsList.map(wallet => {
          const nameLower = wallet.name.toLowerCase()
          // Detect wallet type based on name patterns
          const isBank = nameLower.includes('bank') || nameLower.includes('card') || 
                         nameLower.includes('rekening') || nameLower.includes('bca') ||
                         nameLower.includes('mandiri') || nameLower.includes('bni') ||
                         nameLower.includes('bri') || nameLower.includes('btn')
          const isEWallet = nameLower.includes('gopay') || nameLower.includes('ovo') || 
                            nameLower.includes('dana') || nameLower.includes('shopeepay') ||
                            nameLower.includes('linkaja') || nameLower.includes('e-wallet') ||
                            nameLower.includes('ewallet') || nameLower.includes('e wallet')
          
          return {
            name: wallet.name,
            type: isBank ? 'bank' : (isEWallet ? 'e-wallet' : 'cash'),
            balance: 0,
            initial_balance: 0, // Set initial_balance for imported wallets
            user_id: user.id,
            ...(family?.id ? { family_id: family.id } : {}),
          }
        })
        const { data: insertedWallets, error: walletError } = await supabase
          .from('wallets')
          .insert(walletInserts)
          .select('id, name')
        if (walletError) throw walletError
        for (const w of insertedWallets) {
          walletIdMap.set(w.name, w.id)
        }
      }

      // Batch create missing categories (single round-trip)
      const categoryIdMap = new Map()
      for (const category of categories) {
        const normalizedName = category.name.toLowerCase().trim()
        if (existingCategoryMap.has(normalizedName)) {
          categoryIdMap.set(category.name, existingCategoryMap.get(normalizedName).id)
        }
      }
      const newCategoriesList = categories.filter(c => !existingCategoryMap.has(c.name.toLowerCase().trim()))
      if (newCategoriesList.length > 0) {
        const categoryInserts = newCategoriesList.map(category => ({
          name: category.name,
          type: category.type,
          icon: getCategoryIcon(category.name),
          color: getCategoryColor(category.name),
          ...(family?.id ? { family_id: family.id } : {}),
        }))
        const { data: insertedCategories, error: catError } = await supabase
          .from('categories')
          .insert(categoryInserts)
          .select('id, name')
        if (catError) throw catError
        for (const c of insertedCategories) {
          categoryIdMap.set(c.name, c.id)
        }
      }

      let txQuery = supabase
        .from('transactions')
        .select('date, amount, description, wallet_id')
        .order('date', { ascending: false })
        .limit(10000)

      if (family?.id) {
        txQuery = txQuery.eq('family_id', family.id)
      } else {
        txQuery = txQuery.eq('user_id', user.id)
      }

      const { data: existingTxs, error: existingTxError } = await txQuery
      if (existingTxError) {
        console.error('[Import] Error fetch existing transactions:', existingTxError)
        throw new Error('Gagal mengambil data transaksi yang sudah ada')
      }

      const existingTxKeys = new Set(
        (existingTxs || []).map((t) => `${t.date}|${t.amount}|${(t.description || '').toLowerCase().trim()}|${t.wallet_id}`)
      )

      // Count how many CSV rows were SYSTEM type (skipped before reaching here)
      const systemSkipped = rawData.filter(r => (r.Type || '').toUpperCase() === 'SYSTEM').length

      // Build batch of valid transactions, skipping missing wallets, amount<=0, and duplicates
      let skippedDuplicate = 0
      let skippedInvalid = 0
      const errors = []
      const batch = []

      for (const tx of transactions) {
        const walletId = walletIdMap.get(tx.wallet)
        const destinationWalletId = tx.destinationWallet ? walletIdMap.get(tx.destinationWallet) : null
        const categoryId = categoryIdMap.get(tx.category)
        const dateStr = tx.date.split('T')[0]

        if (!walletId || !tx.amount || tx.amount <= 0) { skippedInvalid++; continue }

        const dupKey = `${dateStr}|${tx.amount}|${(tx.description || '').toLowerCase().trim()}|${walletId}`
        if (existingTxKeys.has(dupKey)) { skippedDuplicate++; continue }

        // Sanitize text fields to prevent stored XSS
        const sanitize = (str) => {
          if (!str || typeof str !== 'string') return str
          return str.replace(/<[^>]*>/g, '').trim().slice(0, 500)
        }

        const txData = {
          user_id: user.id,
          wallet_id: walletId,
          to_wallet_id: destinationWalletId || null,
          type: tx.type,
          amount: tx.amount,
          date: dateStr,
          description: sanitize(tx.description),
          note: sanitize(tx.note),
          category_id: categoryId || null,
        }
        
        // Add family_id only if user has family
        if (family?.id) {
          txData.family_id = family.id
        }
        
        batch.push(txData)
      }

      // Bulk insert in chunks of 100, collect inserted IDs for undo
      let importedCount = 0
      const importedIds = []
      const CHUNK = 100
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK)
        const { data: inserted, error: txError } = await supabase
          .from('transactions')
          .insert(chunk)
          .select('id')
        if (txError) {
          console.error(`[Import] Batch ${Math.floor(i / CHUNK) + 1} error:`, txError)
          errors.push(`Batch ${Math.floor(i / CHUNK) + 1}: ${txError.message}`)
        } else {
          importedCount += inserted.length
          importedIds.push(...inserted.map(r => r.id))
        }
      }

      return {
        totalCsv: rawData.length,
        imported: importedCount,
        skippedDuplicate,
        skippedInvalid,
        systemSkipped,
        errors: errors.slice(0, 10),
        importedIds,
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

/**
 * Hook for deleting a specific set of imported transactions by ID
 */
export function useDeleteImport() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (ids) => {
      if (!ids || ids.length === 0) throw new Error('Tidak ada data untuk dihapus')
      const CHUNK = 200
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK)
        let query = supabase.from('transactions').delete().in('id', chunk)
        if (family?.id) {
          query = query.eq('family_id', family.id)
        } else {
          query = query.eq('user_id', user.id)
        }
        const { error } = await query
        if (error) throw error
      }
      return ids.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

/**
 * Hook for exporting data to Ollo CSV format
 */
export function useDataExport() {
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Anda harus login terlebih dahulu')
      
      // Fetch all transactions
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      
      if (family?.id) {
        txQuery = txQuery.eq('family_id', family.id)
      } else {
        txQuery = txQuery.eq('user_id', user.id)
      }
      
      const { data: transactions, error: txError } = await txQuery
      
      if (txError) throw txError
      
      // Fetch all wallets
      let walletQuery = supabase.from('wallets').select('*')
      if (family?.id) {
        walletQuery = walletQuery.eq('family_id', family.id)
      } else {
        walletQuery = walletQuery.eq('user_id', user.id)
      }
      
      const { data: wallets, error: walletError } = await walletQuery
      
      if (walletError) throw walletError
      
      // Fetch all categories
      let catQuery = supabase.from('categories').select('*')
      if (family?.id) {
        catQuery = catQuery.or(`family_id.eq.${family.id},family_id.is.null`)
      } else {
        // For solo users, only get categories that are used in their transactions
        // Get unique category IDs from transactions
        const usedCategoryIds = [...new Set((transactions || [])
          .map(tx => tx.category_id)
          .filter(id => id !== null))]
        
        if (usedCategoryIds.length > 0) {
          catQuery = catQuery.in('id', usedCategoryIds)
        } else {
          // No transactions with categories, return empty array
          catQuery = catQuery.eq('id', '00000000-0000-0000-0000-000000000000') // Impossible condition
        }
      }
      
      const { data: categories, error: catError } = await catQuery
      
      if (catError) throw catError
      
      // Convert to Ollo format
      const olloData = convertMoneyFamToOllo(transactions || [], wallets || [], categories || [])
      
      // Generate CSV
      const csv = generateCSV(olloData, [
        'Date',
        'Title',
        'Type',
        'Wallet',
        'Destination Wallet',
        'Category',
        'SubCategory',
        'Amount',
        'Currency',
        'Note'
      ])
      
      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `moneyfam_export_${toDateStr(new Date())}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return {
        total: olloData.length,
        filename: `moneyfam_export_${toDateStr(new Date())}.csv`
      }
    },
  })
}
