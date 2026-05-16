import { useState, useEffect } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions'

const TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
]

const defaultForm = {
  type: 'expense',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  category_id: '',
  wallet_id: '',
  to_wallet_id: '',
  note: '',
}

export function TransactionModal({ isOpen, onClose, transaction = null }) {
  const isEdit = !!transaction
  const toast = useToast()

  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})

  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()

  const loading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setForm({
          type: transaction.type || 'expense',
          amount: String(transaction.amount || ''),
          date: transaction.date || new Date().toISOString().split('T')[0],
          description: transaction.description || '',
          category_id: transaction.category_id || '',
          wallet_id: transaction.wallet_id || '',
          to_wallet_id: transaction.to_wallet_id || '',
          note: transaction.note || '',
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
    }
  }, [isOpen, transaction])

  const filteredCategories = categories?.filter(
    (c) => form.type === 'transfer' ? false : c.type === form.type
  ) || []

  const validate = () => {
    const errs = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = 'Jumlah harus lebih dari 0'
    if (!form.date) errs.date = 'Tanggal wajib diisi'
    if (!form.wallet_id) errs.wallet_id = 'Kantong wajib dipilih'
    if (form.type !== 'transfer' && !form.category_id) errs.category_id = 'Kategori wajib dipilih'
    if (form.type === 'transfer' && !form.to_wallet_id) errs.to_wallet_id = 'Kantong tujuan wajib dipilih'
    if (form.type === 'transfer' && form.wallet_id === form.to_wallet_id)
      errs.to_wallet_id = 'Kantong tujuan harus berbeda'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})

    const payload = {
      type: form.type,
      amount: Number(form.amount),
      date: form.date,
      description: form.description,
      category_id: form.category_id || null,
      wallet_id: form.wallet_id,
      to_wallet_id: form.type === 'transfer' ? form.to_wallet_id : null,
      note: form.note,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: transaction.id, ...payload })
        toast.success('Transaksi berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Transaksi berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan')
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          {/* Type tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value, category_id: '' })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.type === t.value
                    ? t.value === 'income'
                      ? 'bg-emerald-500 text-white'
                      : t.value === 'expense'
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <Input
            label="Jumlah (Rp)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={update('amount')}
            error={errors.amount}
            required
            min="0"
          />

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={update('date')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
          </div>

          {/* Description */}
          <Input
            label="Deskripsi"
            type="text"
            placeholder="Makan siang, belanja bulanan..."
            value={form.description}
            onChange={update('description')}
          />

          {/* Category (not for transfer) */}
          {form.type !== 'transfer' && (
            <Select
              label="Kategori"
              value={form.category_id}
              onChange={update('category_id')}
              error={errors.category_id}
              required
            >
              <option value="">Pilih kategori...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          )}

          {/* Wallet */}
          <Select
            label={form.type === 'transfer' ? 'Dari Kantong' : 'Kantong'}
            value={form.wallet_id}
            onChange={update('wallet_id')}
            error={errors.wallet_id}
            required
          >
            <option value="">Pilih kantong...</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
              </option>
            ))}
          </Select>

          {/* To wallet (transfer only) */}
          {form.type === 'transfer' && (
            <Select
              label="Ke Kantong"
              value={form.to_wallet_id}
              onChange={update('to_wallet_id')}
              error={errors.to_wallet_id}
              required
            >
              <option value="">Pilih kantong tujuan...</option>
              {wallets?.filter((w) => w.id !== form.wallet_id).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </Select>
          )}

          {/* Note */}
          <Input
            label="Catatan"
            type="text"
            placeholder="Opsional..."
            value={form.note}
            onChange={update('note')}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
