import { TrendingUp, TrendingDown, PiggyBank, Wallet, TrendingUp as InvestmentIcon, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KPICard } from '@/components/dashboard/KPICard'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { WalletSummary } from '@/components/dashboard/WalletSummary'
import { useMonthlyStats } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useInvestments } from '@/hooks/useInvestments'
import { useAuthStore } from '@/stores/authStore'
import { formatMonthYear, formatCurrency } from '@/lib/utils'

export default function Dashboard() {
  const now = new Date()
  const profile = useAuthStore((s) => s.profile)
  const family = useAuthStore((s) => s.family)

  const { data: stats, isLoading: statsLoading } = useMonthlyStats(
    now.getFullYear(),
    now.getMonth() + 1
  )
  const { data: wallets } = useWallets()
  const { data: investments } = useInvestments()

  const totalBalance = wallets?.reduce((s, w) => s + Number(w.balance || 0), 0) || 0
  const totalInvestment = investments?.reduce((s, i) => {
    const price = Number(i.current_price || i.buy_price || 0)
    const qty = Number(i.quantity || 0)
    return s + (price * qty)
  }, 0) || 0
  const totalWealth = totalBalance + totalInvestment
  const currentMonth = formatMonthYear(now.toISOString())

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Halo, {profile?.full_name?.split(' ')[0] || 'Pengguna'} 👋
        </h2>
        <p className="text-sm text-gray-500">
          {family?.name ? `${family.name} · ${currentMonth}` : currentMonth}
        </p>
      </div>

      {/* Notice: no profile */}
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Profil belum dibuat</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Lengkapi profil Anda di halaman Pengaturan.
            </p>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="secondary" className="shrink-0">
              <Settings className="w-4 h-4 mr-1.5" />
              Pengaturan
            </Button>
          </Link>
        </div>
      )}

      {/* Info: using personal mode */}
      {!family && profile && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-500 text-base mt-0.5">👤</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Mode Personal</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Anda menggunakan MoneyFam dalam mode personal. 
              Buat atau bergabung ke keluarga di Pengaturan untuk fitur kolaboratif.
            </p>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="secondary" className="shrink-0">
              <Settings className="w-4 h-4 mr-1.5" />
              Pengaturan
            </Button>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Pemasukan"
          amount={statsLoading ? 0 : stats?.income}
          icon={TrendingUp}
          color="green"
          subtitle={currentMonth}
        />
        <KPICard
          title="Pengeluaran"
          amount={statsLoading ? 0 : stats?.expense}
          icon={TrendingDown}
          color="red"
          subtitle={currentMonth}
        />
        <KPICard
          title="Tabungan"
          amount={statsLoading ? 0 : Math.max(0, stats?.savings || 0)}
          icon={PiggyBank}
          color="blue"
          subtitle={currentMonth}
        />
        <KPICard
          title="Total Kekayaan"
          amount={totalWealth}
          icon={Wallet}
          color="amber"
          subtitle={`Kantong: ${formatCurrency(totalBalance)} · Investasi: ${formatCurrency(totalInvestment)}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pemasukan vs Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaksi Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Kantong</CardTitle>
          </CardHeader>
          <CardContent>
            <WalletSummary />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
