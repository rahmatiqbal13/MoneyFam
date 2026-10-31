import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal, ModalBody, ModalFooter, ConfirmModal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TransactionTypeBadge } from '@/components/ui/Badge'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useResetCategories } from '@/hooks/useCategories'
import { useReportCategoryDetail } from '@/hooks/useTransactions'
import { idrShort } from '@/lib/utils'
import { INK_COLORS } from '@/lib/theme'

const CATEGORY_ICONS = ['🍔', '🚗', '🏠', '💊', '📚', '🎬', '👕', '✈️', '💰', '💼', '🎁', '📱', '🛒', '⚡', '💧', '🎮', '🏋️', '🐕', '🌱', '💳', '🔧', '🎵', '🍕', '☕', '🛡️']
const CATEGORY_COLORS = INK_COLORS

const TYPE_OPTIONS = [
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'income', label: 'Pemasukan' },
]

const SECTIONS = [
  { kind: 'expense', label: 'Pengeluaran' },
  { kind: 'income', label: 'Pemasukan' },
]

function getDefaultForm() {
  return { name: '', icon: '📦', color: INK_COLORS[0], type: 'expense' }
}

function CategoryModal({ isOpen, onClose, category, activeTab }) {
  const isEdit = !!category
  const toast = useToast()
  const [form, setForm] = useState(() => getDefaultForm())
  const [errors, setErrors] = useState({})

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const loading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setForm({ name: category.name, icon: category.icon || '📦', color: category.color || INK_COLORS[0], type: category.type })
      } else {
        setForm({ ...getDefaultForm(), type: activeTab })
      }
      setErrors({})
    }
  }, [isOpen, category, activeTab])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrors({ name: 'Nama kategori wajib diisi' })
      return
    }
    setErrors({})
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: category.id, originalCategory: category, ...form })
        toast.success('Kategori berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Kategori berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      console.error('[CategoryModal] Error:', err)
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan kategori')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Tipe</label>
            <SegmentedControl
              size="md"
              className="w-full"
              value={form.type}
              options={TYPE_OPTIONS}
              onChange={(id) => setForm((f) => ({ ...f, type: id }))}
            />
          </div>

          <Input label="Nama Kategori" type="text" placeholder="Contoh: Makan Siang" value={form.name}
            onChange={(e) => { const value = e.target.value; setForm((f) => ({ ...f, name: value })) }} error={errors.name} required />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Ikon</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map((icon) => {
                const active = form.icon === icon
                return (
                  <button key={icon} type="button" onClick={() => setForm((f) => ({ ...f, icon }))}
                    className="w-9 h-9 flex items-center justify-center text-lg transition-transform active:scale-95"
                    style={{
                      borderRadius: 'var(--r-sm)',
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                      background: active ? 'var(--accent-soft)' : 'var(--surface)',
                    }}>
                    {icon}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Warna</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm((f) => ({ ...f, color }))}
                  className="w-7 h-7 rounded-full transition-transform"
                  aria-label={`Warna ${color}`}
                  style={{
                    background: color,
                    border: '2px solid ' + (form.color === color ? 'var(--ink)' : 'transparent'),
                    transform: form.color === color ? 'scale(1.12)' : 'none',
                  }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3" style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 36, borderRadius: 12, background: (form.color || '#6b7280') + '20', fontSize: 18 }}>
              {form.icon}
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>{form.name || 'Preview Kategori'}</span>
            <span className="ml-auto"><TransactionTypeBadge type={form.type} /></span>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>Batal</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Simpan' : 'Tambah'}</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const toast = useToast()

  const { data: allCategories, isLoading } = useCategories()
  const deleteMutation = useDeleteCategory()
  const resetMutation = useResetCategories()

  const now = new Date()
  const { data: spending } = useReportCategoryDetail(now.getFullYear(), now.getMonth() + 1)
  const usedMap = useMemo(() => new Map((spending || []).map((s) => [s.id, s.amount])), [spending])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('expense')
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const { triggerDelete } = useUndoableDelete(
    async (cat) => {
      await deleteMutation.mutateAsync({ id: cat.id, isDefault: cat.is_default })
    },
    { itemName: 'Kategori' }
  )

  const openAdd = (type) => {
    setEditingCategory(null)
    setModalType(type)
    setModalOpen(true)
  }

  const openEdit = (cat) => {
    setEditingCategory(cat)
    setModalType(cat.type)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingCategory(null)
  }

  const handleDelete = () => {
    triggerDelete(deleteCategory)
    setDeleteCategory(null)
  }

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync()
      toast.success('Kategori berhasil direset ke default')
      setResetModalOpen(false)
    } catch (err) {
      toast.error(err.message || 'Gagal mereset kategori')
    }
  }

  const total = allCategories?.length || 0

  return (
    <div className="space-y-6" style={{ maxWidth: 960 }}>
      <PageHeader
        title="Kategori"
        eyebrow={isLoading ? 'Memuat…' : `${total} kategori · dipakai di transaksi & amplop`}
        actions={[
          <Button key="reset" variant="secondary" onClick={() => setResetModalOpen(true)}>Reset ke default</Button>,
        ]}
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} padding={20}>
              <div className="h-4 w-32 rounded mb-4 animate-pulse" style={{ background: 'var(--surface-2)' }} />
              <div className="grid gap-2.5 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="rounded-xl animate-pulse" style={{ height: 68, background: 'var(--surface-2)' }} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        SECTIONS.map((section) => {
          const cats = (allCategories || []).filter((c) => c.type === section.kind)
          return (
            <Card key={section.kind} padding={20}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                  {section.label}{' '}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· {cats.length}</span>
                </h3>
                <Button size="sm" variant="soft" onClick={() => openAdd(section.kind)}>
                  <Icon name="plus" size={15} stroke={2.2} /> Tambah
                </Button>
              </div>

              {cats.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-3)' }}>
                  Belum ada kategori {section.label.toLowerCase()}
                </p>
              ) : (
                <div className="grid gap-2.5 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
                  {cats.map((cat) => {
                    const color = cat.color || '#6b7280'
                    const used = usedMap.get(cat.id) || 0
                    return (
                      <div key={cat.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="w-full flex items-center gap-3 text-left"
                          style={{
                            background: color + '15',
                            border: `1px solid ${color}25`,
                            borderRadius: 'var(--r-md)',
                            padding: 14,
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{ width: 40, height: 40, borderRadius: 12, background: color, color: '#fff', fontSize: 20 }}
                          >
                            {cat.icon || '📦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-bold truncate" style={{ color: 'var(--ink)' }}>{cat.name}</div>
                            {used > 0 && (
                              <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: 'var(--ink-3)' }}>
                                {idrShort(used)} bulan ini
                              </div>
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCategory(cat)}
                          aria-label={`Hapus kategori ${cat.name}`}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          style={{ color: 'var(--ink-3)', background: 'var(--surface)' }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })
      )}

      <CategoryModal isOpen={modalOpen} onClose={handleClose} category={editingCategory} activeTab={modalType} />

      <ConfirmModal isOpen={!!deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={handleDelete}
        title="Hapus Kategori" message="Yakin ingin menghapus kategori ini?" loading={deleteMutation.isPending} />

      <ConfirmModal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} onConfirm={handleReset}
        title="Reset Kategori" message="Semua kategori custom akan dihapus dan kategori default akan dipulihkan. Lanjutkan?" loading={resetMutation.isPending} />
    </div>
  )
}
