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
            <div className="w-8 h-8 bg-gray-100 rounded-lg" />
            <div className="flex-1">
              <div className="h-3.5 bg-gray-100 rounded w-24 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!wallets?.length) {
    return (
      <div className="py-6 text-center">
        <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Belum ada kantong</p>
        <Link
          to="/wallets"
          className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah kantong
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <p className="text-xs text-gray-500">Total Kekayaan Bersih</p>
        <p className="text-lg font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
      </div>
      <div className="space-y-1">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
              style={{ backgroundColor: (wallet.color || '#10b981') + '20' }}
            >
              {wallet.icon || '💳'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{wallet.name}</p>
              <p className="text-xs text-gray-400">{wallet.type || 'Umum'}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(wallet.balance)}
            </p>
          </div>
        ))}
      </div>
      <div className="pt-2 mt-1 border-t border-gray-100">
        <Link
          to="/wallets"
          className="text-xs text-primary font-medium hover:underline"
        >
          Kelola kantong →
        </Link>
      </div>
    </div>
  )
}
