import { Edit2, Trash2 } from 'lucide-react'
import { formatCurrency, getBudgetStatus } from '@/lib/utils'

const progressColors = {
  over:    '#DC2626',
  warning: '#D97706',
  good:    '#16A34A',
  none:    'var(--line-2)',
}

const statusText = {
  over:    'Melebihi anggaran',
  warning: 'Hampir habis',
  good:    'Aman',
  none:    '-',
}

const statusColors = {
  over:    '#DC2626',
  warning: '#D97706',
  good:    '#16A34A',
  none:    'var(--ink-3)',
}

export function BudgetCard({ budget, onEdit, onDelete }) {
  const spent = budget.spent || 0
  const amount = budget.amount || 0
  const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0
  const status = getBudgetStatus(spent, amount)
  const progressColor = progressColors[status]

  return (
    <div
      className="p-4 transition-shadow"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: (budget.categories?.color || '#6b7280') + '22' }}
          >
            {budget.categories?.icon || '📦'}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {budget.categories?.name || 'Kategori'}
            </p>
            <p className="text-xs font-medium" style={{ color: statusColors[status] }}>
              {statusText[status]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-ink)'
              e.currentTarget.style.background = 'var(--accent-soft)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-3)'
              e.currentTarget.style.background = 'transparent'
            }}
            aria-label="Edit anggaran"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#DC2626'
              e.currentTarget.style.background = '#FEE2E2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-3)'
              e.currentTarget.style.background = 'transparent'
            }}
            aria-label="Hapus anggaran"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            {pct.toFixed(0)}% terpakai
          </span>
          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--ink-3)' }}>
            {formatCurrency(spent)} / {formatCurrency(amount)}
          </span>
        </div>
        <div
          className="w-full h-2 overflow-hidden"
          style={{ background: 'var(--surface-2)', borderRadius: 999 }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: progressColor, borderRadius: 999 }}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Sisa</p>
          <p
            className="text-sm font-semibold font-mono tabular-nums"
            style={{ color: status === 'over' ? '#DC2626' : 'var(--ink)' }}
          >
            {status === 'over' ? '-' : ''}{formatCurrency(Math.abs(amount - spent))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Anggaran</p>
          <p className="text-sm font-semibold font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatCurrency(amount)}
          </p>
        </div>
      </div>
    </div>
  )
}
