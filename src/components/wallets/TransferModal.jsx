import { useState, useEffect } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useWallets, useTransferBetweenWallets } from '@/hooks/useWallets'
import { formatCurrency } from '@/lib/utils'

export function TransferModal({ isOpen, onClose, fromWallet = null }) {
  const toast = useToast()
  const { data: wallets } = useWallets()
  const transferMutation = useTransferBetweenWallets()

  const [form, setForm] = useState({
    from_wallet_id: '',
    to_wallet_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setForm({
        from_wallet_id: fromWallet?.id || '',
        to_wallet_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      })
      setErrors({})
    }
  }, [isOpen, fromWallet])

  const validate = () => {
    const errs = {}
    if (!form.from_wallet_id) errs.from_wallet_id = 'Kantong asal wajib dipilih'
    if (!form.to_wallet_id) errs.to_wallet_id = 'Kantong tujuan wajib dipilih'
    if (form.from_wallet_id === form.to_wallet_id) errs.to_wallet_id = 'Kantong berbeda'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Jumlah harus lebih dari 0'
    if (!form.date) errs.date = 'Tanggal wajib diisi'

    const fromW = wallets?.find((w) => w.id === form.from_wallet_id)
    if (fromW && Number(form.amount) > Number(fromW.balance)) {
      errs.amount = `Saldo tidak cukup (${formatCurrency(fromW.balance)})`
    }
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

    try {
      await transferMutation.mutateAsync({
        from_wallet_id: form.from_wallet_id,
        to_wallet_id: form.to_wallet_id,
        amount: Number(form.amount),
        date: form.date,
        note: form.note,
      })
      toast.success('Transfer berhasil!')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Transfer gagal')
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const selectedFrom = wallets?.find((w) => w.id === form.from_wallet_id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Antar Kantong" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <Select
            label="Dari Kantong"
            value={form.from_wallet_id}
            onChange={update('from_wallet_id')}
            error={errors.from_wallet_id}
            required
          >
            <option value="">Pilih kantong asal...</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name} ({formatCurrency(w.balance)})
              </option>
            ))}
          </Select>

          <Select
            label="Ke Kantong"
            value={form.to_wallet_id}
            onChange={update('to_wallet_id')}
            error={errors.to_wallet_id}
            required
          >
            <option value="">Pilih kantong tujuan...</option>
            {wallets?.filter((w) => w.id !== form.from_wallet_id).map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
              </option>
            ))}
          </Select>

          <Input
            label="Jumlah Transfer (Rp)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={update('amount')}
            error={errors.amount}
            required
            min="0"
            helpText={selectedFrom ? `Saldo: ${formatCurrency(selectedFrom.balance)}` : ''}
          />

          <Input
            label="Tanggal"
            type="date"
            value={form.date}
            onChange={update('date')}
            error={errors.date}
            required
          />

          <Input
            label="Catatan"
            type="text"
            placeholder="Opsional..."
            value={form.note}
            onChange={update('note')}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={transferMutation.isPending}>
            Batal
          </Button>
          <Button type="submit" loading={transferMutation.isPending}>
            Transfer
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
