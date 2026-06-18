import { useState } from 'react'
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, FilterX } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TransactionTypeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useDeleteTransaction } from '@/hooks/useTransactions'

function EmptyState({ hasFilters, onResetFilters }) {
  if (hasFilters) {
    return (
      <div className="py-16 text-center">
        <FilterX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Tidak ada transaksi yang cocok dengan filter</p>
        <p className="text-gray-400 text-xs mt-1 mb-3">Coba ubah filter atau reset filter</p>
        <button
          onClick={onResetFilters}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Reset Filter
        </button>
      </div>
    )
  }

  return (
    <div className="py-16 text-center">
      <ArrowLeftRight className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">Belum ada transaksi</p>
      <p className="text-gray-300 text-xs mt-1">Tambah transaksi pertama kamu</p>
    </div>
  )
}

export function TransactionList({ transactions = [], onEdit, filters = {}, onResetFilters }) {
  const deleteMutation = useDeleteTransaction()
  const [deleteId, setDeleteId] = useState(null)

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Transaksi' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  const hasFilters = filters.search || filters.type || filters.category_id || filters.wallet_id || filters.dateFrom || filters.dateTo

  if (!transactions.length) return <EmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />

  return (
    <>
      <div className="space-y-1">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 py-3 px-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{ backgroundColor: (tx.categories?.color || '#6b7280') + '20' }}
            >
              {tx.categories?.icon || (
                tx.type === 'income' ? '💰' : tx.type === 'expense' ? '💸' : '🔄'
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {tx.description || tx.categories?.name || '-'}
                </p>
                <TransactionTypeBadge type={tx.type} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                {tx.wallets && (
                  <>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-400">{tx.wallets.name}</p>
                  </>
                )}
                {tx.categories && (
                  <>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-400">{tx.categories.name}</p>
                  </>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-sm font-semibold ${
                  tx.type === 'income'
                    ? 'text-emerald-600'
                    : tx.type === 'transfer'
                    ? 'text-blue-600'
                    : 'text-red-500'
                }`}
              >
                {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}
                {formatCurrency(tx.amount)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(tx)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                  title="Edit"
                  aria-label="Edit transaksi"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(tx.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Hapus"
                  aria-label="Hapus transaksi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Transaksi"
        message="Yakin ingin menghapus transaksi ini? Kamu bisa membatalkan dalam 5 detik."
        loading={deleteMutation.isPending}
      />
    </>
  )
}
