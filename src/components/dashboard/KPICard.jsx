import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function KPICard({ title, amount, icon: Icon, color = 'green', trend, subtitle }) {
  const colorMap = {
    green: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      text: 'text-emerald-600',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      text: 'text-red-600',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-600',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-600',
    },
  }

  const c = colorMap[color] || colorMap.green

  return (
    <div className={cn('rounded-xl p-4 border', c.bg, 'border-transparent')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(amount)}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : trend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'
            )}
          >
            {trend > 0 ? '+' : ''}{trend}% vs bulan lalu
          </span>
        </div>
      )}
    </div>
  )
}
