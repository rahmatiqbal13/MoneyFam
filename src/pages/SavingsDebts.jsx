import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Target, CheckCircle2,
  Calendar, TrendingDown, TrendingUp, Minus, CreditCard,
  History, Clock, Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  useSavingsGoals,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
  useAddSavingsPayment,
  useSavingsPayments,
  useUpdateSavingsPayment,
  useDeleteSavingsPayment,
} from '@/hooks/useSavingsGoals'
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  useMarkDebtPaid,
  useAddDebtPayment,
  useDebtPayments,
  useUpdateDebtPayment,
  useDeleteDebtPayment,
} from '@/hooks/useDebts'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function progressPct(current, target) {
  if (!target || target === 0) return 0
  return Math.min(100, (current / target) * 100)
}

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '📱', '💍', '🎓', '💻', '🏋️', '🌴', '💰', '🏖️']
const GOAL_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#84cc16',
]

// ── Savings Goal Modal ────────────────────────────────────────────────────────

function SavingsGoalModal({ isOpen, onClose, goal }) {
  const toast = useToast()
  const createMutation = useCreateSavingsGoal()
  const updateMutation = useUpdateSavingsGoal()
  const isEdit = !!goal

  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: 0,
    target_date: '',
    icon: '🎯',
    color: '#10b981',
  })
  const [errors, setErrors] = useState({})

  // Reset form setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: goal?.name || '',
        target_amount: goal?.target_amount || '',
        current_amount: goal?.current_amount || 0,
        target_date: goal?.target_date || '',
        icon: goal?.icon || '🎯',
        color: goal?.color || '#10b981',
      })
      setErrors({})
    }
  }, [isOpen, goal])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Nama wajib diisi'
    if (!form.target_amount || Number(form.target_amount) <= 0)
      err.target_amount = 'Target harus lebih dari 0'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) { setErrors(err); return }
    setErrors({})

    const payload = {
      name: form.name.trim(),
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount) || 0,
      target_date: form.target_date || null,
      icon: form.icon,
      color: form.color,
      is_completed: Number(form.current_amount) >= Number(form.target_amount),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: goal.id, ...payload })
        toast.success('Target tabungan diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Target tabungan ditambahkan')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'}>
      <ModalBody>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Icon + Color picker */}
        <div>
          <label className="text-sm font-medium text-ink-2 block mb-2">Ikon</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${
                  form.icon === ic ? 'border-primary bg-primary/10' : 'border-line hover:border-line-2'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-2 block mb-2">Warna</label>
          <div className="flex gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Input
          label="Nama Target"
          placeholder="Contoh: Dana Liburan, DP Rumah..."
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          required
        />
        <Input
          label="Target Jumlah (Rp)"
          type="number"
          placeholder="50000000"
          value={form.target_amount}
          onChange={set('target_amount')}
          error={errors.target_amount}
          required
        />
        <Input
          label="Dana Terkumpul Saat Ini (Rp)"
          type="number"
          placeholder="0"
          value={form.current_amount}
          onChange={set('current_amount')}
          helpText="Opsional jika sudah ada dana awal"
        />
        <Input
          label="Target Tanggal"
          type="date"
          value={form.target_date}
          onChange={set('target_date')}
          helpText="Opsional"
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  )
}

// ── Add/Pay to Goal Modal ─────────────────────────────────────────────────────

