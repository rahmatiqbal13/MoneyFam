import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useDeleteAllTransactions } from '@/hooks/useTransactions'

export function DangerZoneSection() {
  const toast = useToast()
  const deleteMutation = useDeleteAllTransactions()

  // Step 1: first confirm dialog
  const [step1Open, setStep1Open] = useState(false)
  // Step 2: type DELETE confirm dialog
  const [step2Open, setStep2Open] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [understandCheck, setUnderstandCheck] = useState(false)

  const handleStep1Confirm = () => {
    setStep1Open(false)
    setStep2Open(true)
    setConfirmText('')
    setUnderstandCheck(false)
  }

  const handleFinalDelete = async () => {
    if (confirmText !== 'DELETE') return
    try {
      await deleteMutation.mutateAsync()
      toast.success('Semua data transaksi berhasil dihapus. Saldo kantong direset ke saldo awal.')
      setStep2Open(false)
      setConfirmText('')
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data')
    }
  }

  const handleClose2 = () => {
    if (deleteMutation.isPending) return
    setStep2Open(false)
    setConfirmText('')
    setUnderstandCheck(false)
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <CardTitle className="text-red-600">Zona Berbahaya</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Hapus Semua Transaksi</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Menghapus seluruh data pemasukan, pengeluaran, dan transfer. Saldo kantong akan direset ke saldo awal. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setStep1Open(true)}
            >
              <Trash2 className="w-4 h-4" />
              Hapus Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: First confirmation */}
      <Modal
        isOpen={step1Open}
        onClose={() => setStep1Open(false)}
        title="Konfirmasi Hapus Data"
        size="sm"
      >
        <ModalBody>
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Yakin ingin menghapus semua transaksi?</p>
              <p className="text-sm text-gray-500 mt-2">
                Seluruh data pemasukan, pengeluaran, dan transfer akan dihapus permanen. Saldo kantong akan dikembalikan ke saldo awal.
              </p>
              <p className="text-sm font-medium text-red-600 mt-3">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setStep1Open(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleStep1Confirm}>
            Ya, Lanjutkan
          </Button>
        </ModalFooter>
      </Modal>

      {/* Step 2: Type DELETE confirmation */}
      <Modal
        isOpen={step2Open}
        onClose={handleClose2}
        title="Konfirmasi Akhir"
        size="sm"
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Peringatan Terakhir</p>
              <p className="text-xs text-red-600 mt-1">
                Semua transaksi akan dihapus permanen dan tidak bisa dikembalikan.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="understand-check"
                checked={understandCheck}
                onChange={(e) => setUnderstandCheck(e.target.checked)}
                disabled={deleteMutation.isPending}
                className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="understand-check" className="text-sm text-gray-700">
                Saya mengerti bahwa tindakan ini tidak dapat dibatalkan
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ketik <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DELETE</span> untuk mengkonfirmasi
              </label>
              <Input
                placeholder="Ketik DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={deleteMutation.isPending}
                className={confirmText === 'DELETE' ? 'border-red-400 focus:border-red-500' : ''}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose2} disabled={deleteMutation.isPending}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleFinalDelete}
            disabled={confirmText !== 'DELETE' || !understandCheck}
            loading={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua Data
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
