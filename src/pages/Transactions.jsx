import { useState } from 'react'
import { Plus, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { useTransactions, useMonthlyStats } from '@/hooks/useTransactions'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/lib/utils'

function StatsBar({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-emerald-50 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">Pemasukan</p>
        <p className="text-sm font-bold text-emerald-600">
          {isLoading ? '-' : formatCurrency(stats?.income)}
        </p>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">Pengeluaran</p>
        <p className="text-sm font-bold text-red-500">
          {isLoading ? '-' : formatCurrency(stats?.expense)}
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">Tabungan</p>
        <p className="text-sm font-bold text-blue-600">
          {isLoading ? '-' : formatCurrency(Math.max(0, stats?.savings || 0))}
        </p>
      </div>
    </div>
  )
}

export default function Transactions() {
  const { filters } = useTransactionStore()
  const { data: transactions, isLoading } = useTransactions(filters)
  const now = new Date()
  const { data: stats, isLoading: statsLoading } = useMonthlyStats(now.getFullYear(), now.getMonth() + 1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

  const handleEdit = (tx) => {
    setEditingTx(tx)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingTx(null)
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Daftar Transaksi</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isLoading ? '...' : `${transactions?.length || 0} transaksi`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      {/* Monthly stats */}
      <StatsBar stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <TransactionFilters />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <TransactionList transactions={transactions || []} onEdit={handleEdit} />
      )}

      <TransactionModal
        isOpen={modalOpen}
        onClose={handleClose}
        transaction={editingTx}
      />
    </div>
  )
}
