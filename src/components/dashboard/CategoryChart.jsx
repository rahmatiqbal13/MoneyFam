import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useCategorySpending } from '@/hooks/useTransactions'

const DEFAULT_COLORS = [
  '#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-600 mt-0.5">{formatCurrency(d.value)}</p>
      <p className="text-gray-400 text-xs">{(d.payload.percent * 100).toFixed(1)}%</p>
    </div>
  )
}

export function CategoryChart() {
  const now = new Date()
  const { data, isLoading } = useCategorySpending(now.getFullYear(), now.getMonth() + 1)

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Belum ada pengeluaran bulan ini
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  const chartData = data.map((d, i) => ({
    ...d,
    color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    percent: d.value / total,
  }))

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-1.5">
        {chartData.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
            <span className="text-xs font-medium text-gray-800">{(item.percent * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
