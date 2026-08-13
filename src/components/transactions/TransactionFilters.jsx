import { Search, X, Filter } from 'lucide-react'
import { Select } from '@/components/ui/Select'
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
    <div
      className="p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Filter</span>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-3)' }} />
          <input
            type="text"
            placeholder="Cari deskripsi..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border focus:outline-none focus:ring-2"
            style={{ borderRadius: 'var(--r-sm)', background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line-2)' }}
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
        <div className="relative">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ dateFrom: e.target.value })}
            className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-2"
            style={{ borderRadius: 'var(--r-sm)', background: 'var(--surface)', color: 'var(--ink-2)', borderColor: 'var(--line-2)' }}
          />
          {filters.dateFrom && (
            <button
              onClick={() => setFilters({ dateFrom: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--ink-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
              title="Clear date filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
