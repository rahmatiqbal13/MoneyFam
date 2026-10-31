import { useState } from 'react'
import { StatStrip } from '@/components/ui/StatTile'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { envelopeTones } from '@/lib/theme'
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
  const meta = [tx.creator_name?.split(' ')[0], fmtRelative(tx.date)].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.description || tx.categories?.name || '-'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta}</span>
      </div>
      <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: isIncome ? 'var(--good)' : 'var(--ink)' }}>
        {isIncome ? '+' : '−'}{idrShort(Number(tx.amount))}
      </span>
    </div>
  )
}

export default function Wallets() {
  const { isMobile, narrow } = useViewport()
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
  const sumOf = (types) => list.filter((w) => types.includes(w.type)).reduce((s, w) => s + Number(w.balance || 0), 0)

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
    <div>
      <PageHeader
        title="Kantong"
        eyebrow={`${list.length} kantong`}
        actions={[
          <Button key="add" onClick={openAdd}>Tambah kantong</Button>,
          list.length > 1 && <Button key="tr" variant="secondary" onClick={() => openTransfer(selected)}>Transfer antar kantong</Button>,
        ].filter(Boolean)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Total semua kantong</span>
            <span className="font-mono" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-.04em' }}>{formatCurrency(totalBalance)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Bank & e-wallet {idrShort(sumOf(['bank', 'ewallet']))} · Tunai {idrShort(sumOf(['cash']))}</span>
          </div>
        ) : (
          <StatStrip
            items={[
              { label: 'Total semua kantong', value: formatCurrency(totalBalance) },
              { label: 'Bank & e-wallet', value: formatCurrency(sumOf(['bank', 'ewallet'])) },
              { label: 'Tunai', value: formatCurrency(sumOf(['cash'])) },
            ]}
          />
        )}

        {isLoading ? (
          <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>Memuat kantong…</p>
        ) : !list.length ? (
          <div style={{ padding: '40px 24px', borderRadius: 18, border: '1.5px dashed var(--line-2)', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', maxWidth: 640 }}>
            <h3 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 24, letterSpacing: '-.02em' }}>Belum ada kantong</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              Kantong adalah tempat uang keluarga disimpan: rekening bank, dompet digital, atau uang tunai di rumah.
            </p>
            <Button onClick={openAdd}>Tambah kantong pertama</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: narrow ? 18 : 32, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {list.map((w) => {
                const isSel = selected?.id === w.id
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    aria-pressed={isSel}
                    className="lift"
                    style={{
                      minHeight: isMobile ? 124 : 168, border: 'none', borderRadius: isMobile ? 14 : 16, padding: isMobile ? 14 : 18,
                      background: envelopeTones(w.color).face, color: '#1D1B17', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: isMobile ? 3 : 6,
                      boxShadow: isSel ? 'inset 0 0 0 2px #1D1B17' : 'none',
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: isMobile ? 10 : 12, letterSpacing: '.06em', color: '#3E382F', textTransform: 'uppercase' }}>
                      {typeLabel(w.type)}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16 }}>{w.name}</span>
                    <span className="font-mono" style={{ marginTop: 'auto', fontWeight: 600, fontSize: isMobile ? 18 : 22, letterSpacing: '-.03em', whiteSpace: 'nowrap' }}>
                      {idrShort(Number(w.balance))}
                    </span>
                  </button>
                )
              })}
            </div>

            {selected && (
              <div style={{ background: 'var(--surface)', borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: '0 0 0 1px var(--line)', display: 'flex', flexDirection: 'column', gap: 18, position: narrow ? 'static' : 'sticky', top: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>{typeLabel(selected.type)}</span>
                  <h3 className="font-display" style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 22 : 28, letterSpacing: '-.03em' }}>{selected.name}</h3>
                  <span className="font-mono" style={{ fontWeight: 600, fontSize: isMobile ? 24 : 30, letterSpacing: '-.04em' }}>{formatCurrency(selected.balance)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {list.length > 1 && <Button className="flex-1" onClick={() => openTransfer(selected)}>Transfer</Button>}
                  <Button variant="secondary" className="flex-1" onClick={() => openEdit(selected)}>Ubah</Button>
                  <Button variant="danger-outline" className="flex-1" onClick={() => setDeleteId(selected.id)}>Hapus</Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="eyebrow" style={{ marginBottom: 6 }}>Aktivitas terakhir</span>
                  {activity.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)' }}>Belum ada aktivitas.</p>
                  ) : (
                    activity.map((tx) => <ActivityRow key={tx.id} tx={tx} />)
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
        title="Hapus kantong"
        message="Yakin ingin menghapus kantong ini? Kantong hanya bisa dihapus jika tidak memiliki transaksi."
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
