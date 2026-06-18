import { Link } from 'react-router-dom'
import { Wallet, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useWallets } from '@/hooks/useWallets'

export function WalletSummary() {
  const { data: wallets, isLoading } = useWallets()

  const totalBalance = wallets?.reduce((s, w) => s + Number(w.balance || 0), 0) || 0

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-xl" style={{ background: 'var(--surface-2)' }} />
            <div className="flex-1">
              <div className="h-3.5 rounded-lg w-24 mb-1" style={{ background: 'var(--surface-2)' }} />
              <div className="h-3 rounded-lg w-16" style={{ background: 'var(--surface-2)' }} />
            </div>
            <div className="h-4 rounded-lg w-20" style={{ background: 'var(--surface-2)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!wallets?.length) {
    return (
      <div className="py-6 text-center">
        <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ink-3)' }} />
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Belum ada kantong</p>
        <Link
          to="/wallets"
          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent-ink)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Tambah kantong
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div
        className="mb-3 p-3 rounded-xl"
        style={{
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-sm)',
        }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Total Kekayaan Bersih</p>
        <p className="text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
          {formatCurrency(totalBalance)}
        </p>
      </div>
      <div className="space-y-0.5">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="flex items-center gap-3 py-2 px-2 transition-colors"
            style={{ borderRadius: 'var(--r-sm)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
              style={{ backgroundColor: (wallet.color || 'var(--accent)') + '22' }}
            >
              {wallet.icon || '💳'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                {wallet.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {wallet.type || 'Umum'}
              </p>
            </div>
            <p className="text-sm font-semibold font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
              {formatCurrency(wallet.balance)}
            </p>
          </div>
        ))}
      </div>
      <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--line)' }}>
        <Link
          to="/wallets"
          className="text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent-ink)' }}
        >
          Kelola kantong →
        </Link>
      </div>
    </div>
  )
}