function AddFundModal({ isOpen, onClose, goal }) {
  const toast = useToast()
  const addMutation = useAddSavingsPayment()
  const { data: wallets } = useWallets()
  const { data: expenseCategories } = useCategories('expense')
  const { data: incomeCategories } = useCategories('income')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('add')
  const [walletId, setWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().slice(0, 5))
  const [note, setNote] = useState('')

  const categories = mode === 'add' ? expenseCategories : incomeCategories

  // Auto-select kategori default saat mode/wallet berubah
  useEffect(() => {
    if (!walletId) { setCategoryId(''); return }
    if (mode === 'add') {
      const def = (expenseCategories || []).find((c) => c.name === 'Tabungan')
      setCategoryId(def?.id || '')
    } else {
      const def = (incomeCategories || []).find((c) => c.name === 'Lain-lain')
      setCategoryId(def?.id || '')
    }
  }, [mode, walletId, expenseCategories, incomeCategories])

  useEffect(() => {
    if (isOpen) { 
      setAmount(''); 
      setMode('add'); 
      setWalletId(''); 
      setCategoryId('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentTime(new Date().toTimeString().slice(0, 5));
      setNote('');
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = Number(amount)
    if (!val || val <= 0) return

    try {
      await addMutation.mutateAsync({
        goalId: goal.id,
        amount: val,
        type: mode === 'add' ? 'deposit' : 'withdrawal',
        paymentDate,
        paymentTime,
        walletId: walletId || null,
        categoryId: walletId ? (categoryId || null) : null,
        note: note || null,
      })
      toast.success(mode === 'add' ? 'Dana berhasil ditambahkan' : 'Dana berhasil dikurangi')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal update dana')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Dana — ${goal?.name}`}>
      <ModalBody>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <p className="text-xs text-ink-2">Dana terkumpul</p>
          <p className="text-2xl font-bold text-ink mt-1">
            {formatCurrency(goal?.current_amount || 0)}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">
            dari {formatCurrency(goal?.target_amount || 0)}
          </p>
        </div>

        <div className="flex rounded-lg border border-line overflow-hidden">
          {[{ key: 'add', label: 'Tambah Dana', icon: Plus }, { key: 'reduce', label: 'Kurangi Dana', icon: Minus }].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                mode === key ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <Input
          label="Jumlah (Rp)"
          type="number"
          placeholder="500000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        {/* Date and Time */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink-2">
            Tanggal & Waktu Pembayaran
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
            />
            <input
              type="time"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
              className="w-28 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
            />
          </div>
        </div>

        <Input
          label="Catatan (Opsional)"
          type="text"
          placeholder="Contoh: Tabungan dari gaji bulan Mei"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Select
          label="Potong dari Wallet (opsional)"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          helpText={walletId ? 'Saldo wallet akan terpotong otomatis dan tercatat di transaksi' : 'Kosongkan jika tidak ingin memotong saldo wallet (hanya catat di tabungan saja)'}
        >
          <option value="">— Tidak dari wallet —</option>
          {(wallets || []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name} ({formatCurrency(w.balance)})
            </option>
          ))}
        </Select>

        {walletId && (
          <Select
            label="Kategori Transaksi"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            helpText="Kategori yang akan muncul di riwayat transaksi"
          >
            <option value="">— Tanpa kategori —</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={addMutation.isPending}>
            Simpan
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  )
}

// ── Savings Payment History Component ─────────────────────────────────────────

function SavingsPaymentHistory({ goalId }) {
  const { data: payments, isLoading } = useSavingsPayments(goalId)
  const [editPayment, setEditPayment] = useState(null)
  const [deletePayment, setDeletePayment] = useState(null)
  const updateMutation = useUpdateSavingsPayment()
  const deleteMutation = useDeleteSavingsPayment()
  const toast = useToast()

  if (isLoading) {
    return <div className="text-center py-4 text-ink-3 text-sm">Memuat riwayat...</div>
  }

  if (!payments?.length) {
    return <div className="text-center py-4 text-ink-3 text-sm">Belum ada riwayat pembayaran</div>
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await updateMutation.mutateAsync({
        paymentId: editPayment.id,
        goalId: editPayment.goal_id,
        amount: Number(formData.get('amount')),
        paymentDate: formData.get('paymentDate'),
        paymentTime: formData.get('paymentTime'),
        note: formData.get('note'),
      })
      toast.success('Pembayaran diperbarui')
      setEditPayment(null)
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui')
    }
  }

  const { triggerDelete } = useUndoableDelete(
    async (payment) => {
      await deleteMutation.mutateAsync({
        paymentId: payment.id,
        goalId: payment.goal_id,
      })
    },
    { itemName: 'Pembayaran' }
  )

  const handleDelete = () => {
    triggerDelete(deletePayment)
    setDeletePayment(null)
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-line">
        <h4 className="text-xs font-semibold text-ink-2 mb-3 flex items-center gap-1">
          <History className="w-3 h-3" />
          Riwayat Pembayaran ({payments.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-2 bg-surface-2 rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${payment.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {payment.type === 'deposit' ? '+' : '-'}{formatCurrency(payment.amount)}
                  </span>
                  <span className="text-xs text-ink-3">
                    {formatDate(payment.payment_date)} {payment.payment_time?.slice(0, 5)}
                  </span>
                </div>
                {payment.note && (
                  <p className="text-xs text-ink-2 truncate">{payment.note}</p>
                )}
                {payment.wallets && (
                  <p className="text-xs text-ink-3 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {payment.wallets.icon} {payment.wallets.name}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => setEditPayment(payment)}
                  className="p-1 rounded text-ink-3 hover:text-blue-500 hover:bg-blue-50"
                  aria-label="Edit pembayaran"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setDeletePayment(payment)}
                  className="p-1 rounded text-ink-3 hover:text-red-500 hover:bg-red-50"
                  aria-label="Hapus pembayaran"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editPayment && (
        <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Pembayaran" size="sm">
          <ModalBody>
            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Jumlah (Rp)"
                name="amount"
                type="number"
                defaultValue={editPayment.amount}
                required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-2">Tanggal & Waktu</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="paymentDate"
                    defaultValue={editPayment.payment_date}
                    className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="time"
                    name="paymentTime"
                    defaultValue={editPayment.payment_time?.slice(0, 5) || '12:00'}
                    className="w-28 rounded-lg border border-line-2 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <Input
                label="Catatan"
                name="note"
                type="text"
                defaultValue={editPayment.note || ''}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditPayment(null)}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
                  Simpan
                </Button>
              </div>
            </form>
          </ModalBody>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletePayment}
        onClose={() => setDeletePayment(null)}
        onConfirm={handleDelete}
        title="Hapus Pembayaran"
        message={`Yakin ingin menghapus pembayaran ${formatCurrency(deletePayment?.amount)}?`}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ── Savings Goal Card ─────────────────────────────────────────────────────────

function SavingsGoalCard({ goal, onEdit, onDelete, onAddFund }) {
  const pct = progressPct(goal.current_amount, goal.target_amount)
  const days = daysUntil(goal.target_date)
  const isOverdue = days !== null && days < 0 && !goal.is_completed
  const [showHistory, setShowHistory] = useState(false)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: `${goal.color}20` }}
            >
              {goal.icon}
            </div>
            <div>
              <p className="font-semibold text-ink">{goal.name}</p>
              {goal.is_completed ? (
                <Badge variant="green" className="mt-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Tercapai!
                </Badge>
              ) : goal.target_date ? (
                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-ink-3'}`}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {isOverdue
                    ? `Terlewat ${Math.abs(days)} hari`
                    : days === 0
                    ? 'Hari ini!'
                    : `${days} hari lagi`}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-surface-2 transition-colors"
              aria-label="Edit target tabungan"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Hapus target tabungan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-ink">{formatCurrency(goal.current_amount)}</span>
            <span className="text-ink-3">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: goal.color || '#10b981' }}
            />
          </div>
          <div className="flex justify-between text-xs text-ink-3">
            <span>{pct.toFixed(1)}% terkumpul</span>
            <span>Sisa {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!goal.is_completed && (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => onAddFund(goal)}
            >
              <Plus className="w-4 h-4" />
              Update Dana
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Sembunyikan' : 'Riwayat'}
          </Button>
        </div>

        {/* Payment History */}
        {showHistory && <SavingsPaymentHistory goalId={goal.id} />}
      </CardContent>
    </Card>
  )
}

// ── Debt Modal ────────────────────────────────────────────────────────────────

function DebtModal({ isOpen, onClose, debt }) {
  const toast = useToast()
  const createMutation = useCreateDebt()
  const updateMutation = useUpdateDebt()
  const isEdit = !!debt

  const [form, setForm] = useState({
    name: '',
    type: 'debt',
    amount: '',
    due_date: '',
    description: '',
  })
  const [errors, setErrors] = useState({})

  // Reset form setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: debt?.name || '',
        type: debt?.type || 'debt',
        amount: debt?.amount || '',
        due_date: debt?.due_date || '',
        description: debt?.description || '',
      })
      setErrors({})
    }
  }, [isOpen, debt])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Nama wajib diisi'
    if (!form.amount || Number(form.amount) <= 0) err.amount = 'Jumlah harus lebih dari 0'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) { setErrors(err); return }
    setErrors({})

    const payload = {
      name: form.name.trim(),
      type: form.type,
      amount: Number(form.amount),
      due_date: form.due_date || null,
      description: form.description.trim() || null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: debt.id,
          ...payload,
          remaining_amount: debt.remaining_amount,
        })
        toast.success('Data berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Data berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Data Hutang/Piutang' : 'Tambah Hutang/Piutang'}>
      <ModalBody>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Tipe" value={form.type} onChange={set('type')}>
          <option value="debt">🔴 Hutang (kamu yang berhutang)</option>
          <option value="receivable">🟢 Piutang (orang lain berhutang ke kamu)</option>
        </Select>
        <Input
          label="Nama / Keterangan Singkat"
          placeholder="Contoh: Pinjaman ke Budi, Cicilan Motor..."
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          required
        />
        <Input
          label="Total Jumlah (Rp)"
          type="number"
          placeholder="5000000"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
          required
          helpText={isEdit ? 'Mengubah ini tidak mengubah sisa yang harus dibayar' : ''}
        />
        <Input
          label="Jatuh Tempo"
          type="date"
          value={form.due_date}
          onChange={set('due_date')}
          helpText="Opsional"
        />
        <Input
          label="Catatan"
          placeholder="Info tambahan..."
          value={form.description}
          onChange={set('description')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  )
}

