import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Users, Flame,
  X, Receipt, Edit2, Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatTile } from '@/components/ui/StatTile'
import { Progress } from '@/components/ui/Progress'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, getBudgetStatus, idrShort, toDateStr } from '@/lib/utils'
import { memberColor } from '@/lib/memberColor'
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
import { useDataExport } from '@/hooks/useDataImportExport'
import { useQueryClient } from '@tanstack/react-query'
import { useBudgets } from '@/hooks/useBudget'

// ── Token helpers (recharts needs concrete colors) ───────────────────────────

function tok(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)
  return (v || '').trim() || fallback
}

// rgba built from the live --accent token so the heatmap tints follow the theme
function accentAlpha(a) {
  const hex = tok('--accent', '#0EA5A4').trim()
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function heatBg(ratio) {
  if (!ratio || ratio <= 0) return 'var(--surface-2)'
  const step = ratio < 0.2 ? 0.16 : ratio < 0.4 ? 0.32 : ratio < 0.6 ? 0.5 : ratio < 0.8 ? 0.7 : 0.92
  return accentAlpha(step)
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function getWeekRange(date) {
  const d = new Date(date)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    from: toDateStr(mon),
    to: toDateStr(sun),
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

// ── Shared chart pieces ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-sm"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
        boxShadow: 'var(--shadow-md)',
        padding: 12,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || 'var(--ink-3)' }} />
          <span style={{ color: 'var(--ink-2)' }}>{p.name}:</span>
          <span className="font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function CashFlowChart({ data, barSize = 18 }) {
  const incomeColor = tok('--accent', '#0EA5A4')   // income → accent
  const expenseColor = tok('--ink-3', '#918878')   // expense → muted ink
  const axis = tok('--ink-3', '#918878')
  const grid = tok('--line', '#ECE2CB')
  const cursor = tok('--surface-2', '#F7F1E4')
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={barSize} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: axis }} axisLine={false} tickLine={false} width={42} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: cursor }} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-ink-2">{v}</span>} />
        <Bar dataKey="income" name="Pemasukan" fill={incomeColor} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Pengeluaran" fill={expenseColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ stats, isLoading }) {
  const savingRate = stats?.income > 0 ? Math.round((stats.savings / stats.income) * 100) : 0
  const fmt = (v) => (isLoading ? '…' : idrShort(v))
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile label="Pemasukan" value={fmt(stats?.income ?? 0)} />
      <StatTile label="Pengeluaran" value={fmt(stats?.expense ?? 0)} />
      <StatTile label="Tabungan" value={fmt(Math.max(0, stats?.savings ?? 0))} />
      <StatTile
        label="Saving Rate"
        value={isLoading ? '…' : `${savingRate}%`}
        accent={!isLoading && savingRate >= 20}
      />
    </div>
  )
}

// ── Day Transactions Modal ───────────────────────────────────────────────────

