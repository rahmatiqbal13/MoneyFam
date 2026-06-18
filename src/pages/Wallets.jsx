import { useState } from 'react'
import { Plus, Wallet, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { WalletCard } from '@/components/wallets/WalletCard'
import { WalletModal } from '@/components/wallets/WalletModal'
import { TransferModal } from '@/components/wallets/TransferModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useWallets, useDeleteWallet } from '@/hooks/useWallets'
import { formatCurrency } from '@/lib/utils'

export default function Wallets() {
  const toast = useToast()
  const { data: wallets, isLoading } = useWallets()
  const deleteMutation = useDeleteWallet()

  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferFromWallet, setTransferFromWallet] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const totalBalance = wallets?.reduce((s, w) => s + Number(w.balance || 0), 0) || 0

  const handleEdit = (wallet) => {
    setEditingWallet(wallet)
    setWalletModalOpen(true)
  }

  const handleTransfer = (wallet) => {
    setTransferFromWallet(wallet)
    setTransferModalOpen(true)
  }

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Kantong' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  const handleCloseWalletModal = () => {
    setWalletModalOpen(false)
    setEditingWallet(null)
  }

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false)
    setTransferFromWallet(null)
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Kantong / Dompet</h2>
          <p className="text-xs text-gray-400 mt-0.5">{wallets?.length || 0} kantong</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTransferModalOpen(true)}
            disabled={!wallets?.length}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfer
          </Button>
          <Button size="sm" onClick={() => setWalletModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Net worth banner */}
      {wallets?.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-90">Total Kekayaan Bersih</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
          <p className="text-xs opacity-75 mt-1">Dari {wallets.length} kantong aktif</p>
        </div>
      )}

      {/* Wallets grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                <div>
                  <div className="h-4 bg-gray-100 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-6 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : !wallets?.length ? (
        <div className="py-16 text-center">
          <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Belum ada kantong</p>
          <p className="text-gray-300 text-sm mt-1">Tambah kantong pertama kamu</p>
          <Button className="mt-4" size="sm" onClick={() => setWalletModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Tambah Kantong
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              onTransfer={handleTransfer}
            />
          ))}
        </div>
      )}

      <WalletModal
        isOpen={walletModalOpen}
        onClose={handleCloseWalletModal}
        wallet={editingWallet}
      />

      <TransferModal
        isOpen={transferModalOpen}
        onClose={handleCloseTransferModal}
        fromWallet={transferFromWallet}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Kantong"
        message="Yakin ingin menghapus kantong ini? Kantong hanya bisa dihapus jika tidak memiliki transaksi."
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