// ── Pay Debt Modal ────────────────────────────────────────────────────────────

function PayDebtModal({ isOpen, onClose, debt }) {
  const toast = useToast()
  const payMutation = useAddDebtPayment()
  const { data: wallets } = useWallets()
  const { data: expenseCategories } = useCategories('expense')
  const { data: incomeCategories } = useCategories('income')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().slice(0, 5))
  const [note, setNote] = useState('')

  const isDebt = debt?.type === 'debt'
  const categories = isDebt ? expenseCategories : incomeCategories
  const defaultCatName = isDebt ? 'Cicilan & Hutang' : 'Piutang Diterima'
  const typeLabel = isDebt ? 'Hutang' : 'Piutang'
  const walletLabel = isDebt ? 'Bayar dari Wallet (opsional)' : 'Terima ke Wallet (opsional)'
  const walletHint = isDebt
    ? 'Saldo wallet akan berkurang sebesar jumlah pembayaran dan tercatat di transaksi'
    : 'Saldo wallet akan bertambah sebesar jumlah yang diterima dan tercatat di transaksi'

  useEffect(() => {
    if (!walletId) { setCategoryId(''); return }
    const def = (categories || []).find((c) => c.name === defaultCatName)
    setCategoryId(def?.id || '')
  }, [walletId, categories, defaultCatName])

  useEffect(() => {
    if (isOpen) { 
      setAmount(''); 
      setWalletId(''); 
      setCategoryId('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentTime(new Date().toTimeString().slice(0, 5));
      setNote('');
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = Number(amount)
    if (!val || val <= 0) return

    try {
      await payMutation.mutateAsync({
        debtId: debt.id,
        amount: val,
        paymentDate,
        paymentTime,
        walletId: walletId || null,
        categoryId: walletId ? (categoryId || null) : null,
        note: note || null,
      })
      toast.success('Pembayaran tercatat')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal mencatat pembayaran')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Catat Pembayaran — ${debt?.name}`}>
      <ModalBody>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-2">Sisa {typeLabel}</span>
            <span className="font-bold text-ink">{formatCurrency(debt?.remaining_amount)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-3">
            <span>Total awal</span>
            <span>{formatCurrency(debt?.amount)}</span>
          </div>
        </div>

        <Input
          label="Jumlah Pembayaran (Rp)"
          type="number"
          placeholder={String(debt?.remaining_amount || '')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          helpText="Gunakan tombol 'Lunas' untuk melunasi sekaligus"
          required
        />

        {/* Date and Time */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-ink-2">
            Tanggal & Waktu Pembayaran
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
            />
            <input
              type="time"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
              className="w-28 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
            />
          </div>
        </div>

        <Input
          label="Catatan (Opsional)"
          type="text"
          placeholder="Contoh: Cicilan ke-3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Select
          label={walletLabel}
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          helpText={walletId ? walletHint : 'Kosongkan jika tidak ingin mempengaruhi saldo wallet (hanya catat di hutang/piutang saja)'}
        >
          <option value="">— Tidak terhubung ke wallet —</option>
          {(wallets || []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name} ({formatCurrency(w.balance)})
            </option>
          ))}
        </Select>

        {walletId && (
          <Select
            label="Kategori Transaksi"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            helpText="Kategori yang akan muncul di riwayat transaksi"
          >
            <option value="">— Tanpa kategori —</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={payMutation.isPending}>
            Catat Pembayaran
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  )
}

// ── Debt Payment History Component ────────────────────────────────────────────

function DebtPaymentHistory({ debtId }) {
  const { data: payments, isLoading } = useDebtPayments(debtId)
  const [editPayment, setEditPayment] = useState(null)
  const [deletePayment, setDeletePayment] = useState(null)
  const updateMutation = useUpdateDebtPayment()
  const deleteMutation = useDeleteDebtPayment()
  const toast = useToast()

  if (isLoading) {
    return <div className="text-center py-4 text-ink-3 text-sm">Memuat riwayat...</div>
  }

  if (!payments?.length) {
    return <div className="text-center py-4 text-ink-3 text-sm">Belum ada riwayat pembayaran</div>
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await updateMutation.mutateAsync({
        paymentId: editPayment.id,
        debtId: editPayment.debt_id,
        amount: Number(formData.get('amount')),
        paymentDate: formData.get('paymentDate'),
        paymentTime: formData.get('paymentTime'),
        note: formData.get('note'),
      })
      toast.success('Pembayaran diperbarui')
      setEditPayment(null)
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui')
    }
  }

  const { triggerDelete } = useUndoableDelete(
    async (payment) => {
      await deleteMutation.mutateAsync({
        paymentId: payment.id,
        debtId: payment.debt_id,
      })
    },
    { itemName: 'Pembayaran' }
  )

  const handleDelete = () => {
    triggerDelete(deletePayment)
    setDeletePayment(null)
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-line">
        <h4 className="text-xs font-semibold text-ink-2 mb-3 flex items-center gap-1">
          <History className="w-3 h-3" />
          Riwayat Pembayaran ({payments.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-2 bg-surface-2 rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">
                    {formatCurrency(payment.amount)}
                  </span>
                  <span className="text-xs text-ink-3">
                    {formatDate(payment.payment_date)} {payment.payment_time?.slice(0, 5)}
                  </span>
                </div>
                {payment.note && (
                  <p className="text-xs text-ink-2 truncate">{payment.note}</p>
                )}
                {payment.wallets && (
                  <p className="text-xs text-ink-3 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {payment.wallets.icon} {payment.wallets.name}
                  </p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => setEditPayment(payment)}
                  className="p-1 rounded text-ink-3 hover:text-blue-500 hover:bg-blue-50"
                  aria-label="Edit pembayaran"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setDeletePayment(payment)}
                  className="p-1 rounded text-ink-3 hover:text-red-500 hover:bg-red-50"
                  aria-label="Hapus pembayaran"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editPayment && (
        <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Pembayaran" size="sm">
          <ModalBody>
            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Jumlah (Rp)"
                name="amount"
                type="number"
                defaultValue={editPayment.amount}
                required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink-2">Tanggal & Waktu</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="paymentDate"
                    defaultValue={editPayment.payment_date}
                    className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="time"
                    name="paymentTime"
                    defaultValue={editPayment.payment_time?.slice(0, 5) || '12:00'}
                    className="w-28 rounded-lg border border-line-2 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <Input
                label="Catatan"
                name="note"
                type="text"
                defaultValue={editPayment.note || ''}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditPayment(null)}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
                  Simpan
                </Button>
              </div>
            </form>
          </ModalBody>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletePayment}
        onClose={() => setDeletePayment(null)}
        onConfirm={handleDelete}
        title="Hapus Pembayaran"
        message={`Yakin ingin menghapus pembayaran ${formatCurrency(deletePayment?.amount)}?`}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ── Debt Card ─────────────────────────────────────────────────────────────────

function DebtCard({ debt, onEdit, onDelete, onPay, onMarkPaid }) {
  const isDebt = debt.type === 'debt'
  const paid = debt.is_paid
  const pct = debt.amount > 0
    ? Math.min(100, ((debt.amount - debt.remaining_amount) / debt.amount) * 100)
    : 0
  const days = daysUntil(debt.due_date)
  const isOverdue = days !== null && days < 0 && !paid
  const [showHistory, setShowHistory] = useState(false)

  return (
    <Card className={`hover:shadow-md transition-shadow ${paid ? 'opacity-70' : ''}`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDebt ? 'bg-red-50' : 'bg-emerald-50'
            }`}>
              {isDebt
                ? <TrendingDown className="w-6 h-6 text-red-500" />
                : <TrendingUp className="w-6 h-6 text-emerald-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink">{debt.name}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  isDebt
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {isDebt ? 'Hutang' : 'Piutang'}
                </span>
              </div>
              {paid ? (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Lunas
                </span>
              ) : debt.due_date ? (
                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-ink-3'}`}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {isOverdue
                    ? `Jatuh tempo terlewat ${Math.abs(days)} hari`
                    : days === 0
                    ? 'Jatuh tempo hari ini!'
                    : `Jatuh tempo ${formatDate(debt.due_date)}`}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(debt)}
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-surface-2 transition-colors"
              aria-label="Edit hutang/piutang"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(debt.id)}
              className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Hapus hutang/piutang"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-ink-2 text-xs">Sisa</span>
            <span className={`font-bold ${isDebt ? 'text-red-500' : 'text-emerald-600'}`}>
              {formatCurrency(debt.remaining_amount)}
            </span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${isDebt ? 'bg-red-400' : 'bg-emerald-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-ink-3">
            <span>{pct.toFixed(0)}% sudah dibayar</span>
            <span>dari {formatCurrency(debt.amount)}</span>
          </div>
        </div>

        {debt.description && (
          <p className="text-xs text-ink-3 mb-3 truncate">{debt.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!paid && (
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onPay(debt)}>
              <CreditCard className="w-4 h-4" />
              Catat Bayar
            </Button>
          )}
          {!paid && (
            <Button
              size="sm"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onMarkPaid(debt)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Lunas
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Sembunyikan' : 'Riwayat'}
          </Button>
        </div>

        {/* Payment History */}
        {showHistory && <DebtPaymentHistory debtId={debt.id} />}
      </CardContent>
    </Card>
  )
}

// ── Savings Goals Tab ─────────────────────────────────────────────────────────

function SavingsGoalsTab() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const { data: goals, isLoading } = useSavingsGoals()
  const deleteMutation = useDeleteSavingsGoal()

  const [filter, setFilter] = useState('all')
  const [goalModal, setGoalModal] = useState({ open: false, goal: null })
  const [addFundModal, setAddFundModal] = useState({ open: false, goal: null })
  const [deleteId, setDeleteId] = useState(null)

  const filtered = (goals || []).filter((g) => {
    if (filter === 'active') return !g.is_completed
    if (filter === 'completed') return g.is_completed
    return true
  })

  const totalTarget = (goals || []).reduce((s, g) => s + (Number(g.target_amount) || 0), 0)
  const totalSaved = (goals || []).reduce((s, g) => s + (Number(g.current_amount) || 0), 0)

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Target tabungan' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      {goals?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-ink-3">Total Target</p>
            <p className="text-sm font-bold text-ink">{formatCurrency(totalTarget)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Terkumpul</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalSaved)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Sisa</p>
            <p className="text-sm font-bold text-ink">{formatCurrency(Math.max(0, totalTarget - totalSaved))}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'active', label: 'Aktif' },
          { key: 'completed', label: 'Tercapai' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === key ? 'bg-surface shadow-sm text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-line p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-16 text-center">
          <Target className="w-12 h-12 text-ink-3 mx-auto mb-3" />
          <p className="text-ink-3 font-medium">
            {filter === 'all' ? 'Belum ada target tabungan' : `Tidak ada target ${filter === 'completed' ? 'tercapai' : 'aktif'}`}
          </p>
          {filter === 'all' && (
            <p className="text-ink-3 text-sm mt-1">Buat target untuk mulai menabung</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.24), ease: 'easeOut' }}
            >
              <SavingsGoalCard
                goal={g}
                onEdit={(g) => setGoalModal({ open: true, goal: g })}
                onDelete={setDeleteId}
                onAddFund={(g) => setAddFundModal({ open: true, goal: g })}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SavingsGoalModal
        isOpen={goalModal.open}
        onClose={() => setGoalModal({ open: false, goal: null })}
        goal={goalModal.goal}
      />
      {addFundModal.goal && (
        <AddFundModal
          isOpen={addFundModal.open}
          onClose={() => setAddFundModal({ open: false, goal: null })}
          goal={addFundModal.goal}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Target Tabungan"
        message="Yakin ingin menghapus target ini? Data tidak bisa dikembalikan."
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ── Mark Paid Modal ───────────────────────────────────────────────────────────

function MarkPaidModal({ isOpen, onClose, debt, onConfirm, loading }) {
  const { data: wallets } = useWallets()
  const { data: expenseCategories } = useCategories('expense')
  const { data: incomeCategories } = useCategories('income')
  const [walletId, setWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().slice(0, 5))
  const [note, setNote] = useState('')

  const isDebt = debt?.type === 'debt'
  const categories = isDebt ? expenseCategories : incomeCategories
  const defaultCatName = isDebt ? 'Cicilan & Hutang' : 'Piutang Diterima'

  useEffect(() => {
    if (!walletId) { setCategoryId(''); return }
    const def = (categories || []).find((c) => c.name === defaultCatName)
    setCategoryId(def?.id || '')
  }, [walletId, categories, defaultCatName])

  useEffect(() => {
    if (isOpen) { 
      setWalletId(''); 
      setCategoryId('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentTime(new Date().toTimeString().slice(0, 5));
      setNote('');
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tandai Lunas" size="sm">
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            Tandai <span className="font-semibold">{debt?.name}</span> sebagai lunas?
            Sisa {isDebt ? 'hutang' : 'piutang'} sebesar{' '}
            <span className="font-semibold">{formatCurrency(debt?.remaining_amount)}</span> akan menjadi 0.
          </p>

          {/* Date and Time */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink-2">
              Tanggal & Waktu Pelunasan
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="flex-1 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
              />
              <input
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="w-28 rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
              />
            </div>
          </div>

          <Input
            label="Catatan (Opsional)"
            type="text"
            placeholder="Contoh: Pelunasan total"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <Select
            label={isDebt ? 'Bayar dari Wallet (opsional)' : 'Terima ke Wallet (opsional)'}
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            helpText={walletId
              ? isDebt ? 'Saldo wallet akan berkurang dan tercatat di transaksi' : 'Saldo wallet akan bertambah dan tercatat di transaksi'
              : 'Kosongkan jika tidak ingin mempengaruhi saldo wallet (hanya catat di hutang/piutang saja)'}
          >
            <option value="">— Tidak terhubung ke wallet —</option>
            {(wallets || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name} ({formatCurrency(w.balance)})
              </option>
            ))}
          </Select>

          {walletId && (
            <Select
              label="Kategori Transaksi"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              helpText="Kategori yang akan muncul di riwayat transaksi"
            >
              <option value="">— Tanpa kategori —</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onConfirm(walletId, categoryId, paymentDate, paymentTime, note)}
              loading={loading}
            >
              <CheckCircle2 className="w-4 h-4" />
              Tandai Lunas
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}

// ── Debts Tab ─────────────────────────────────────────────────────────────────

function DebtsTab() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const { data: debts, isLoading } = useDebts()
  const deleteMutation = useDeleteDebt()
  const markPaidMutation = useMarkDebtPaid()

  const [filter, setFilter] = useState('all')
  const [debtModal, setDebtModal] = useState({ open: false, debt: null })
  const [payModal, setPayModal] = useState({ open: false, debt: null })
  const [markPaidModal, setMarkPaidModal] = useState({ open: false, debt: null })
  const [deleteId, setDeleteId] = useState(null)

  const filtered = (debts || []).filter((d) => {
    if (filter === 'debt') return d.type === 'debt' && !d.is_paid
    if (filter === 'receivable') return d.type === 'receivable' && !d.is_paid
    if (filter === 'paid') return d.is_paid
    return true
  })

  const totalDebt = (debts || [])
    .filter((d) => d.type === 'debt' && !d.is_paid)
    .reduce((s, d) => s + (Number(d.remaining_amount) || 0), 0)
  const totalReceivable = (debts || [])
    .filter((d) => d.type === 'receivable' && !d.is_paid)
    .reduce((s, d) => s + (Number(d.remaining_amount) || 0), 0)

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Data hutang/piutang' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  const handleMarkPaid = async (walletId, categoryId, paymentDate, paymentTime, note) => {
    const debt = markPaidModal.debt
    try {
      await markPaidMutation.mutateAsync({
        id: debt.id,
        remainingAmount: Number(debt.remaining_amount),
        paymentDate,
        paymentTime,
        walletId: walletId || null,
        debtName: debt.name,
        debtType: debt.type,
        categoryId: walletId ? (categoryId || null) : null,
        note: note || 'Pelunasan',
      })
      toast.success('Ditandai sebagai lunas')
      setMarkPaidModal({ open: false, debt: null })
    } catch {
      toast.error('Gagal update')
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {debts?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-ink-3">Total Hutang</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(totalDebt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-ink-3">Total Piutang</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalReceivable)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'debt', label: 'Hutang' },
          { key: 'receivable', label: 'Piutang' },
          { key: 'paid', label: 'Lunas' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === key ? 'bg-surface shadow-sm text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-line p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-16 text-center">
          <CreditCard className="w-12 h-12 text-ink-3 mx-auto mb-3" />
          <p className="text-ink-3 font-medium">Tidak ada data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.24), ease: 'easeOut' }}
            >
              <DebtCard
                debt={d}
                onEdit={(d) => setDebtModal({ open: true, debt: d })}
                onDelete={setDeleteId}
                onPay={(d) => setPayModal({ open: true, debt: d })}
                onMarkPaid={(d) => setMarkPaidModal({ open: true, debt: d })}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <DebtModal
        isOpen={debtModal.open}
        onClose={() => setDebtModal({ open: false, debt: null })}
        debt={debtModal.debt}
      />
      {payModal.debt && (
        <PayDebtModal
          isOpen={payModal.open}
          onClose={() => setPayModal({ open: false, debt: null })}
          debt={payModal.debt}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data"
        message="Yakin ingin menghapus data hutang/piutang ini?"
        loading={deleteMutation.isPending}
      />
      <MarkPaidModal
        isOpen={markPaidModal.open}
        onClose={() => setMarkPaidModal({ open: false, debt: null })}
        debt={markPaidModal.debt}
        onConfirm={handleMarkPaid}
        loading={markPaidMutation.isPending}
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SavingsDebts() {
  const [activeTab, setActiveTab] = useState('savings')

  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [debtModalOpen, setDebtModalOpen] = useState(false)

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
          {[
            { key: 'savings', label: '🎯  Target Tabungan' },
            { key: 'debts', label: '💳  Hutang & Piutang' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-surface shadow-sm text-ink'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Add button */}
        <Button
          size="sm"
          onClick={() => activeTab === 'savings' ? setGoalModalOpen(true) : setDebtModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      {/* Tab content */}
      {activeTab === 'savings' ? <SavingsGoalsTab key="savings" /> : <DebtsTab key="debts" />}

      {/* Global modals for header button */}
      <SavingsGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        goal={null}
      />
      <DebtModal
        isOpen={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        debt={null}
      />
    </div>
  )
}
