import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const colorMap = {
  green: { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#16A34A' },
  red:   { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626' },
  blue:  { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB' },
  amber: { bg: '#FFFBEB', iconBg: '#FEF3C7', iconColor: '#D97706' },
  teal:  { bg: 'var(--accent-soft)', iconBg: 'var(--accent-soft)', iconColor: 'var(--accent-ink)' },
}

export function KPICard({ title, amount, icon: Icon, color = 'green', trend, subtitle }) {
  const c = colorMap[color] || colorMap.green

  return (
    <div
      className="rounded-r-lg p-4"
      style={{
        background: c.bg,
        borderRadius: 'var(--r-lg)',
        border: 'none',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: c.iconColor }}
          >
            {title}
          </p>
          <p
            className="text-xl font-bold mt-1 font-mono tabular-nums"
            style={{ color: 'var(--ink)' }}
          >
            {formatCurrency(amount)}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, color: c.iconColor }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />
          ) : trend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />
          ) : (
            <Minus className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
          )}
          <span
            className="text-xs font-medium"
            style={{
              color: trend > 0 ? '#16A34A' : trend < 0 ? '#DC2626' : 'var(--ink-3)',
            }}
          >
            {trend > 0 ? '+' : ''}
            {trend}% vs bulan lalu
          </span>
        </div>
      )}
    </div>
  )
}
