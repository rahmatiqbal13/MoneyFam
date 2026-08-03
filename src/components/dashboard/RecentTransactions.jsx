import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { useRecentTransactions } from '@/hooks/useTransactions'

function TransactionAmount({ type, amount }) {
  const isIncome = type === 'income'
  const isTransfer = type === 'transfer'
  return (
    <span
      className="text-sm font-semibold font-mono tabular-nums"
      style={{
        color: isIncome ? '#16A34A' : isTransfer ? 'var(--accent-ink)' : '#DC2626',
      }}
    >
      {isIncome ? '+' : isTransfer ? '' : '-'}
      {formatCurrency(amount)}
    </span>
  )
}

function TypeIcon({ type }) {
  const iconProps = { className: 'w-4 h-4' }
  if (type === 'income')
    return <ArrowUpRight {...iconProps} style={{ color: '#16A34A' }} />
  if (type === 'expense')
    return <ArrowDownRight {...iconProps} style={{ color: '#DC2626' }} />
  return <ArrowLeftRight {...iconProps} style={{ color: 'var(--accent-ink)' }} />
}

export function RecentTransactions() {
  const { data: transactions, isLoading } = useRecentTransactions(5)
  const reduceMotion = useReducedMotion()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--surface-2)' }} />
            <div className="flex-1">
              <div className="h-3.5 rounded-lg w-32 mb-1.5" style={{ background: 'var(--surface-2)' }} />
              <div className="h-3 rounded-lg w-20" style={{ background: 'var(--surface-2)' }} />
            </div>
            <div className="h-4 rounded-lg w-24" style={{ background: 'var(--surface-2)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!transactions?.length) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        Belum ada transaksi
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04, ease: 'easeOut' }}
          className="flex items-center gap-3 py-2.5 px-2 transition-colors"
          style={{ borderRadius: 'var(--r-sm)', cursor: 'default' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: tx.categories?.color ? tx.categories.color + '22' : 'var(--surface-2)',
            }}
          >
            <span className="text-base">
              {tx.categories?.icon || (tx.type === 'income' ? '💰' : tx.type === 'expense' ? '💸' : '🔄')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {tx.description || tx.categories?.name || '-'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
              {tx.wallets?.name} · {formatDateShort(tx.date)}
              {tx.creator_name && ` · ${tx.creator_name}`}
            </p>
          </div>
          <TransactionAmount type={tx.type} amount={tx.amount} />
        </motion.div>
      ))}
      <div className="pt-2">
        <Link
          to="/transactions"
          className="text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent-ink)' }}
        >
          Lihat semua transaksi →
        </Link>
      </div>
    </div>
  )
}
