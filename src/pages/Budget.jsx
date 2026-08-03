import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Copy, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BudgetCard } from '@/components/budget/BudgetCard'
import { BudgetModal } from '@/components/budget/BudgetModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useBudgets, useDeleteBudget, useCopyBudgetFromLastMonth } from '@/hooks/useBudget'
import { useBudgetStore } from '@/stores/budgetStore'
import { formatCurrency, getBudgetStatus } from '@/lib/utils'

export default function Budget() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const { selectedMonth, setSelectedMonth } = useBudgetStore()

  const { data: budgets, isLoading } = useBudgets(selectedMonth)
  const deleteMutation = useDeleteBudget()
  const copyMutation = useCopyBudgetFromLastMonth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)

  // Month navigation
  const navigateMonth = (dir) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const d = new Date(year, month - 1 + dir, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(selectedMonth + '-01')
  )

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.amount || 0), 0) || 0
  const totalSpent = budgets?.reduce((s, b) => s + Number(b.spent || 0), 0) || 0
  const overCount = budgets?.filter((b) => getBudgetStatus(b.spent, b.amount) === 'over').length || 0

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setModalOpen(true)
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

  const handleClose = () => {
    setModalOpen(false)
    setEditingBudget(null)
  }

  const handleCopyFromLastMonth = async () => {
    // Check if budgets already exist for this month
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
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-surface-2">
            <ChevronLeft className="w-5 h-5 text-ink-2" />
          </button>
          <h2 className="text-base font-semibold text-ink min-w-36 text-center">{monthLabel}</h2>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-surface-2">
            <ChevronRight className="w-5 h-5 text-ink-2" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyFromLastMonth}
            loading={copyMutation.isPending}
          >
            <Copy className="w-4 h-4" />
            Salin Bulan Lalu
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Summary */}
      {budgets?.length > 0 && (
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-ink-3">Total Anggaran</p>
              <p className="text-sm font-bold text-ink">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-3">Terpakai</p>
              <p className="text-sm font-bold text-ink">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-3">{totalSpent > totalBudget ? 'Lebih' : 'Sisa'}</p>
              <p className={`text-sm font-bold ${totalSpent > totalBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(totalBudget - totalSpent))}
              </p>
            </div>
          </div>
          {overCount > 0 && (
            <div className="mt-3 pt-3 border-t border-line">
              <p className="text-xs text-red-500 font-medium">
                ⚠️ {overCount} kategori melebihi anggaran
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-line p-4 animate-pulse">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-surface-2 rounded-lg" />
                <div className="h-4 bg-surface-2 rounded w-24" />
              </div>
              <div className="h-2 bg-surface-2 rounded-full w-full" />
            </div>
          ))}
        </div>
      ) : !budgets?.length ? (
        <div className="py-16 text-center">
          <PieChart className="w-12 h-12 text-ink-3 mx-auto mb-3" />
          <p className="text-ink-3 font-medium">Belum ada anggaran bulan ini</p>
          <p className="text-ink-3 text-sm mt-1">Buat anggaran untuk mengontrol pengeluaran</p>
          <Button className="mt-4" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah Anggaran
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((budget, i) => (
            <motion.div
              key={budget.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.24), ease: 'easeOut' }}
            >
              <BudgetCard
                budget={budget}
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            </motion.div>
          ))}
        </div>
      )}

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
        message={`Sudah ada ${budgets?.length} anggaran di bulan ini. Lanjutkan akan menambah anggaran baru dari bulan lalu.`}
        loading={copyMutation.isPending}
      />
    </div>
  )
}
