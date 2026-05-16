import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(dateString, options = {}) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function formatDateShort(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function formatMonthYear(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
}

export function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
}

export function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(d),
      start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
    })
  }
  return months
}

export function getTransactionTypeLabel(type) {
  const labels = {
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    transfer: 'Transfer',
  }
  return labels[type] || type
}

export function getTransactionTypeColor(type) {
  const colors = {
    income: 'text-emerald-600',
    expense: 'text-red-500',
    transfer: 'text-blue-500',
  }
  return colors[type] || 'text-gray-600'
}

export function getBudgetStatus(spent, budget) {
  if (!budget || budget === 0) return 'none'
  const pct = (spent / budget) * 100
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warning'
  return 'good'
}

export function getBudgetProgressColor(spent, budget) {
  const status = getBudgetStatus(spent, budget)
  if (status === 'over') return 'bg-red-500'
  if (status === 'warning') return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function truncate(str, n = 30) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '...' : str
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export function formatDistanceToNow(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (seconds < 60) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit yang lalu`
    if (hours < 24) return `${hours} jam yang lalu`
    if (days < 30) return `${days} hari yang lalu`
    if (months < 12) return `${months} bulan yang lalu`
    return `${years} tahun yang lalu`
  } catch {
    return ''
  }
}
