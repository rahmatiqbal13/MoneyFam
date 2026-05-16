import { Edit2, Trash2 } from 'lucide-react'
import { formatCurrency, getBudgetProgressColor, getBudgetStatus } from '@/lib/utils'

export function BudgetCard({ budget, onEdit, onDelete }) {
  const spent = budget.spent || 0
  const amount = budget.amount || 0
  const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0
  const status = getBudgetStatus(spent, amount)
  const progressColor = getBudgetProgressColor(spent, amount)

  const statusText = {
    over: 'Melebihi anggaran',
    warning: 'Hampir habis',
    good: 'Aman',
    none: '-',
  }

  const statusTextColor = {
    over: 'text-red-500',
    warning: 'text-amber-500',
    good: 'text-emerald-500',
    none: 'text-gray-400',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: (budget.categories?.color || '#6b7280') + '20' }}
          >
            {budget.categories?.icon || '📦'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {budget.categories?.name || 'Kategori'}
            </p>
            <p className={`text-xs font-medium ${statusTextColor[status]}`}>
              {statusText[status]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">{pct.toFixed(0)}% terpakai</span>
          <span className="text-xs text-gray-400">
            {formatCurrency(spent)} / {formatCurrency(amount)}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <div>
          <p className="text-xs text-gray-400">Sisa</p>
          <p className={`text-sm font-semibold ${status === 'over' ? 'text-red-500' : 'text-gray-900'}`}>
            {status === 'over' ? '-' : ''}{formatCurrency(Math.abs(amount - spent))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Anggaran</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</p>
        </div>
      </div>
    </div>
  )
}
