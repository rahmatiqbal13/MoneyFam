import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useRecentTransactions } from '@/hooks/useTransactions'

function TransactionIcon({ type }) {
  if (type === 'income') return <ArrowUpRight className="w-4 h-4 text-emerald-500" />
  if (type === 'expense') return <ArrowDownRight className="w-4 h-4 text-red-500" />
  return <ArrowLeftRight className="w-4 h-4 text-blue-500" />
}

function TransactionAmount({ type, amount }) {
  const isIncome = type === 'income'
  const isTransfer = type === 'transfer'
  return (
    <span
      className={`text-sm font-semibold ${
        isIncome ? 'text-emerald-600' : isTransfer ? 'text-blue-600' : 'text-red-500'
      }`}
    >
      {isIncome ? '+' : isTransfer ? '' : '-'}
      {formatCurrency(amount)}
    </span>
  )
}

export function RecentTransactions() {
  const { data: transactions, isLoading } = useRecentTransactions(5)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 bg-gray-100 rounded-lg" />
            <div className="flex-1">
              <div className="h-3.5 bg-gray-100 rounded w-32 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (!transactions?.length) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        Belum ada transaksi
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: tx.categories?.color ? tx.categories.color + '20' : '#f3f4f6' }}
          >
            <span className="text-base">
              {tx.categories?.icon || (tx.type === 'income' ? '💰' : tx.type === 'expense' ? '💸' : '🔄')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {tx.description || tx.categories?.name || '-'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {tx.wallets?.name} · {formatDateShort(tx.date)}
            </p>
          </div>
          <TransactionAmount type={tx.type} amount={tx.amount} />
        </div>
      ))}
      <div className="pt-2">
        <Link
          to="/transactions"
          className="text-xs text-primary font-medium hover:underline"
        >
          Lihat semua transaksi →
        </Link>
      </div>
    </div>
  )
}