function DayTransactionsModal({ date, onClose, onTransactionDeleted }) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTx, setEditingTx] = useState(null)
  const [deletingTx, setDeletingTx] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const family = useAuthStore((s) => s.family)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!date) return
    let ignore = false

    async function fetchTransactions() {
      setIsLoading(true)
      try {
        let query = supabase
          .from('transactions')
          .select(`
            *,
            categories(id, name, icon, color),
            wallets!wallet_id(id, name, icon)
          `)
          .eq('date', date)
          .order('created_at', { ascending: false })

        if (family?.id) {
          query = query.eq('family_id', family.id)
        } else {
          query = query.eq('user_id', user.id)
        }

        const { data, error } = await query
        if (error) throw error
        if (!ignore) {
          setTransactions(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch day transactions:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchTransactions()
    return () => { ignore = true }
  }, [date, family, user])

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editingTx) return

    setIsSubmitting(true)
    const formData = new FormData(e.target)

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          description: formData.get('description'),
          amount: Number(formData.get('amount')),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTx.id)

      if (error) throw error

      // Refresh transactions
      setTransactions(prev => prev.map(tx =>
        tx.id === editingTx.id
          ? { ...tx, description: formData.get('description'), amount: Number(formData.get('amount')) }
          : tx
      ))
      setEditingTx(null)
    } catch (err) {
      alert('Gagal mengupdate: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTx) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deletingTx.id)

      if (error) throw error

      setTransactions(prev => prev.filter(tx => tx.id !== deletingTx.id))
      setDeletingTx(null)

      // Notify parent to refresh heatmap
      if (onTransactionDeleted) {
        onTransactionDeleted()
      }
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!date) return null

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          className="w-full max-w-lg max-h-[80vh] overflow-hidden"
          style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <h3 className="text-lg font-semibold text-ink">
                {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-sm text-ink-2">
                {transactions.length} transaksi
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface-2">
            <div className="text-center">
              <p className="text-xs text-ink-3 mb-1">Pemasukan</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-ink-3 mb-1">Pengeluaran</p>
              <p className="text-lg font-bold tabular-nums text-ink">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="overflow-y-auto max-h-[50vh] p-4">
            {isLoading ? (
              <Spinner />
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-ink-3 mx-auto mb-3" />
                <p className="text-ink-3 text-sm">Tidak ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (tx.categories?.color || '#6b7280') + '20' }}
                    >
                      <span className="text-lg">{tx.categories?.icon || (tx.type === 'income' ? '💰' : tx.type === 'expense' ? '💸' : '🔄')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {tx.description || tx.categories?.name || 'Transaksi'}
                      </p>
                      <p className="text-xs text-ink-3">
                        {tx.wallets?.name || 'Tanpa wallet'} • {tx.categories?.name || 'Tanpa kategori'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold flex-shrink-0 tabular-nums"
                        style={{ color: tx.type === 'income' ? 'var(--accent)' : 'var(--ink)' }}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                        {formatCurrency(tx.amount)}
                      </span>
                      {/* Edit & Delete Buttons */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTx(tx)}
                          className="p-1.5 rounded-lg text-ink-3 transition-colors hover:bg-surface"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md"
            style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-lg font-semibold text-ink">Edit Transaksi</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingTx(null)} aria-label="Tutup">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleEdit} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Deskripsi</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingTx.description || ''}
                  className="w-full rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Deskripsi transaksi"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-2 block mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  name="amount"
                  defaultValue={editingTx.amount}
                  required
                  className="w-full rounded-lg border border-line-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingTx(null)}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm p-6"
            style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'color-mix(in srgb, var(--bad) 14%, var(--surface))' }}>
                <Trash2 className="w-6 h-6" style={{ color: 'var(--bad)' }} />
              </div>
              <h3 className="text-lg font-semibold text-ink">Hapus Transaksi?</h3>
              <p className="text-sm text-ink-2 mt-1">
                Transaksi &quot;{deletingTx.description || deletingTx.categories?.name || 'Tanpa deskripsi'}&quot; sebesar {formatCurrency(deletingTx.amount)} akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={isSubmitting} onClick={() => setDeletingTx(null)}>
                Batal
              </Button>
              <Button variant="danger" className="flex-1" loading={isSubmitting} onClick={handleDelete}>
                {isSubmitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Spending Heatmap ──────────────────────────────────────────────────────────

function SpendingHeatmap({ year, month }) {
  const { data: dailySpending, isLoading } = useDailySpending(year, month)
  const [selectedDate, setSelectedDate] = useState(null)
  const queryClient = useQueryClient()

  const handleTransactionChanged = () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['transactions', 'daily-spending'] })
    queryClient.invalidateQueries({ queryKey: ['transactions', 'monthly-stats'] })
    queryClient.invalidateQueries({ queryKey: ['transactions', 'trend'] })
    queryClient.invalidateQueries({ queryKey: ['transactions', 'category-detail'] })
    queryClient.invalidateQueries({ queryKey: ['wallets'] })
  }

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
    <>
      <div>
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs text-ink-3 font-medium py-0.5">
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
              <button
                key={dayNum}
                title={`${dayNum} — ${getTooltipText(dayNum)}`}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  background: heatBg(amount / maxSpending),
                  ...(isToday ? { boxShadow: '0 0 0 2px var(--accent)' } : {}),
                }}
                className={`aspect-square rounded-md flex items-center justify-center transition-all hover:scale-110 hover:shadow-md ${
                  amount > 0 ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className={`text-xs font-medium ${amount > 0 ? 'text-ink' : 'text-ink-3'}`}>
                  {dayNum}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-xs text-ink-3">Rendah</span>
          <div className="flex items-center gap-1">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
              <div key={r} className="w-4 h-4 rounded" style={{ background: heatBg(r) }} />
            ))}
          </div>
          <span className="text-xs text-ink-3">Tinggi</span>
        </div>

        {/* Helper text */}
        <p className="text-xs text-ink-3 mt-2 text-center">
          Klik tanggal untuk melihat detail transaksi
        </p>
      </div>

      {/* Modal */}
      {selectedDate && (
        <DayTransactionsModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onTransactionDeleted={handleTransactionChanged}
        />
      )}
    </>
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
    <Card style={{ background: isOnTrack ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--warn) 16%, var(--surface))', border: 'none' }}>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4" style={{ color: isOnTrack ? 'var(--accent-ink)' : 'var(--warn)' }} />
          <p className="text-sm font-semibold text-ink">Proyeksi Akhir Bulan</p>
          <span className="text-xs text-ink-3">({daysLeft} hari lagi)</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-ink-3">Rata-rata Pengeluaran/Hari</p>
            <p className="text-sm font-bold text-ink tabular-nums">{formatCurrency(Math.round(dailyAvgExpense))}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Proyeksi Total Pengeluaran</p>
            <p className="text-sm font-bold text-ink tabular-nums">{formatCurrency(Math.round(projectedExpense))}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">Proyeksi Sisa Bulan</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: isOnTrack ? 'var(--accent-ink)' : 'var(--warn)' }}>
              {projectedSavings >= 0 ? '+' : ''}{formatCurrency(Math.round(projectedSavings))}
            </p>
          </div>
        </div>
        <p className="text-xs text-ink-2 mt-2">
          {isOnTrack
            ? `Jika pola ini berlanjut, kamu masih akan surplus ${formatCurrency(Math.round(projectedSavings))} akhir bulan. 🎉`
            : `Pengeluaran diprediksi melebihi pemasukan. Pertimbangkan mengurangi pengeluaran ${Math.abs(Math.round(daysLeft > 0 ? (projectedExpense - stats.income) / daysLeft : 0)).toLocaleString('id-ID')}/hari.`
          }
        </p>
      </CardContent>
    </Card>
  )
}

// ── Category Breakdown (donut + legend) ──────────────────────────────────────

function CategoryBreakdown({ data, isLoading, isError }) {
  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-center py-6" style={{ color: 'var(--bad)' }}>Gagal memuat data</p>
  if (!data?.length) return <p className="text-sm text-ink-3 text-center py-8">Belum ada pengeluaran</p>

  const total = data[0]?.total || data.reduce((s, c) => s + c.amount, 0)
  const R = 70
  const C = 2 * Math.PI * R
  let acc = 0
  const segs = data.map((cat) => {
    const start = acc / (total || 1)
    acc += cat.amount
    return { cat, start, end: acc / (total || 1) }
  })

  return (
    <div className="flex flex-wrap gap-5 items-center">
      <div className="relative w-[180px] h-[180px] flex-shrink-0 mx-auto">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {segs.map(({ cat, start, end }, i) => {
            const dash = (end - start) * C
            const offset = start * C
            return (
              <circle
                key={cat.id ?? i}
                cx="90" cy="90" r={R} fill="none"
                stroke={cat.color || '#6b7280'} strokeWidth="26"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 90 90)"
              />
            )
          })}
          <circle cx="90" cy="90" r="44" style={{ fill: 'var(--surface)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold text-ink-3 tracking-wide">TOTAL</span>
          <span className="font-display tabular-nums text-lg text-ink">{idrShort(total)}</span>
        </div>
      </div>
      <div className="flex-1 min-w-[180px] space-y-2">
        {data.slice(0, 8).map((cat) => (
          <div key={cat.id} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: cat.color || '#6b7280' }} />
            <span className="text-base">{cat.icon}</span>
            <span className="flex-1 text-[13px] font-medium text-ink-2 truncate">{cat.name}</span>
            <span className="text-[13px] font-semibold text-ink tabular-nums">{formatCurrency(cat.amount)}</span>
            <span className="text-xs text-ink-3 tabular-nums w-9 text-right">{cat.pct.toFixed(0)}%</span>
          </div>
        ))}
        {data.length > 8 && <p className="text-xs text-ink-3 text-center pt-1">+{data.length - 8} kategori lainnya</p>}
      </div>
    </div>
  )
}

// ── Budget vs Actual ──────────────────────────────────────────────────────────

const BUDGET_STATUS_COLOR = { over: 'var(--bad)', warning: 'var(--warn)', good: 'var(--accent)', none: 'var(--ink-3)' }

function BudgetVsActual({ year, month }) {
  const ym = `${year}-${String(month).padStart(2, '0')}`
  const { data: budgets, isLoading } = useBudgets(ym)
  if (isLoading) return <Spinner />
  if (!budgets?.length) return <p className="text-sm text-ink-3 text-center py-8">Belum ada anggaran bulan ini</p>

  return (
    <div className="space-y-3">
      {budgets.map((b) => {
        const over = b.spent > b.amount
        const status = getBudgetStatus(b.spent, b.amount)
        return (
          <div key={b.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{b.categories?.icon}</span>
                <span className="text-sm text-ink-2 truncate">{b.categories?.name}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2 tabular-nums">
                <span className="text-sm font-semibold" style={{ color: over ? 'var(--bad)' : 'var(--ink)' }}>
                  {formatCurrency(b.spent)}
                </span>
                <span className="text-xs text-ink-3 ml-1">/ {formatCurrency(b.amount)}</span>
              </div>
            </div>
            <Progress value={b.spent} max={b.amount || 1} color={BUDGET_STATUS_COLOR[status]} height={6} />
            {over && <p className="text-xs mt-0.5" style={{ color: 'var(--bad)' }}>Lebih {formatCurrency(b.spent - b.amount)}</p>}
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
  if (isError) return <p className="text-sm text-center py-6" style={{ color: 'var(--bad)' }}>{error?.message}</p>
  if (!data?.length) return <p className="text-sm text-ink-3 text-center py-8">Belum ada pengeluaran bulan ini</p>

  return (
    <div className="space-y-2">
      {data.map((tx, i) => (
        <div key={tx.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < data.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <span className="w-6 h-6 rounded-full bg-surface-2 text-ink-2 text-xs flex items-center justify-center font-bold flex-shrink-0 tabular-nums">{i + 1}</span>
          <span className="text-lg flex-shrink-0">{tx.categories?.icon || '📦'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{tx.description || tx.categories?.name || 'Transaksi'}</p>
            <p className="text-xs text-ink-3">{tx.categories?.name} · {formatDate(tx.date)}</p>
          </div>
          <p className="text-sm font-semibold text-ink flex-shrink-0 tabular-nums">−{formatCurrency(tx.amount)}</p>
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
          <Users className="w-4 h-4 text-ink-3" />
          <CardTitle>Kontribusi Per Anggota</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((member) => {
            const m = { id: member.id, full_name: member.name, avatar_color: member.avatar_color, emoji: member.emoji }
            const color = memberColor(m)
            return (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar member={m} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-[13px] font-semibold text-ink truncate">
                      {member.name}
                      <span className="text-ink-3 font-normal"> · {member.role === 'owner' ? 'Pemilik' : 'Anggota'}</span>
                    </span>
                    <span className="text-[13px] font-bold text-ink flex-shrink-0 tabular-nums">{idrShort(member.expense)}</span>
                  </div>
                  <Progress value={member.expense} max={maxExpense} color={color} height={7} />
                  <div className="flex items-center gap-4 mt-1.5 text-xs">
                    <span className="flex items-center gap-1" style={{ color: 'var(--accent-ink)' }}>
                      <ArrowUpRight className="w-3.5 h-3.5" />{idrShort(member.income)}
                    </span>
                    <span className="flex items-center gap-1 text-ink-3">
                      <ArrowDownRight className="w-3.5 h-3.5" />{idrShort(member.expense)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
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
        <CardHeader><CardTitle>Arus Kas 6 Bulan</CardTitle></CardHeader>
        <CardContent>
          {trendLoading ? <Spinner /> : <CashFlowChart data={trendData} />}
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
            <Flame className="w-4 h-4" style={{ color: 'var(--accent)' }} />
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

// ── Period view (mingguan / tahunan) ─────────────────────────────────────────

function PeriodView({ period, dateFrom, dateTo, year }) {
  const { data: stats, isLoading } = usePeriodStats(dateFrom, dateTo)
  const { data: catData, isLoading: catLoading, isError: catError } = usePeriodCategoryDetail(dateFrom, dateTo)
  const { data: yearlyData, isLoading: yearlyLoading } = useYearlyStats(year)

  if (period === 'year') {
    const totalIncome = (yearlyData || []).reduce((s, m) => s + (m.income || 0), 0)
    const totalExpense = (yearlyData || []).reduce((s, m) => s + (m.expense || 0), 0)
    const yearStats = { income: totalIncome, expense: totalExpense, savings: totalIncome - totalExpense }

    return (
      <div className="space-y-5">
        <SummaryCards stats={yearStats} isLoading={yearlyLoading} />
        <Card>
          <CardHeader><CardTitle>Arus Kas {year}</CardTitle></CardHeader>
          <CardContent>
            {yearlyLoading ? <Spinner /> : <CashFlowChart data={yearlyData} barSize={14} />}
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

const PERIOD_OPTIONS = [
  { id: 'week', label: 'Minggu' },
  { id: 'month', label: 'Bulan' },
  { id: 'year', label: 'Tahun' },
]

export default function Reports() {
  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const exportMutation = useDataExport()
  const toast = useToast()

  const handleExport = () => {
    exportMutation.mutate(undefined, {
      onSuccess: (r) => toast.success(`Berhasil mengekspor ${r?.total ?? 0} transaksi`),
      onError: (e) => toast.error(e?.message || 'Gagal mengekspor data'),
    })
  }

  const navigateMonth = (dir) => {
    const d = new Date(year, month - 1 + dir, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  const navigateWeek = (dir) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const navigateYear = (dir) => setYear((y) => y + dir)

  const isCurrentPeriod = useMemo(() => {
    const now = new Date()
    if (period === 'month') return year === now.getFullYear() && month === now.getMonth() + 1
    if (period === 'week') {
      const w1 = getWeekRange(currentDate)
      const w2 = getWeekRange(now)
      return w1.from === w2.from
    }
    if (period === 'year') return year === now.getFullYear()
    return false
  }, [period, year, month, currentDate])

  // Compute date range for current period
  const { dateFrom, dateTo, displayLabel } = useMemo(() => {
    if (period === 'week') {
      const range = getWeekRange(currentDate)
      return { dateFrom: range.from, dateTo: range.to, displayLabel: range.label }
    }
    if (period === 'month') {
      return { dateFrom: null, dateTo: null, displayLabel: monthLabel(year, month) }
    }
    if (period === 'year') {
      return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, displayLabel: String(year) }
    }
    return { dateFrom: null, dateTo: null, displayLabel: '' }
  }, [period, year, month, currentDate])

  const handleNav = (dir) => {
    if (period === 'week') navigateWeek(dir)
    else if (period === 'month') navigateMonth(dir)
    else if (period === 'year') navigateYear(dir)
  }

  const goToNow = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
    setCurrentDate(now)
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Period selector + export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl size="sm" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        <Button variant="ghost" size="sm" onClick={handleExport} loading={exportMutation.isPending}>
          <Icon name="download" size={14} /> Ekspor
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleNav(-1)} aria-label="Sebelumnya">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-semibold text-ink min-w-44 text-center">{displayLabel}</h2>
          <Button variant="ghost" size="icon" onClick={() => handleNav(1)} disabled={isCurrentPeriod} aria-label="Berikutnya">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        {!isCurrentPeriod && (
          <Button variant="ghost" size="sm" onClick={goToNow} style={{ color: 'var(--accent)' }}>
            Kembali ke sekarang
          </Button>
        )}
      </div>

      {/* Content */}
      {period === 'month' ? (
        <MonthlyView year={year} month={month} />
      ) : (
        <PeriodView period={period} dateFrom={dateFrom} dateTo={dateTo} year={year} />
      )}
    </div>
  )
}
