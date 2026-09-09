import { useState, useEffect, useRef } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const TYPES = [
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'income', label: 'Pemasukan' },
  { id: 'transfer', label: 'Transfer' },
]

function getDefaultForm() {
  return {
    type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    category_id: '',
    wallet_id: '',
    to_wallet_id: '',
    note: '',
    receipt_url: '',
  }
}

export function TransactionModal({ isOpen, onClose, transaction = null }) {
  const isEdit = !!transaction
  const toast = useToast()
  const user = useAuthStore((state) => state.user)

  const [form, setForm] = useState(() => getDefaultForm())
  const [errors, setErrors] = useState({})
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const abortControllerRef = useRef(null)

  const { data: categories } = useCategories()
  const { data: wallets } = useWallets()
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  const handleConfirmDelete = () => {
    if (!transaction?.id) return
    deleteMutation.mutate(transaction.id, {
      onSuccess: () => {
        toast.success('Transaksi dihapus')
        onClose()
      },
      onError: (e) => toast.error(e.message || 'Gagal menghapus transaksi'),
    })
  }

  const loading = createMutation.isPending || updateMutation.isPending || uploading

  useEffect(() => {
    return () => {
      if (receiptPreview && receiptPreview.startsWith('blob:')) {
        URL.revokeObjectURL(receiptPreview)
      }
    }
  }, [receiptPreview])

  useEffect(() => {
    if (!isOpen) {
      setForm(getDefaultForm())
      setReceiptFile(null)
      setReceiptPreview(null)
      setErrors({})
      setConfirmingDelete(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        const dateObj = new Date(transaction.date)
        setForm({
          type: transaction.type || 'expense',
          amount: String(transaction.amount || ''),
          date: dateObj.toISOString().split('T')[0],
          time: dateObj.toTimeString().slice(0, 5),
          description: transaction.description || '',
          category_id: transaction.category_id || '',
          wallet_id: transaction.wallet_id || '',
          to_wallet_id: transaction.to_wallet_id || '',
          note: transaction.note || '',
          receipt_url: transaction.receipt_url || '',
        })
        setReceiptPreview(transaction.receipt_url || null)
      } else {
        setForm(getDefaultForm())
        setReceiptFile(null)
        setReceiptPreview(null)
      }
      setErrors({})
      setConfirmingDelete(false)
    }
  }, [isOpen, transaction])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
      const validExts = ['jpg', 'jpeg', 'png', 'webp']
      const ext = file.name.split('.').pop().toLowerCase()
      if (!validTypes.includes(file.type) || !validExts.includes(ext)) {
        toast.error('File harus berupa gambar (JPG, PNG, WEBP)')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }
      if (receiptPreview && receiptPreview.startsWith('blob:')) {
        URL.revokeObjectURL(receiptPreview)
      }
      setReceiptFile(file)
      setReceiptPreview(URL.createObjectURL(file))
    }
  }

  const removeReceipt = () => {
    if (receiptPreview && receiptPreview.startsWith('blob:')) {
      URL.revokeObjectURL(receiptPreview)
    }
    setReceiptFile(null)
    setReceiptPreview(null)
    setForm({ ...form, receipt_url: '' })
  }

  const cancelUpload = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setUploading(false)
    setReceiptFile(null)
    if (receiptPreview && receiptPreview.startsWith('blob:')) {
      URL.revokeObjectURL(receiptPreview)
    }
    setReceiptPreview(null)
  }

  const uploadReceipt = async () => {
    if (!receiptFile || !user) return null

    abortControllerRef.current = new AbortController()
    setUploading(true)
    try {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const uploadPromise = supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, {
          cacheControl: '3600',
          upsert: false,
          signal: abortControllerRef.current.signal,
        })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Waktu upload habis. Periksa koneksi internet dan coba lagi.')), 30000)
      )

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise])

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Gagal upload nota: ' + (error.message || 'Terjadi kesalahan saat upload'))
      }
      return null
    } finally {
      abortControllerRef.current = null
      setUploading(false)
    }
  }

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
    if (loading) return
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})

    let receiptUrl = form.receipt_url

    // Upload receipt if new file selected
    if (receiptFile) {
      receiptUrl = await uploadReceipt()
      if (!receiptUrl && receiptFile) {
        // Upload failed - user can see the error toast and retry by submitting again
        return
      }
    }

    const payload = {
      type: form.type,
      amount: Number(form.amount),
      date: `${form.date}T${form.time || '00:00'}`,
      description: form.description,
      category_id: form.category_id || null,
      wallet_id: form.wallet_id,
      to_wallet_id: form.type === 'transfer' ? form.to_wallet_id : null,
      note: form.note,
      receipt_url: receiptUrl || null,
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
          <SegmentedControl
            size="md"
            className="w-full"
            value={form.type}
            options={TYPES}
            onChange={(id) => setForm({ ...form, type: id, category_id: '' })}
          />

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

          {/* Date and Time */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
              Tanggal & Waktu <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="flex-1"
                value={form.date}
                onChange={update('date')}
              />
              <Input
                type="time"
                className="w-28"
                value={form.time}
                onChange={update('time')}
              />
            </div>
            {errors.date && <p className="text-xs" style={{ color: 'var(--bad)' }}>{errors.date}</p>}
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

          {/* Receipt Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
              Foto Nota (Opsional)
            </label>

            {receiptPreview ? (
              <div
                className="relative overflow-hidden"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
              >
                <img
                  src={receiptPreview}
                  alt="Preview nota"
                  className="w-full h-48 object-contain"
                  style={{ background: 'var(--surface-2)' }}
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Hapus nota"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed cursor-pointer transition-colors"
                style={{ borderColor: 'var(--line-2)', borderRadius: 'var(--r-sm)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line-2)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-2" style={{ color: 'var(--ink-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Klik untuk upload nota</p>
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>JPG, PNG (max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
            
            {uploading && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-primary-600 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengupload nota... (maks. 30 detik)
                </p>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-xs text-red-500 hover:text-red-600 font-medium underline"
                >
                  Batalkan
                </button>
              </div>
            )}
          </div>
        </ModalBody>
        {isEdit && confirmingDelete ? (
          <ModalFooter className="justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Hapus transaksi ini?
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setConfirmingDelete(false)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={handleConfirmDelete}
                loading={deleteMutation.isPending}
              >
                Ya, hapus
              </Button>
            </div>
          </ModalFooter>
        ) : (
          <ModalFooter className={isEdit ? 'justify-between' : undefined}>
            {isEdit && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={loading}
                style={{ color: 'var(--bad)' }}
              >
                Hapus
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" loading={loading}>
                {isEdit ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </ModalFooter>
        )}
      </form>
    </Modal>
  )
}
