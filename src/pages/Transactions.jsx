import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { useTransactions, useMonthlyStats, TRANSACTIONS_PAGE_SIZE } from '@/hooks/useTransactions'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/lib/utils'

function StatsBar({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-emerald-50 rounded-xl p-3 text-center">
        <p className="text-xs text-ink-2">Pemasukan</p>
        <p className="text-sm font-bold text-emerald-600">
          {isLoading ? '-' : formatCurrency(stats?.income)}
        </p>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <p className="text-xs text-ink-2">Pengeluaran</p>
        <p className="text-sm font-bold text-red-500">
          {isLoading ? '-' : formatCurrency(stats?.expense)}
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-center">
        <p className="text-xs text-ink-2">Tabungan</p>
        <p className="text-sm font-bold text-blue-600">
          {isLoading ? '-' : formatCurrency(Math.max(0, stats?.savings || 0))}
        </p>
      </div>
    </div>
  )
}

export default function Transactions() {
  const { filters, page, resetFilters, setPage } = useTransactionStore()
  const { data: txData, isLoading } = useTransactions(filters, page)
  const transactions = txData?.data || []
  const totalCount = txData?.count || 0
  const totalPages = Math.ceil(totalCount / TRANSACTIONS_PAGE_SIZE)

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
          <h2 className="text-base font-semibold text-ink">Daftar Transaksi</h2>
          <p className="text-xs text-ink-3 mt-0.5">
            {isLoading ? '...' : `${totalCount} transaksi`}
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
            <div key={i} className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-line animate-pulse">
              <div className="w-10 h-10 bg-surface-2 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-surface-2 rounded w-32 mb-2" />
                <div className="h-3 bg-surface-2 rounded w-24" />
              </div>
              <div className="h-4 bg-surface-2 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <TransactionList transactions={transactions} onEdit={handleEdit} filters={filters} onResetFilters={resetFilters} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ink-3">
            Halaman {page + 1} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    pageNum === page ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={modalOpen}
        onClose={handleClose}
        transaction={editingTx}
      />
    </div>
  )
}
