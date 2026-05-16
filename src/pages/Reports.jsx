import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank,
  Percent, ArrowUpRight, ArrowDownRight, Users, Flame,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency, formatDate, getBudgetProgressColor } from '@/lib/utils'
import {
  useMonthlyStats,
  useMonthlyTrend,
  useReportCategoryDetail,
  useTopTransactions,
  useMemberSpending,
  useDailySpending,
  usePeriodStats,
  usePeriodCategoryDetail,
  useYearlyStats,
} from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudget'

// ── Date helpers ─────────────────────────────────────────────────────────────

function getWeekRange(date) {
  const d = new Date(date)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    from: mon.toISOString().split('T')[0],
    to: sun.toISOString().split('T')[0],
    label: `${mon.getDate()}–${sun.getDate()} ${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(sun)} ${sun.getFullYear()}`,
  }
}

function formatYAxis(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return v
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-900">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ stats, isLoading }) {
  const savingRate = stats?.income > 0 ? Math.round((stats.savings / stats.income) * 100) : 0
  const cards = [
    { label: 'Pemasukan', value: stats?.income ?? 0, icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', valueColor: 'text-emerald-600' },
    { label: 'Pengeluaran', value: stats?.expense ?? 0, icon: TrendingDown, iconBg: 'bg-red-50', iconColor: 'text-red-500', valueColor: 'text-red-600' },
    { label: 'Tabungan', value: Math.max(0, stats?.savings ?? 0), icon: PiggyBank, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', valueColor: 'text-blue-600' },
    { label: 'Saving Rate', value: savingRate, icon: Percent, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', valueColor: savingRate >= 20 ? 'text-emerald-600' : savingRate >= 10 ? 'text-amber-600' : 'text-red-500', isPercent: true },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className={`w-4 h-4 ${c.iconColor}`} />
              </div>
            </div>
            {isLoading
              ? <div className="h-6 bg-gray-100 rounded animate-pulse w-24" />
              : <p className={`text-lg font-bold ${c.valueColor}`}>
                  {c.isPercent ? `${c.value}%` : formatCurrency(c.value)}
                </p>
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Spending Heatmap ──────────────────────────────────────────────────────────

function SpendingHeatmap({ year, month }) {
  const { data: dailySpending, isLoading } = useDailySpending(year, month)

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    return { daysInMonth, startOffset }
  }, [year, month])

  const maxSpending = useMemo(() => {
    if (!dailySpending) return 1
    return Math.max(1, ...Object.values(dailySpending))
  }, [dailySpending])

  function getColor(amount) {
    if (!amount) return 'bg-gray-100'
    const ratio = amount / maxSpending
    if (ratio < 0.2) return 'bg-emerald-200'
    if (ratio < 0.4) return 'bg-yellow-200'
    if (ratio < 0.6) return 'bg-orange-200'
    if (ratio < 0.8) return 'bg-orange-400'
    return 'bg-red-500'
  }

  function getTooltipText(dayNum) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    const amount = dailySpending?.[dateStr] || 0
    return amount > 0 ? formatCurrency(amount) : 'Tidak ada pengeluaran'
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDay = today.getDate()

  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  if (isLoading) return <Spinner />

  return (
    <div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: days.startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: days.daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const amount = dailySpending?.[dateStr] || 0
          const isToday = isCurrentMonth && dayNum === todayDay

          return (
            <div
              key={dayNum}
              title={`${dayNum} — ${getTooltipText(dayNum)}`}
              className={`aspect-square rounded-md flex items-center justify-center cursor-default transition-transform hover:scale-110 ${getColor(amount)} ${
                isToday ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
            >
              <span className={`text-xs font-medium ${amount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <span className="text-xs text-gray-400">Pengeluaran:</span>
        <div className="flex items-center gap-1">
          {[
            { color: 'bg-gray-100', label: 'Nol' },
            { color: 'bg-emerald-200', label: 'Rendah' },
            { color: 'bg-yellow-200', label: '' },
            { color: 'bg-orange-200', label: '' },
            { color: 'bg-orange-400', label: '' },
            { color: 'bg-red-500', label: 'Tinggi' },
          ].map(({ color, label }, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <div className={`w-4 h-4 rounded ${color}`} />
              {label && <span className="text-xs text-gray-400">{label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Future Projection ─────────────────────────────────────────────────────────

function FutureProjection({ year, month, stats }) {
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  if (!isCurrentMonth || !stats) return null

  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth

  if (dayOfMonth < 3) return null

  const dailyAvgExpense = stats.expense / dayOfMonth
  const projectedExpense = stats.expense + dailyAvgExpense * daysLeft
  const projectedSavings = stats.income - projectedExpense

  const isOnTrack = projectedSavings >= 0

  return (
    <div className={`rounded-xl border p-4 ${isOnTrack ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Flame className={`w-4 h-4 ${isOnTrack ? 'text-emerald-600' : 'text-amber-600'}`} />
        <p className="text-sm font-semibold text-gray-800">Proyeksi Akhir Bulan</p>
        <span className="text-xs text-gray-400">({daysLeft} hari lagi)</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">Rata-rata Pengeluaran/Hari</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(Math.round(dailyAvgExpense))}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Proyeksi Total Pengeluaran</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(Math.round(projectedExpense))}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Proyeksi Sisa Bulan</p>
          <p className={`text-sm font-bold ${isOnTrack ? 'text-emerald-600' : 'text-red-600'}`}>
            {projectedSavings >= 0 ? '+' : ''}{formatCurrency(Math.round(projectedSavings))}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {isOnTrack
          ? `Jika pola ini berlanjut, kamu masih akan surplus ${formatCurrency(Math.round(projectedSavings))} akhir bulan. 🎉`
          : `Pengeluaran diprediksi melebihi pemasukan. Pertimbangkan mengurangi pengeluaran ${Math.abs(Math.round(daysLeft > 0 ? (projectedExpense - stats.income) / daysLeft : 0)).toLocaleString('id-ID')}/hari.`
        }
      </p>
    </div>
  )
}

// ── Category Breakdown ────────────────────────────────────────────────────────

function CategoryBreakdown({ data, isLoading, isError }) {
  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-500 text-center py-6">Gagal memuat data</p>
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">Belum ada pengeluaran</p>

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((cat) => (
        <div key={cat.id}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{cat.icon}</span>
              <span className="text-sm text-gray-700 truncate">{cat.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">({cat.count}×)</span>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
              <span className="text-xs text-gray-400 ml-1.5">{cat.pct.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${cat.pct}%`, backgroundColor: cat.color || '#10b981' }} />
          </div>
        </div>
      ))}
      {data.length > 8 && <p className="text-xs text-gray-400 text-center pt-1">+{data.length - 8} kategori lainnya</p>}
    </div>
  )
}

// ── Budget vs Actual ──────────────────────────────────────────────────────────

function BudgetVsActual({ year, month }) {
  const ym = `${year}-${String(month).padStart(2, '0')}`
  const { data: budgets, isLoading } = useBudgets(ym)
  if (isLoading) return <Spinner />
  if (!budgets?.length) return <p className="text-sm text-gray-400 text-center py-8">Belum ada anggaran bulan ini</p>

  return (
    <div className="space-y-3">
      {budgets.map((b) => {
        const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
        const over = b.spent > b.amount
        const barColor = getBudgetProgressColor(b.spent, b.amount)
        return (
          <div key={b.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{b.categories?.icon}</span>
                <span className="text-sm text-gray-700 truncate">{b.categories?.name}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className={`text-sm font-semibold ${over ? 'text-red-500' : 'text-gray-900'}`}>
                  {formatCurrency(b.spent)}
                </span>
                <span className="text-xs text-gray-400 ml-1">/ {formatCurrency(b.amount)}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            {over && <p className="text-xs text-red-400 mt-0.5">Lebih {formatCurrency(b.spent - b.amount)}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ── Top Transactions ──────────────────────────────────────────────────────────

function TopTransactions({ year, month }) {
  const { data, isLoading, isError, error } = useTopTransactions(year, month, 5)
  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-500 text-center py-6">{error?.message}</p>
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">Belum ada pengeluaran bulan ini</p>

  return (
    <div className="space-y-2">
      {data.map((tx, i) => (
        <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
          <span className="text-lg flex-shrink-0">{tx.categories?.icon || '📦'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{tx.description || tx.categories?.name || 'Transaksi'}</p>
            <p className="text-xs text-gray-400">{tx.categories?.name} · {formatDate(tx.date)}</p>
          </div>
          <p className="text-sm font-semibold text-red-500 flex-shrink-0">-{formatCurrency(tx.amount)}</p>
        </div>
      ))}
    </div>
  )
}

// ── Member Breakdown ──────────────────────────────────────────────────────────

function MemberBreakdown({ year, month }) {
  const { data, isLoading } = useMemberSpending(year, month)
  if (isLoading || !data?.length || data.length < 2) return null
  const maxExpense = Math.max(...data.map((m) => m.expense), 1)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <CardTitle>Kontribusi Per Anggota</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((member) => (
            <div key={member.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                  {member.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{member.role === 'owner' ? 'Pemilik' : 'Anggota'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-emerald-600"><ArrowUpRight className="w-3.5 h-3.5" />Pemasukan</span>
                  <span className="font-medium text-gray-900">{formatCurrency(member.income)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-red-500"><ArrowDownRight className="w-3.5 h-3.5" />Pengeluaran</span>
                  <span className="font-medium text-gray-900">{formatCurrency(member.expense)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${(member.expense / maxExpense) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Monthly view (default) ────────────────────────────────────────────────────

function MonthlyView({ year, month }) {
  const { data: stats, isLoading } = useMonthlyStats(year, month)
  const { data: trendData, isLoading: trendLoading } = useMonthlyTrend(year, month, 6)
  const { data: catData, isLoading: catLoading, isError: catError } = useReportCategoryDetail(year, month)

  return (
    <div className="space-y-5">
      <SummaryCards stats={stats} isLoading={isLoading} />

      {/* Future Projection */}
      <FutureProjection year={year} month={month} stats={stats} />

      {/* Trend Chart */}
      <Card>
        <CardHeader><CardTitle>Tren 6 Bulan Terakhir</CardTitle></CardHeader>
        <CardContent>
          {trendLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barSize={18} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
                <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category + Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Pengeluaran per Kategori</CardTitle></CardHeader>
          <CardContent>
            <CategoryBreakdown data={catData} isLoading={catLoading} isError={catError} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Anggaran vs Realisasi</CardTitle></CardHeader>
          <CardContent>
            <BudgetVsActual year={year} month={month} />
          </CardContent>
        </Card>
      </div>

      {/* Spending Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <CardTitle>Kalender Pengeluaran Harian</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <SpendingHeatmap year={year} month={month} />
        </CardContent>
      </Card>

      {/* Top Transactions */}
      <Card>
        <CardHeader><CardTitle>Transaksi Terbesar Bulan Ini</CardTitle></CardHeader>
        <CardContent><TopTransactions year={year} month={month} /></CardContent>
      </Card>

      {/* Member breakdown */}
      <MemberBreakdown year={year} month={month} />
    </div>
  )
}

// ── Period view (harian/mingguan/tahunan) ─────────────────────────────────────

function PeriodView({ period, dateFrom, dateTo, periodLabel, year }) {
  const { data: stats, isLoading } = usePeriodStats(dateFrom, dateTo)
  const { data: catData, isLoading: catLoading, isError: catError } = usePeriodCategoryDetail(dateFrom, dateTo)
  const { data: yearlyData, isLoading: yearlyLoading } = useYearlyStats(year)

  if (period === 'tahunan') {
    const totalIncome = (yearlyData || []).reduce((s, m) => s + m.income, 0)
    const totalExpense = (yearlyData || []).reduce((s, m) => s + m.expense, 0)
    const yearStats = { income: totalIncome, expense: totalExpense, savings: totalIncome - totalExpense }

    return (
      <div className="space-y-5">
        <SummaryCards stats={yearStats} isLoading={yearlyLoading} />
        <Card>
          <CardHeader><CardTitle>Pemasukan vs Pengeluaran {year}</CardTitle></CardHeader>
          <CardContent>
            {yearlyLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yearlyData} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
                  <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pengeluaran per Kategori {year}</CardTitle></CardHeader>
          <CardContent>
            <CategoryBreakdown data={catData} isLoading={catLoading} isError={catError} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SummaryCards stats={stats} isLoading={isLoading} />
      <Card>
        <CardHeader><CardTitle>Pengeluaran per Kategori</CardTitle></CardHeader>
        <CardContent>
          <CategoryBreakdown data={catData} isLoading={catLoading} isError={catError} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'harian', label: 'Harian' },
  { key: 'mingguan', label: 'Mingguan' },
  { key: 'bulanan', label: 'Bulanan' },
  { key: 'tahunan', label: 'Tahunan' },
]

export default function Reports() {
  const [period, setPeriod] = useState('bulanan')
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const navigateMonth = (dir) => {
    const d = new Date(year, month - 1 + dir, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const navigateDay = (dir) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  const navigateWeek = (dir) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const navigateYear = (dir) => setYear((y) => y + dir)

  const isCurrentPeriod = useMemo(() => {
    const now = new Date()
    if (period === 'bulanan') return year === now.getFullYear() && month === now.getMonth() + 1
    if (period === 'harian') return currentDate.toDateString() === now.toDateString()
    if (period === 'mingguan') {
      const w1 = getWeekRange(currentDate)
      const w2 = getWeekRange(now)
      return w1.from === w2.from
    }
    if (period === 'tahunan') return year === now.getFullYear()
    return false
  }, [period, year, month, currentDate])

  // Compute date range for current period
  const { dateFrom, dateTo, displayLabel } = useMemo(() => {
    if (period === 'harian') {
      const d = currentDate.toISOString().split('T')[0]
      const label = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate)
      return { dateFrom: d, dateTo: d, displayLabel: label }
    }
    if (period === 'mingguan') {
      const range = getWeekRange(currentDate)
      return { dateFrom: range.from, dateTo: range.to, displayLabel: range.label }
    }
    if (period === 'bulanan') {
      return { dateFrom: null, dateTo: null, displayLabel: monthLabel(year, month) }
    }
    if (period === 'tahunan') {
      return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, displayLabel: String(year) }
    }
    return { dateFrom: null, dateTo: null, displayLabel: '' }
  }, [period, year, month, currentDate])

  const handleNav = (dir) => {
    if (period === 'harian') navigateDay(dir)
    else if (period === 'mingguan') navigateWeek(dir)
    else if (period === 'bulanan') navigateMonth(dir)
    else if (period === 'tahunan') navigateYear(dir)
  }

  const goToNow = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
    setCurrentDate(now)
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Period tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => handleNav(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-44 text-center">{displayLabel}</h2>
          <button
            onClick={() => handleNav(1)}
            disabled={isCurrentPeriod}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {!isCurrentPeriod && (
          <button onClick={goToNow} className="text-xs text-primary font-medium hover:underline">
            Kembali ke sekarang
          </button>
        )}
      </div>

      {/* Content */}
      {period === 'bulanan' ? (
        <MonthlyView year={year} month={month} />
      ) : (
        <PeriodView
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          periodLabel={displayLabel}
          year={year}
        />
      )}
    </div>
  )
}
