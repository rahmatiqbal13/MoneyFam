import { useState, useEffect } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useCategories } from '@/hooks/useCategories'
import { useCreateBudget, useUpdateBudget } from '@/hooks/useBudget'

export function BudgetModal({ isOpen, onClose, budget = null, yearMonth }) {
  const isEdit = !!budget
  const toast = useToast()

  const [form, setForm] = useState({ category_id: '', amount: '' })
  const [errors, setErrors] = useState({})

  const { data: categories } = useCategories('expense')
  const createMutation = useCreateBudget()
  const updateMutation = useUpdateBudget()
  const loading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (isOpen) {
      if (budget) {
        setForm({
          category_id: budget.category_id || '',
          amount: String(budget.amount || ''),
        })
      } else {
        setForm({ category_id: '', amount: '' })
      }
      setErrors({})
    }
  }, [isOpen, budget])

  const validate = () => {
    const errs = {}
    if (!form.category_id) errs.category_id = 'Kategori wajib dipilih'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Jumlah harus lebih dari 0'
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

    const [year, month] = yearMonth.split('-').map(Number)

    const payload = {
      category_id: form.category_id,
      amount: Number(form.amount),
      year,
      month,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: budget.id, amount: payload.amount })
        toast.success('Anggaran berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Anggaran berhasil ditambahkan')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Anggaran' : 'Tambah Anggaran'}
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <Select
            label="Kategori Pengeluaran"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            error={errors.category_id}
            required
            disabled={isEdit}
          >
            <option value="">Pilih kategori...</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>

          <Input
            label="Batas Anggaran (Rp)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
            required
            min="0"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
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
