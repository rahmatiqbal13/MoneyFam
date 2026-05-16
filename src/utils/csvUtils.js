import Papa from 'papaparse'

/**
 * Parse CSV content to array of objects
 * @param {string} csvContent - Raw CSV string
 * @returns {Promise<Array<Object>>} Parsed data
 */
export function parseCSV(csvContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data)
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<string>} headers - Optional custom headers
 * @returns {string} CSV string
 */
export function generateCSV(data, headers = null) {
  if (!data || data.length === 0) return ''
  
  const csv = Papa.unparse({
    fields: headers || Object.keys(data[0]),
    data: data
  })
  
  return csv
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Revoke URL to prevent memory leak
  URL.revokeObjectURL(url)
}

/**
 * Read file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}

/**
 * Ollo CSV column mapping to MoneyFam format
 */
export const OLLO_TO_MONEYFAM_MAPPING = {
  Date: 'date',
  Title: 'description',
  Type: 'type',
  Wallet: 'wallet',
  'Destination Wallet': 'destinationWallet',
  Category: 'category',
  SubCategory: 'subCategory',
  Amount: 'amount',
  Currency: 'currency',
  Note: 'note'
}

/**
 * Map Ollo transaction type to MoneyFam type
 */
export function mapOlloType(olloType) {
  const typeMap = {
    'EXPENSE': 'expense',
    'INCOME': 'income',
    'TRANSFER': 'transfer'
  }
  return typeMap[olloType?.toUpperCase()] || null
}

/**
 * Parse Ollo date format to YYYY-MM-DD string
 * @param {string} olloDate - Date in format "YYYY-MM-DD HH:MM:SS"
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function parseOlloDate(olloDate) {
  if (!olloDate) {
    console.warn('Empty date in CSV, using today')
    return new Date().toISOString().split('T')[0]
  }
  
  // Ollo format: "2026-03-03 11:03:50"
  // Extract date part only to avoid timezone issues
  const datePart = olloDate.split(' ')[0]
  
  // Validate format YYYY-MM-DD
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    console.warn('Invalid date format in CSV:', olloDate, '- using today')
    return new Date().toISOString().split('T')[0]
  }
  
  return datePart
}

/**
 * Parse amount from Ollo format
 * @param {string|number} amount - Amount string or number
 * @returns {number} Parsed amount
 */
export function parseOlloAmount(amount) {
  if (!amount) return 0
  const parsed = parseFloat(amount)
  return isNaN(parsed) ? 0 : parsed
}

const INCOME_KEYWORDS = [
  // English
  'income', 'salary', 'wage', 'bonus', 'revenue', 'earning', 'profit', 'dividend', 'interest', 'refund',
  // Indonesian
  'gaji', 'pemasukan', 'pendapatan', 'bonus', 'freelance', 'investasi', 'bisnis', 'kiriman',
  'tunjangan', 'honor', 'komisi', 'penghasilan', 'upah', 'piutang',
]

function isIncomeCategory(name) {
  const lower = (name || '').toLowerCase()
  return INCOME_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Convert Ollo data to MoneyFam format
 * @param {Array<Object>} olloData - Raw data from Ollo CSV
 * @returns {Object} Object containing transactions, wallets, and categories to create
 */
export function convertOlloToMoneyFam(olloData) {
  const wallets = new Set()
  const categories = new Map() // category -> Set of subcategories
  const transactions = []
  
  olloData.forEach((row, index) => {
    const type = mapOlloType(row.Type)
    // Skip SYSTEM type (Ollo internal savings tracking) and unknown types
    if (!type) return

    // Collect wallets
    if (row.Wallet) wallets.add(row.Wallet.trim())
    if (row['Destination Wallet'] && type === 'transfer') wallets.add(row['Destination Wallet'].trim())

    // Collect categories (only for income/expense, not transfer)
    if (row.Category && type !== 'transfer') {
      const category = row.Category.trim()
      if (!categories.has(category)) {
        categories.set(category, new Set())
      }
      if (row.SubCategory) {
        categories.get(category).add(row.SubCategory.trim())
      }
    }

    const amount = parseOlloAmount(row.Amount)

    transactions.push({
      id: `import-${index}`,
      date: parseOlloDate(row.Date),
      description: row.Title || 'Imported transaction',
      type: type,
      amount: amount,
      wallet: row.Wallet?.trim() || 'Cash',
      destinationWallet: type === 'transfer' ? (row['Destination Wallet']?.trim() || null) : null,
      category: (type !== 'transfer' && row.Category?.trim()) ? row.Category.trim() : null,
      subCategory: row.SubCategory?.trim() || null,
      note: row.Note || null,
      currency: row.Currency || 'IDR'
    })
  })
  
  return {
    wallets: Array.from(wallets).map(name => ({
      name,
      type: 'cash',
      balance: 0
    })),
    categories: Array.from(categories.entries()).map(([name, subcats]) => ({
      name,
      type: isIncomeCategory(name) ? 'income' : 'expense',
      subCategories: Array.from(subcats)
    })),
    transactions
  }
}

/**
 * Convert MoneyFam transactions to Ollo CSV format
 * @param {Array<Object>} transactions - MoneyFam transactions
 * @param {Array<Object>} wallets - MoneyFam wallets
 * @param {Array<Object>} categories - MoneyFam categories
 * @returns {Array<Object>} Data in Ollo format
 */
export function convertMoneyFamToOllo(transactions, wallets, categories) {
  const walletMap = new Map(wallets.map(w => [w.id, w]))
  const categoryMap = new Map(categories.map(c => [c.id, c]))
  
  return transactions.map(t => {
    const wallet = walletMap.get(t.wallet_id)
    const destinationWallet = t.to_wallet_id ? walletMap.get(t.to_wallet_id) : null
    const category = categoryMap.get(t.category_id)

    return {
      Date: t.date,
      Title: t.description,
      Type: t.type.toUpperCase(),
      Wallet: wallet?.name || 'Unknown',
      'Destination Wallet': destinationWallet?.name || '',
      Category: category?.name || '',
      SubCategory: '',
      Amount: t.amount,
      Currency: 'IDR',
      Note: t.note || ''
    }
  })
}
