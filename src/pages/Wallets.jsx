import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { StatTile } from '@/components/ui/StatTile'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { WalletModal } from '@/components/wallets/WalletModal'
import { TransferModal } from '@/components/wallets/TransferModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useWallets, useDeleteWallet } from '@/hooks/useWallets'
import { useTransactions } from '@/hooks/useTransactions'
import { useViewport } from '@/hooks/useViewport'
import { formatCurrency, idrShort, fmtRelative } from '@/lib/utils'

const WALLET_TYPE_LABELS = {
  cash:       'Tunai',
  bank:       'Bank',
  ewallet:    'E-wallet',
  savings:    'Tabungan',
  investment: 'Investasi',
  credit:     'Kartu Kredit',
  other:      'Lainnya',
}
const typeLabel = (t) => WALLET_TYPE_LABELS[t] || t || 'Lainnya'

function ActivityRow({ tx }) {
  const isIncome = tx.type === 'income'
  const color = tx.categories?.color || '#6b7280'
  const icon = tx.categories?.icon || (isIncome ? '💰' : tx.type === 'transfer' ? '🔄' : '💸')
  const meta = [tx.creator_name, fmtRelative(tx.date)].filter(Boolean).join(' · ')

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 38, height: 38, borderRadius: 12, background: color + '22', fontSize: 18 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {tx.description || tx.categories?.name || '-'}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{meta}</p>
      </div>
      <span
        className="text-sm font-bold font-mono tabular-nums whitespace-nowrap"
        style={{ color: isIncome ? 'var(--good)' : 'var(--ink)' }}
      >
        {isIncome ? '+' : '−'} {formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

export default function Wallets() {
  const { isMobile } = useViewport()
  const { data: wallets, isLoading } = useWallets()
  const deleteMutation = useDeleteWallet()

  const [selectedId, setSelectedId] = useState(null)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferFromWallet, setTransferFromWallet] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const list = wallets || []
  const selected = list.find((w) => w.id === selectedId) || list[0] || null
  const totalBalance = list.reduce((s, w) => s + Number(w.balance || 0), 0)

  const { data: txData } = useTransactions(selected ? { wallet_id: selected.id } : {})
  const activity = (txData?.data || []).slice(0, 8)

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Kantong' }
  )

  const openAdd = () => {
    setEditingWallet(null)
    setWalletModalOpen(true)
  }
  const openEdit = (wallet) => {
    setEditingWallet(wallet)
    setWalletModalOpen(true)
  }
  const openTransfer = (wallet) => {
    setTransferFromWallet(wallet)
    setTransferModalOpen(true)
  }
  const handleDelete = () => {
    triggerDelete(deleteId)
    if (deleteId === selected?.id) setSelectedId(null)
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
    <div className="space-y-5 max-w-5xl mx-auto pb-24 lg:pb-8">
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Kantong / Dompet</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{list.length} kantong</p>
      </div>

      {list.length > 0 && (
        <StatTile
          accent
          label="Total Kekayaan"
          value={formatCurrency(totalBalance)}
          sub={`${list.length} kantong`}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface-2)' }} />
              <div className="h-3 rounded w-14 mt-3" style={{ background: 'var(--surface-2)' }} />
              <div className="h-4 rounded w-24 mt-2" style={{ background: 'var(--surface-2)' }} />
              <div className="h-5 rounded w-20 mt-3" style={{ background: 'var(--surface-2)' }} />
            </div>
          ))}
        </div>
      ) : !list.length ? (
        <Card padding={0}>
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--surface-2)' }}>
              <Icon name="wallet" size={22} style={{ color: 'var(--ink-3)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Belum ada kantong</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>Tambah kantong pertama kamu</p>
            <Button className="mt-4" size="sm" onClick={openAdd}>
              <Icon name="plus" size={15} stroke={2.2} />
              Tambah Kantong
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr' }}>
          {/* LEFT: wallet grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Kantong Kamu</h3>
              <Button variant="soft" size="sm" onClick={openAdd}>
                <Icon name="plus" size={14} stroke={2.2} />
                Tambah
              </Button>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {list.map((w) => {
                const isSel = selected?.id === w.id
                return (
                  <Card
                    key={w.id}
                    padding={16}
                    onClick={() => setSelectedId(w.id)}
                    style={{
                      background: w.color + '15',
                      border: isSel ? `2px solid ${w.color}` : `1px solid ${w.color}30`,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{ width: 36, height: 36, borderRadius: 12, background: w.color, color: '#fff', fontSize: 18 }}
                    >
                      {w.icon || '💳'}
                    </div>
                    <div className="text-[11px] mt-3" style={{ color: 'var(--ink-3)' }}>{typeLabel(w.type)}</div>
                    <div className="text-[13px] font-bold" style={{ color: 'var(--ink)', margin: '2px 0 8px' }}>{w.name}</div>
                    <div className="font-display tabular-nums" style={{ fontSize: 18 }}>
                      {idrShort(w.balance)}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* RIGHT: detail panel */}
          {selected && (
            <Card
              padding={isMobile ? 18 : 22}
              style={{ alignSelf: 'flex-start', position: isMobile ? 'static' : 'sticky', top: 90 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 52, height: 52, borderRadius: 16, background: selected.color, color: '#fff', fontSize: 24 }}
                >
                  {selected.icon || '💳'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{typeLabel(selected.type)}</div>
                  <div className="text-base font-bold truncate" style={{ color: 'var(--ink)' }}>{selected.name}</div>
                </div>
              </div>

              <div className="font-display tabular-nums" style={{ fontSize: 32, marginBottom: 14 }}>
                {formatCurrency(selected.balance)}
              </div>

              <div className="flex gap-2 mb-5">
                <Button variant="soft" size="sm" className="flex-1" onClick={() => openTransfer(selected)}>
                  <Icon name="swap" size={15} />
                  Transfer
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(selected)}>
                  <Icon name="pencil" size={14} />
                  Ubah
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDeleteId(selected.id)} style={{ color: 'var(--bad)' }}>
                  <Icon name="trash" size={14} />
                  Hapus
                </Button>
              </div>

              <div
                className="mb-2"
                style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}
              >
                Aktivitas
              </div>
              {activity.length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Belum ada transaksi.</div>
              ) : (
                <div className="flex flex-col">
                  {activity.map((tx) => (
                    <ActivityRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </Card>
          )}
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
