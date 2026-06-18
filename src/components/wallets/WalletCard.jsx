import { Edit2, Trash2, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const WALLET_TYPE_LABELS = {
  cash:       'Tunai',
  bank:       'Bank',
  ewallet:    'E-Wallet',
  investment: 'Investasi',
  savings:    'Tabungan',
  credit:     'Kartu Kredit',
  other:      'Lainnya',
}

function IconButton({ onClick, title, children, hoverColor }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-1.5 rounded-xl transition-colors"
      style={{ color: 'var(--ink-3)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor || 'var(--accent-ink)'
        e.currentTarget.style.background = hoverColor ? hoverColor + '15' : 'var(--accent-soft)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ink-3)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

export function WalletCard({ wallet, onEdit, onDelete, onTransfer }) {
  const color = wallet.color || 'var(--accent)'

  return (
    <div
      className="overflow-hidden transition-shadow"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      {/* Color strip */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: color + '22' }}
            >
              {wallet.icon || '💳'}
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                {wallet.name}
              </h3>
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {WALLET_TYPE_LABELS[wallet.type] || wallet.type || 'Umum'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <IconButton onClick={() => onTransfer(wallet)} title="Transfer">
              <ArrowLeftRight className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={() => onEdit(wallet)} title="Edit">
              <Edit2 className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={() => onDelete(wallet.id)} title="Hapus" hoverColor="#DC2626">
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--ink-3)' }}>Saldo Saat Ini</p>
          <p className="text-xl font-bold font-mono tabular-nums" style={{ color }}>
            {formatCurrency(wallet.balance)}
          </p>
        </div>

        {wallet.initial_balance !== undefined && wallet.initial_balance !== null && (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Saldo awal: {formatCurrency(wallet.initial_balance)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
