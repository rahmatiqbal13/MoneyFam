import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { HeroCard } from '@/components/ui/HeroCard'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Ring } from '@/components/ui/Ring'
import { Icon } from '@/components/ui/Icon'
import { BudgetModal } from '@/components/budget/BudgetModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useBudgets, useDeleteBudget, useCopyBudgetFromLastMonth } from '@/hooks/useBudget'
import { useBudgetStore } from '@/stores/budgetStore'
import { formatCurrency, idrShort, getBudgetStatus, toDateStr } from '@/lib/utils'

export default function Budget() {
  const toast = useToast()
  const { selectedMonth, setSelectedMonth } = useBudgetStore()

  const { data: budgets, isLoading } = useBudgets(selectedMonth)
  const deleteMutation = useDeleteBudget()
  const copyMutation = useCopyBudgetFromLastMonth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)

  const navigateMonth = (dir) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const d = new Date(year, month - 1 + dir, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthDate = new Date(selectedMonth + '-01')
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(monthDate)
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(monthDate)

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.amount || 0), 0) || 0
  const totalSpent = budgets?.reduce((s, b) => s + Number(b.spent || 0), 0) || 0
  const left = totalBudget - totalSpent
  const spentPct = Math.round((totalSpent / totalBudget) * 100) || 0

  // Days left — only meaningful when viewing the current month
  const now = new Date()
  const isCurrentMonth = selectedMonth === toDateStr(now).slice(0, 7)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const daysLeft = isCurrentMonth ? daysInMonth - now.getDate() : 0

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingBudget(null)
  }

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Anggaran' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  const handleCopyFromLastMonth = async () => {
    if (budgets?.length > 0) {
      setCopyConfirmOpen(true)
      return
    }
    await executeCopy()
  }

  const executeCopy = async () => {
    try {
      await copyMutation.mutateAsync(selectedMonth)
      toast.success('Anggaran berhasil disalin dari bulan lalu')
      setCopyConfirmOpen(false)
    } catch (err) {
      toast.error(err.message || 'Gagal menyalin anggaran')
    }
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => navigateMonth(-1)}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 999, color: 'var(--ink-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Bulan sebelumnya"
        >
          <Icon name="chevronL" size={18} />
        </button>
        <span className="text-sm font-semibold text-center" style={{ color: 'var(--ink)', minWidth: 150 }}>
          {monthLabel}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 999, color: 'var(--ink-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Bulan berikutnya"
        >
          <Icon name="chevronR" size={18} />
        </button>
      </div>

      {/* Hero */}
      <HeroCard
        label={`Sisa Bulan ${monthName}`}
        value={formatCurrency(left)}
        sub={
          daysLeft > 0
            ? `dari ${formatCurrency(totalBudget)} • ${daysLeft} hari tersisa`
            : `dari ${formatCurrency(totalBudget)}`
        }
        right={
          <Ring value={totalSpent} max={totalBudget || 1} size={104} stroke={10} color="#fff" track="rgba(255,255,255,.18)">
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div className="font-display" style={{ fontSize: 24, lineHeight: 1 }}>{spentPct}%</div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>terpakai</div>
            </div>
          </Ring>
        }
      />

      {/* Category budgets */}
      <Card padding={0}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 sm:px-5">
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Anggaran per Kategori
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyFromLastMonth}
              loading={copyMutation.isPending}
            >
              <Icon name="download" size={14} />
              Salin bulan lalu
            </Button>
            <Button variant="soft" size="sm" onClick={() => { setEditingBudget(null); setModalOpen(true) }}>
              <Icon name="plus" size={14} stroke={2.2} />
              Tambah
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 pb-4 sm:px-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--surface-2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded w-1/3" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-2 rounded-full w-full" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : !budgets?.length ? (
          <div className="px-4 pb-10 pt-6 text-center sm:px-5">
            <div
              className="mx-auto mb-3 flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-soft)' }}
            >
              <Icon name="pie" size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Belum ada anggaran</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
              Buat anggaran untuk mengontrol pengeluaran bulan ini.
            </p>
            <Button className="mt-4" size="sm" onClick={() => { setEditingBudget(null); setModalOpen(true) }}>
              <Icon name="plus" size={14} stroke={2.2} />
              Tambah Anggaran
            </Button>
          </div>
        ) : (
          <div>
            {budgets.map((b) => {
              const spent = Number(b.spent || 0)
              const amount = Number(b.amount || 0)
              const pct = amount > 0 ? (spent / amount) * 100 : 0
              const status = getBudgetStatus(spent, amount)
              const over = status === 'over'
              const catColor = b.categories?.color || '#6b7280'
              const statusColor =
                status === 'over' ? 'var(--bad)' : status === 'warning' ? 'var(--warn)' : (b.categories?.color || 'var(--accent)')

              return (
                <div
                  key={b.id}
                  onClick={() => handleEdit(b)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors sm:px-5"
                  style={{ borderTop: '1px solid var(--line)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 40, height: 40, borderRadius: 14, background: catColor + '22', fontSize: 20 }}
                  >
                    {b.categories?.icon || '📦'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {b.categories?.name || 'Kategori'}
                      </span>
                      <span
                        className="text-xs font-mono tabular-nums font-bold whitespace-nowrap"
                        style={{ color: over ? 'var(--bad)' : 'var(--ink)' }}
                      >
                        {idrShort(spent)} / {idrShort(amount)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={Math.min(spent, amount)} max={amount || 1} color={statusColor} height={6} />
                    </div>
                    <div className="flex justify-between mt-1.5" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      <span>{Math.round(pct)}% terpakai</span>
                      <span>
                        {over ? `Lebih ${idrShort(spent - amount)}` : `Sisa ${idrShort(amount - spent)}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(b.id) }}
                    className="flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ width: 30, height: 30, borderRadius: 999, color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.background = 'transparent' }}
                    aria-label="Hapus anggaran"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <BudgetModal
        isOpen={modalOpen}
        onClose={handleClose}
        budget={editingBudget}
        yearMonth={selectedMonth}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Anggaran"
        message="Yakin ingin menghapus anggaran ini?"
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
        onConfirm={executeCopy}
        title="Salin Anggaran Bulan Lalu"
        message={`Sudah ada ${budgets?.length || 0} anggaran di bulan ini. Lanjutkan akan menambah anggaran baru dari bulan lalu.`}
        confirmLabel="Salin"
        loading={copyMutation.isPending}
      />
    </div>
  )
}
