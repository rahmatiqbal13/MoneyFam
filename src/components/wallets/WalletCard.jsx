import { Edit2, Trash2, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const WALLET_TYPE_LABELS = {
  cash: 'Tunai',
  bank: 'Bank',
  ewallet: 'E-Wallet',
  investment: 'Investasi',
  savings: 'Tabungan',
  credit: 'Kartu Kredit',
  other: 'Lainnya',
}

export function WalletCard({ wallet, onEdit, onDelete, onTransfer }) {
  const color = wallet.color || '#10b981'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Color strip */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: color + '20' }}
            >
              {wallet.icon || '💳'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
              <span className="text-xs text-gray-400">
                {WALLET_TYPE_LABELS[wallet.type] || wallet.type || 'Umum'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onTransfer(wallet)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Transfer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(wallet)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(wallet.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Hapus"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-0.5">Saldo Saat Ini</p>
          <p className="text-xl font-bold" style={{ color }}>
            {formatCurrency(wallet.balance)}
          </p>
        </div>

        {wallet.initial_balance !== undefined && wallet.initial_balance !== null && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              Saldo awal: {formatCurrency(wallet.initial_balance)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
