import { useState, useEffect } from 'react'
import { StatStrip } from '@/components/ui/StatTile'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Avatar } from '@/components/ui/Avatar'
import { PageHeader } from '@/components/ui/PageHeader'
import { EnvelopeMark } from '@/components/ui/Envelope'
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
import { useViewport } from '@/hooks/useViewport'
import { memberColor } from '@/lib/memberColor'
import { idrShort, formatCurrency, fmtRelative } from '@/lib/utils'

const dayLabel = (d) => {
  const n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  const full = new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  return n <= 1 ? `${fmtRelative(d)}, ${full.split(', ')[1] || full}` : full
}

const TYPE_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'income', label: 'Masuk' },
  { id: 'expense', label: 'Keluar' },
]

const EMPTY_ADVANCED = { search: '', category_id: '', wallet_id: '', dateFrom: '', dateTo: '' }

function TransactionRow({ tx, member, wide, onClick }) {
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  const sub = [isTransfer ? 'Transfer' : tx.categories?.name, tx.wallets?.name].filter(Boolean).join(' · ')
  const who = tx.creator_name?.split(' ')[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className="tx-row"
      style={{
        width: '100%', display: 'grid', alignItems: 'center', gap: wide ? 14 : 12, textAlign: 'left',
        gridTemplateColumns: wide ? '30px minmax(0,1fr) 150px 140px' : '28px minmax(0,1fr) auto',
        padding: wide ? '12px 6px' : '11px 0', background: 'transparent', border: 'none',
        borderBottom: '1px solid var(--line)', cursor: 'pointer', color: 'inherit',
      }}
    >
      <EnvelopeMark color={tx.categories?.color} width={wide ? 30 : 28} height={wide ? 22 : 21} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.description || tx.categories?.name || '-'}
        </span>
        <span style={{ fontSize: wide ? 13 : 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {!wide && member && <span style={{ width: 7, height: 7, borderRadius: '50%', background: memberColor(member), flexShrink: 0 }} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[!wide && who, sub].filter(Boolean).join(' · ')}
          </span>
        </span>
      </span>
      {wide && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, minWidth: 0 }}>
          {member && <Avatar member={member} size={24} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who}</span>
        </span>
      )}
      <span
        className="font-mono"
        style={{ fontSize: wide ? 15 : 14, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', color: isIncome ? 'var(--good)' : isTransfer ? 'var(--ink-2)' : 'var(--ink)' }}
      >
        {isTransfer ? '' : isIncome ? '+' : '−'}{wide ? formatCurrency(tx.amount) : idrShort(Number(tx.amount))}
      </span>
    </button>
  )
}

export default function Transactions() {
  const { narrow, isMobile } = useViewport()
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

  const memberById = new Map(members.map((m) => [m.id, m]))
  const openNew = () => { setEditingTx(null); setModalOpen(true) }

  return (
    <div>
      <PageHeader
        title="Transaksi"
        eyebrow={isLoading ? 'Memuat…' : `${totalCount} transaksi${hasActiveFilter ? ' · terfilter' : ''}`}
        actions={[
          <Button key="add" onClick={openNew}>Catat transaksi</Button>,
          <Button key="filter" variant="secondary" onClick={openFilter}>
            <Icon name="filter" size={15} />
            Filter{advancedActive ? ' · aktif' : ''}
          </Button>,
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 16 : 24 }}>
        <StatStrip
          columns={isMobile ? 2 : 3}
          compact={isMobile}
          items={[
            { label: 'Masuk bulan ini', value: `+${formatCurrency(income)}`, tone: 'good' },
            { label: 'Keluar bulan ini', value: `−${formatCurrency(expense)}` },
            ...(isMobile ? [] : [{ label: 'Selisih bulan ini', value: formatCurrency(income - expense), tone: income - expense < 0 ? 'bad' : undefined }]),
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <SegmentedControl
            size="md"
            fill={isMobile}
            className={isMobile ? 'w-full' : undefined}
            value={filters.type || 'all'}
            options={TYPE_OPTIONS}
            onChange={(id) => setFilters({ type: id === 'all' ? '' : id })}
          />
          {members.length > 0 && (
            <div className="scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: isMobile ? '0 -18px' : 0, padding: isMobile ? '0 18px' : 0, maxWidth: isMobile ? 'none' : '100%' }}>
              {!isMobile && <span style={{ fontSize: 14, color: 'var(--ink-3)', marginRight: 4 }}>Siapa</span>}
              <SegmentedControl
                size="sm"
                nowrap
                value={memberId}
                onChange={setMemberId}
                options={[
                  { id: 'all', label: 'Semua' },
                  ...members.map((m) => ({ id: m.id, label: m.full_name?.split(' ')[0] || 'Anggota', dot: memberColor(m) })),
                ]}
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>Memuat transaksi…</p>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-3)' }}>
              {hasActiveFilter ? 'Belum ada transaksi yang cocok dengan filter ini.' : 'Belum ada transaksi. Catat pengeluaran pertama dari tombol di atas.'}
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => resetFilters()}
                style={{ marginTop: 10, border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: 'var(--ink)' }}
              >
                Hapus semua filter
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: narrow ? 'none' : 960 }}>
            {groups.map(([day, items]) => {
              const daySum = items.reduce((s, t) => s + (t.type === 'expense' ? Number(t.amount) : 0), 0)
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0 8px', borderBottom: '1.5px solid var(--ink)' }}>
                    <span className="font-display" style={{ fontWeight: 700, fontSize: narrow ? 15 : 17 }}>{dayLabel(day)}</span>
                    {daySum > 0 && (
                      <span className="font-mono" style={{ fontSize: narrow ? 12 : 13, color: 'var(--ink-2)' }}>−{idrShort(daySum)}</span>
                    )}
                  </div>
                  {items.map((t) => (
                    <TransactionRow key={t.id} tx={t} member={memberById.get(t.user_id)} wide={!isMobile} onClick={() => handleEdit(t)} />
                  ))}
                </div>
              )
            })}
          </div>
        )}

      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--ink-3)' }}>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Jumlah data per halaman"
              className="text-sm font-medium rounded-full px-3 py-1.5 outline-none"
              style={{
                background: 'transparent',
                color: 'var(--ink)',
                border: '1.5px solid var(--line-2)',
              }}
            >
              {TRANSACTIONS_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
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
                    aria-current={active ? 'page' : undefined}
                    className="w-9 h-9 rounded-full text-sm font-semibold font-mono transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--on-accent)' : 'var(--ink-2)',
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

      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter transaksi">
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
