import { useState, useEffect } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useCreateWallet, useUpdateWallet } from '@/hooks/useWallets'

const WALLET_TYPES = [
  { value: 'cash', label: 'Tunai' },
  { value: 'bank', label: 'Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'savings', label: 'Tabungan' },
  { value: 'investment', label: 'Investasi' },
  { value: 'credit', label: 'Kartu Kredit' },
  { value: 'other', label: 'Lainnya' },
]

const WALLET_ICONS = ['💳', '🏦', '💰', '💵', '🪙', '📱', '💎', '🏧', '💼', '🎯']

const WALLET_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function getDefaultForm() {
  return {
    name: '',
    type: 'cash',
    icon: '💳',
    color: '#10b981',
    initial_balance: '0',
    balance: '',
    description: '',
  }
}

export function WalletModal({ isOpen, onClose, wallet = null }) {
  const isEdit = !!wallet
  const toast = useToast()

  const [form, setForm] = useState(() => getDefaultForm())
  const [errors, setErrors] = useState({})

  const createMutation = useCreateWallet()
  const updateMutation = useUpdateWallet()
  const loading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (isOpen) {
      if (wallet) {
        setForm({
          name: wallet.name || '',
          type: wallet.type || 'cash',
          icon: wallet.icon || '💳',
          color: wallet.color || '#10b981',
          initial_balance: String(wallet.initial_balance ?? 0),
          balance: String(wallet.balance ?? 0),
          description: wallet.description || '',
        })
      } else {
        setForm(getDefaultForm())
      }
      setErrors({})
    }
  }, [isOpen, wallet])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nama kantong wajib diisi'
    if (isNaN(Number(form.initial_balance))) errs.initial_balance = 'Saldo awal harus berupa angka'
    if (isEdit && form.balance !== '' && isNaN(Number(form.balance))) errs.balance = 'Saldo saat ini harus berupa angka'
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
      name: form.name.trim(),  // Trim whitespace from name
      type: form.type,
      icon: form.icon,
      color: form.color,
      description: form.description?.trim(),
      initial_balance: Number(form.initial_balance),
      // On edit, include balance override; on create, balance = initial_balance
      ...(isEdit
        ? { balance: form.balance !== '' ? Number(form.balance) : undefined }
        : { balance: Number(form.initial_balance) }),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: wallet.id, ...payload })
        toast.success('Kantong berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Kantong berhasil ditambahkan')
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
      title={isEdit ? 'Edit Kantong' : 'Tambah Kantong'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <Input
            label="Nama Kantong"
            type="text"
            placeholder="BCA, Dana, Tunai..."
            value={form.name}
            onChange={update('name')}
            error={errors.name}
            required
          />

          <Select
            label="Tipe"
            value={form.type}
            onChange={update('type')}
          >
            {WALLET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Ikon</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className="w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-colors"
                  style={{
                    borderColor: form.icon === icon ? 'var(--accent)' : 'var(--line)',
                    background: form.icon === icon ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Warna</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    form.color === color ? 'scale-110' : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? 'var(--ink)' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Saldo Awal (Rp)"
            type="number"
            placeholder="0"
            value={form.initial_balance}
            onChange={update('initial_balance')}
            error={errors.initial_balance}
            helpText={isEdit ? 'Jumlah saldo saat kantong pertama kali dibuat' : undefined}
          />

          {isEdit && (
            <div>
              <Input
                label="Saldo Saat Ini (Rp)"
                type="number"
                placeholder="0"
                value={form.balance}
                onChange={update('balance')}
                error={errors.balance}
                helpText="Ubah ini untuk mengoreksi saldo secara manual"
              />
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Mengubah saldo saat ini tidak mempengaruhi riwayat transaksi
              </p>
            </div>
          )}
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
