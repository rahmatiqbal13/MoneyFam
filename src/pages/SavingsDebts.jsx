import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Target, CheckCircle2,
  Minus, History, Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { HeroCard } from '@/components/ui/HeroCard'
import { Ring } from '@/components/ui/Ring'
import { Progress } from '@/components/ui/Progress'
import { StatTile } from '@/components/ui/StatTile'
import { Pill } from '@/components/ui/Pill'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Icon } from '@/components/ui/Icon'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, idrShort, toDateStr } from '@/lib/utils'
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
import { INK_COLORS } from '@/lib/theme'

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
const GOAL_COLORS = INK_COLORS.slice(0, 8)

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
    color: INK_COLORS[2],
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
        color: goal?.color || INK_COLORS[2],
      })
      setErrors({})
    }
  }, [isOpen, goal])

  const set = (k) => (e) => { const value = e.target.value; setForm((f) => ({ ...f, [k]: value })) }

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
  const [paymentDate, setPaymentDate] = useState(toDateStr(new Date()))
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
      setPaymentDate(toDateStr(new Date()));
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
                mode === key ? 'bg-primary text-[var(--on-accent)]' : 'text-ink-2 hover:bg-surface-2'
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

  const { triggerDelete } = useUndoableDelete(
    async (payment) => {
      await deleteMutation.mutateAsync({ paymentId: payment.id, goalId: payment.goal_id })
    },
    { itemName: 'Pembayaran' }
  )

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
                  <span className="font-medium" style={{ color: payment.type === 'deposit' ? 'var(--good)' : 'var(--bad)' }}>
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
  const pct = Math.round(progressPct(goal.current_amount, goal.target_amount))
  const days = daysUntil(goal.target_date)
  const isOverdue = days !== null && days < 0 && !goal.is_completed
  const [showHistory, setShowHistory] = useState(false)
  const color = goal.color || 'var(--accent)'
  const remaining = Math.max(0, (Number(goal.target_amount) || 0) - (Number(goal.current_amount) || 0))

  return (
    <Card padding={20}>
      <div className="flex items-start gap-4">
        <Ring value={pct} size={72} stroke={7} color={color} track="var(--surface-2)">
          <span style={{ fontSize: 28 }}>{goal.icon}</span>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{goal.name}</p>
              {goal.is_completed ? (
                <Badge variant="green" className="mt-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Tercapai!
                </Badge>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: isOverdue ? 'var(--bad)' : 'var(--ink-3)' }}>
                  {goal.target_date
                    ? (isOverdue ? `Terlewat ${Math.abs(days)} hari` : `Target ${formatDate(goal.target_date)}`)
                    : 'Tanpa tenggat'}
                </p>
              )}
            </div>
            <span className="font-display tabular-nums flex-shrink-0" style={{ fontSize: 18, color }}>{pct}%</span>
          </div>
          <div className="tabular-nums mt-2" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            {formatCurrency(goal.current_amount)}{' '}
            <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>/ {idrShort(goal.target_amount)}</span>
          </div>
          <div className="mt-2">
            <Progress value={goal.current_amount} max={goal.target_amount || 1} color={color} height={6} />
          </div>
        </div>
      </div>

      <div className="flex justify-between text-xs mt-3" style={{ color: 'var(--ink-3)' }}>
        <span>{pct}% terkumpul</span>
        <span>Sisa {idrShort(remaining)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        {!goal.is_completed && (
          <Button size="sm" variant="soft" className="flex-1" onClick={() => onAddFund(goal)}>
            <Icon name="plus" size={14} stroke={2.2} />
            Setor
          </Button>
        )}
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4" />
          {showHistory ? 'Tutup' : 'Riwayat'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(goal)} aria-label="Edit target tabungan">
          <Icon name="pencil" size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(goal.id)} aria-label="Hapus target tabungan">
          <Icon name="trash" size={16} />
        </Button>
      </div>

      {/* Payment History */}
      {showHistory && <SavingsPaymentHistory goalId={goal.id} />}
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

  const set = (k) => (e) => { const value = e.target.value; setForm((f) => ({ ...f, [k]: value })) }

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
        // Total berubah → sisa ikut bergeser sebesar selisihnya (yang sudah dibayar tetap)
        const remaining = Math.max(0, Number(debt.remaining_amount) + payload.amount - Number(debt.amount))
        await updateMutation.mutateAsync({
          id: debt.id,
          ...payload,
          remaining_amount: remaining,
          is_paid: remaining <= 0,
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
  const [paymentDate, setPaymentDate] = useState(toDateStr(new Date()))
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
      setPaymentDate(toDateStr(new Date()));
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

  const { triggerDelete } = useUndoableDelete(
    async (payment) => {
      await deleteMutation.mutateAsync({
        paymentId: payment.id,
        debtId: payment.debt_id,
      })
    },
    { itemName: 'Pembayaran' }
  )

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
  const amount = Number(debt.amount) || 0
  const remaining = Number(debt.remaining_amount) || 0
  const paidAmount = Math.max(0, amount - remaining)
  const pct = amount > 0 ? Math.min(100, Math.round((paidAmount / amount) * 100)) : 0
  const days = daysUntil(debt.due_date)
  const isOverdue = days !== null && days < 0 && !paid
  const [showHistory, setShowHistory] = useState(false)
  const color = isDebt ? 'var(--bad)' : 'var(--good)'

  return (
    <Card padding={20} style={paid ? { opacity: 0.7 } : undefined}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface-2)', color }}
          >
            <Icon name="coin" size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{debt.name}</p>
              <Pill tone={isDebt ? 'bad' : 'good'} size="sm">{isDebt ? 'Hutang' : 'Piutang'}</Pill>
            </div>
            {paid ? (
              <span className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: 'var(--good)' }}>
                <CheckCircle2 className="w-3 h-3" /> Lunas
              </span>
            ) : debt.description ? (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>{debt.description}</p>
            ) : null}
          </div>
        </div>
        {!paid && debt.due_date && (
          <Pill tone="warn" icon={<Icon name="calendar" size={11} />}>{formatDate(debt.due_date)}</Pill>
        )}
      </div>

      <Progress value={paidAmount} max={amount || 1} color={color} height={8} />

      <div className="flex justify-between items-center mt-2.5">
        <div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Sisa</div>
          <div className="tabular-nums font-bold" style={{ fontSize: 15, color }}>{formatCurrency(remaining)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Terbayar</div>
          <div className="tabular-nums font-bold" style={{ fontSize: 15, color }}>{pct}%</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Total</div>
          <div className="tabular-nums font-bold" style={{ fontSize: 15, color: 'var(--ink)' }}>{idrShort(amount)}</div>
        </div>
      </div>

      {isOverdue && (
        <p className="text-xs mt-2 font-medium" style={{ color: 'var(--bad)' }}>
          Jatuh tempo terlewat {Math.abs(days)} hari
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        {!paid && (
          <Button size="sm" variant="soft" className="flex-1" onClick={() => onPay(debt)}>
            <Icon name="coin" size={14} />
            Catat Bayar
          </Button>
        )}
        {!paid && (
          <Button size="sm" variant="primary" className="flex-1" onClick={() => onMarkPaid(debt)}>
            <CheckCircle2 className="w-4 h-4" />
            Lunas
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4" />
          {showHistory ? 'Tutup' : 'Riwayat'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(debt)} aria-label="Edit hutang/piutang">
          <Icon name="pencil" size={16} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(debt.id)} aria-label="Hapus hutang/piutang">
          <Icon name="trash" size={16} />
        </Button>
      </div>

      {/* Payment History */}
      {showHistory && <DebtPaymentHistory debtId={debt.id} />}
    </Card>
  )
}

// ── Savings Goals Tab ─────────────────────────────────────────────────────────

function SavingsGoalsTab() {
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

  const totalPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Hero */}
      <HeroCard
        label="Total Terkumpul"
        value={formatCurrency(totalSaved)}
      >
        <div className="mt-3" style={{ maxWidth: 360 }}>
          <Progress value={totalSaved} max={totalTarget || 1} color="#fff" track="rgba(255,255,255,.2)" height={8} />
          <div className="mt-2" style={{ fontSize: 12, opacity: 0.85 }}>
            {totalPct}% menuju total target {idrShort(totalTarget)}
          </div>
        </div>
      </HeroCard>

      {/* Heading */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}>Tujuan Keluarga</h3>
        <Button size="sm" variant="soft" onClick={() => setGoalModal({ open: true, goal: null })}>
          <Icon name="plus" size={14} stroke={2.2} /> Tujuan Baru
        </Button>
      </div>

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
  const [paymentDate, setPaymentDate] = useState(toDateStr(new Date()))
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
      setPaymentDate(toDateStr(new Date()));
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
              className="flex-1"
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
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Sisa Hutang" value={formatCurrency(totalDebt)} />
          <StatTile label="Piutang" value={formatCurrency(totalReceivable)} />
        </div>
      )}

      {/* Heading */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}>Hutang &amp; Piutang</h3>
        <Button size="sm" variant="soft" onClick={() => setDebtModal({ open: true, debt: null })}>
          <Icon name="plus" size={14} stroke={2.2} /> Tambah
        </Button>
      </div>

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
          <Icon name="coin" size={48} className="mx-auto mb-3" style={{ color: 'var(--ink-3)' }} />
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

  return (
    <div className="space-y-6">
      <PageHeader title="Tabungan & Hutang" eyebrow="Tujuan & kewajiban keluarga" />
      <SegmentedControl
        size="md"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: 'savings', label: 'Tabungan' },
          { id: 'debts', label: 'Hutang' },
        ]}
      />

      {/* Tab content */}
      {activeTab === 'savings' ? <SavingsGoalsTab key="savings" /> : <DebtsTab key="debts" />}
    </div>
  )
}
