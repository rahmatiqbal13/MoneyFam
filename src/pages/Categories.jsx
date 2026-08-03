import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus, Edit2, Trash2, Tag, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, ModalBody, ModalFooter, ConfirmModal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useResetCategories } from '@/hooks/useCategories'
import { useCategoryStore } from '@/stores/categoryStore'

const CATEGORY_ICONS = ['🍔', '🚗', '🏠', '💊', '📚', '🎬', '👕', '✈️', '💰', '💼', '🎁', '📱', '🛒', '⚡', '💧', '🎮', '🏋️', '🐕', '🌱', '💳', '🔧', '🎵', '🍕', '☕', '🛡️']
const CATEGORY_COLORS = [
  '#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
]

function getDefaultForm() {
  return { name: '', icon: '📦', color: '#10b981', type: 'expense' }
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
        setForm({ name: category.name, icon: category.icon || '📦', color: category.color || '#10b981', type: category.type })
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
          <Select label="Tipe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </Select>

          <Input label="Nama Kategori" type="text" placeholder="Contoh: Makan Siang" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-2">Ikon</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${form.icon === icon ? 'border-primary bg-primary-50' : 'border-line hover:border-line-2'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-2">Warna</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 p-3 bg-surface-2 rounded-lg">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: form.color + '20' }}>
              {form.icon}
            </div>
            <span className="text-sm font-medium text-ink-2">{form.name || 'Preview Kategori'}</span>
            <Badge variant={form.type === 'expense' ? 'red' : 'green'} className="ml-auto">
              {form.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </Badge>
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
  const reduceMotion = useReducedMotion()
  const { activeTab, setActiveTab } = useCategoryStore()

  const { data: allCategories, isLoading } = useCategories()
  const deleteMutation = useDeleteCategory()
  const resetMutation = useResetCategories()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const categories = allCategories?.filter((c) => c.type === activeTab) || []

  const handleEdit = (cat) => {
    setEditingCategory(cat)
    setModalOpen(true)
  }

  const { triggerDelete } = useUndoableDelete(
    async (cat) => {
      await deleteMutation.mutateAsync({ id: cat.id, isDefault: cat.is_default })
    },
    { itemName: 'Kategori' }
  )

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

  const handleClose = () => {
    setModalOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-line overflow-hidden">
          {['expense', 'income'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}>
              {tab === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setResetModalOpen(true)} title="Reset ke kategori default" aria-label="Reset ke kategori default">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-line animate-pulse">
              <div className="w-9 h-9 bg-surface-2 rounded-lg" />
              <div className="h-4 bg-surface-2 rounded w-32" />
            </div>
          ))}
        </div>
      ) : !categories.length ? (
        <div className="py-16 text-center">
          <Tag className="w-10 h-10 text-ink-3 mx-auto mb-3" />
          <p className="text-ink-3 font-medium">Belum ada kategori {activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'}</p>
          <Button className="mt-4" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Tambah Kategori
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.24), ease: 'easeOut' }}
              className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-line hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: (cat.color || '#6b7280') + '20' }}>
                {cat.icon || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{cat.name}</p>
                {cat.is_default && <p className="text-xs text-ink-3">Default</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg text-ink-3 hover:text-blue-500 hover:bg-blue-50 transition-colors" aria-label="Edit kategori">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteCategory(cat)} className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Hapus kategori">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CategoryModal isOpen={modalOpen} onClose={handleClose} category={editingCategory} activeTab={activeTab} />

      <ConfirmModal isOpen={!!deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={handleDelete}
        title="Hapus Kategori" message="Yakin ingin menghapus kategori ini?" loading={deleteMutation.isPending} />

      <ConfirmModal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} onConfirm={handleReset}
        title="Reset Kategori" message="Semua kategori custom akan dihapus dan kategori default akan dipulihkan. Lanjutkan?" loading={resetMutation.isPending} />
    </div>
  )
}
