import { Search, X, Filter } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useTransactionStore } from '@/stores/transactionStore'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'

export function TransactionFilters() {
  const { filters, setFilters, resetFilters } = useTransactionStore()
  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()

  const hasFilters =
    filters.search || filters.type || filters.category_id || filters.wallet_id || filters.dateFrom || filters.dateTo

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter</span>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari deskripsi..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
          />
        </div>

        {/* Type */}
        <Select
          value={filters.type}
          onChange={(e) => setFilters({ type: e.target.value })}
        >
          <option value="">Semua Tipe</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
          <option value="transfer">Transfer</option>
        </Select>

        {/* Category */}
        <Select
          value={filters.category_id}
          onChange={(e) => setFilters({ category_id: e.target.value })}
        >
          <option value="">Semua Kategori</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        {/* Wallet */}
        <Select
          value={filters.wallet_id}
          onChange={(e) => setFilters({ wallet_id: e.target.value })}
        >
          <option value="">Semua Kantong</option>
          {wallets?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>

        {/* Date From */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ dateFrom: e.target.value })}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary text-gray-600"
        />
      </div>
    </div>
  )
}
