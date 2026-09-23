import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { StatTile } from '@/components/ui/StatTile'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { useTransactions, useMonthlyStats, TRANSACTIONS_PAGE_SIZE_OPTIONS } from '@/hooks/useTransactions'
import { useFamilyMembers } from '@/hooks/useFamily'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useTransactionStore } from '@/stores/transactionStore'
import { idrShort, formatCurrency, fmtRelative, formatDate } from '@/lib/utils'

const dayLabel = (d) => {
  const n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  return n < 7 ? fmtRelative(d) : formatDate(d)
}

const TYPE_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'income', label: 'Masuk' },
  { id: 'expense', label: 'Keluar' },
]

const EMPTY_ADVANCED = { search: '', category_id: '', wallet_id: '', dateFrom: '', dateTo: '' }

function TransactionRow({ tx, onClick }) {
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  const color = tx.categories?.color || '#6b7280'
  const icon = tx.categories?.icon || (isIncome ? '💰' : tx.type === 'transfer' ? '🔄' : '💸')
  const meta = [tx.creator_name, tx.wallets?.name, fmtRelative(tx.date)].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-2 text-left transition-colors"
      style={{ borderRadius: 'var(--r-sm)', background: 'transparent', border: 'none', cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 42, height: 42, borderRadius: 14, background: color + '22', fontSize: 20 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {tx.description || tx.categories?.name || '-'}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
          {meta}
        </p>
      </div>
      <span
        className="text-sm font-bold font-mono tabular-nums whitespace-nowrap"
        style={{ color: isTransfer ? 'var(--ink-2)' : isIncome ? 'var(--good)' : 'var(--ink)' }}
      >
        {isTransfer ? '' : isIncome ? '+ ' : '− '}{formatCurrency(tx.amount)}
      </span>
    </button>
  )
}

export default function Transactions() {
  const { filters, page, pageSize, setFilters, resetFilters, setPage, setPageSize } = useTransactionStore()
  const { data: txData, isLoading, isError } = useTransactions(filters, page, pageSize)
  const transactions = txData?.data || []
  const totalCount = txData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const rangeStart = totalCount === 0 ? 0 : page * pageSize + 1
  const rangeEnd = Math.min(totalCount, (page + 1) * pageSize)

  // Halaman bisa "kelewatan" setelah data terakhir di halaman terakhir dihapus
  // (PostgREST membalas 416 / hasil kosong) — mundur satu halaman sampai valid.
  useEffect(() => {
    if (page > 0 && !isLoading && (isError || (txData && page >= totalPages))) {
      setPage(page - 1)
    }
  }, [page, isLoading, isError, txData, totalPages, setPage])

  const now = new Date()
  const { data: stats } = useMonthlyStats(now.getFullYear(), now.getMonth() + 1)
  const income = stats?.income || 0
  const expense = stats?.expense || 0

  const { data: members = [] } = useFamilyMembers()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_ADVANCED)

  const handleEdit = (tx) => {
    setEditingTx(tx)
    setModalOpen(true)
  }
  const handleClose = () => {
    setModalOpen(false)
    setEditingTx(null)
  }

  const openFilter = () => {
    setDraft({
      search: filters.search || '',
      category_id: filters.category_id || '',
      wallet_id: filters.wallet_id || '',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
    })
    setFilterOpen(true)
  }
  const applyFilter = () => {
    setFilters(draft)
    setFilterOpen(false)
  }
  const resetFilter = () => {
    setDraft(EMPTY_ADVANCED)
    setFilters(EMPTY_ADVANCED)
    setFilterOpen(false)
  }

  const memberId = filters.user_id || 'all'
  const setMemberId = (id) => setFilters({ user_id: id === 'all' ? '' : id })

  const advancedActive =
    !!filters.search || !!filters.category_id || !!filters.wallet_id || !!filters.dateFrom || !!filters.dateTo
  const hasActiveFilter = !!filters.type || memberId !== 'all' || advancedActive

  const groups = []
  const groupIndex = {}
  transactions.forEach((t) => {
    const key = t.date
    if (groupIndex[key] === undefined) {
      groupIndex[key] = groups.length
      groups.push([key, []])
    }
    groups[groupIndex[key]][1].push(t)
  })

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 lg:pb-8">
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Daftar Transaksi</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {isLoading ? '...' : `${totalCount} transaksi`}
        </p>
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile label="Pemasukan" value={idrShort(income)} />
        <StatTile label="Pengeluaran" value={idrShort(expense)} />
        <StatTile label="Net" value={idrShort(income - expense)} className="col-span-2 lg:col-span-1" />
      </div>

      {/* Filters */}
      <Card padding={16}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              value={filters.type || 'all'}
              options={TYPE_OPTIONS}
              onChange={(id) => setFilters({ type: id === 'all' ? '' : id })}
            />
            <button
              type="button"
              onClick={openFilter}
              className="relative inline-flex items-center gap-1.5"
              style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid ' + (advancedActive ? 'var(--ink)' : 'var(--line)'),
                background: 'transparent', color: 'var(--ink-2)',
              }}
            >
              <Icon name="filter" size={15} />
              Filter
              {advancedActive && (
                <span
                  style={{
                    position: 'absolute', top: -3, right: -3, width: 9, height: 9,
                    borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--surface)',
                  }}
                />
              )}
            </button>
          </div>
          {members.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMemberId('all')}
                style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid ' + (memberId === 'all' ? 'var(--ink)' : 'var(--line)'),
                  background: memberId === 'all' ? 'var(--ink)' : 'transparent',
                  color: memberId === 'all' ? 'var(--bg)' : 'var(--ink-2)',
                }}
              >
                Semua
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberId(m.id)}
                  title={m.full_name}
                  style={{
                    padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%',
                    outline: memberId === m.id ? '2px solid var(--accent)' : 'none', outlineOffset: 2,
                    opacity: memberId !== 'all' && memberId !== m.id ? 0.4 : 1,
                  }}
                >
                  <Avatar member={m} size={28} />
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--surface-2)' }} />
              <div className="flex-1">
                <div className="h-4 rounded w-32 mb-2" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3 rounded w-24" style={{ background: 'var(--surface-2)' }} />
              </div>
              <div className="h-4 rounded w-20" style={{ background: 'var(--surface-2)' }} />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card padding={0}>
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              {hasActiveFilter ? 'Tidak ada transaksi yang cocok dengan filter' : 'Belum ada transaksi'}
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => resetFilters()}
                className="mt-2 text-sm font-semibold hover:underline"
                style={{ color: 'var(--accent-ink)' }}
              >
                Reset filter
              </button>
            )}
          </div>
        </Card>
      ) : (
        <Card padding={12}>
          {groups.map(([day, items]) => {
            const daySum = items.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0)
            return (
              <div key={day}>
                <div
                  className="flex items-baseline justify-between"
                  style={{ padding: '12px 8px 8px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-3)' }}
                >
                  <span>{dayLabel(day)}</span>
                  {daySum > 0 && (
                    <span className="font-mono tabular-nums" style={{ color: 'var(--bad)' }}>
                      −{idrShort(daySum)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((t) => (
                    <TransactionRow key={t.id} tx={t} onClick={() => handleEdit(t)} />
                  ))}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Jumlah data per halaman"
              className="text-xs font-medium rounded-lg px-2 py-1.5 outline-none"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
              }}
            >
              {TRANSACTIONS_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
              {rangeStart}–{rangeEnd} dari {totalCount}
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: 'var(--ink-2)' }}
                aria-label="Halaman sebelumnya"
              >
                <Icon name="chevronL" size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                const active = pageNum === page
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--ink-2)',
                    }}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ color: 'var(--ink-2)' }}
                aria-label="Halaman berikutnya"
              >
                <Icon name="chevronR" size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Transaksi">
        <div className="space-y-4">
          <Input
            label="Cari deskripsi"
            type="text"
            placeholder="Makan siang, belanja..."
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          />
          <Select
            label="Kategori"
            value={draft.category_id}
            onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Kantong"
            value={draft.wallet_id}
            onChange={(e) => setDraft({ ...draft, wallet_id: e.target.value })}
          >
            <option value="">Semua kantong</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              label="Dari"
              type="date"
              className="flex-1"
              value={draft.dateFrom}
              onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
            />
            <Input
              label="Sampai"
              type="date"
              className="flex-1"
              value={draft.dateTo}
              onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={resetFilter}>
              Reset
            </Button>
            <Button type="button" className="flex-1" onClick={applyFilter}>
              Terapkan
            </Button>
          </div>
        </div>
      </Sheet>

      <TransactionModal isOpen={modalOpen} onClose={handleClose} transaction={editingTx} />
    </div>
  )
}
