import { Link, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { HeroCard } from '@/components/ui/HeroCard'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Ring } from '@/components/ui/Ring'
import { Sparkbar } from '@/components/ui/Sparkbar'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import {
  useMonthlyStats,
  useActivityReminders,
  useMemberSpending,
  useDailySpending,
} from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useBudgets } from '@/hooks/useBudget'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
import { useDebtDueReminders } from '@/hooks/useDebts'
import { useAuthStore } from '@/stores/authStore'
import { useViewport } from '@/hooks/useViewport'
import { memberColor } from '@/lib/memberColor'
import { formatCurrency, idrShort, formatMonthYear } from '@/lib/utils'

const ROLE_LABEL = { owner: 'Kepala Keluarga', member: 'Anggota' }

const QUICK_ACTIONS = [
  { id: 'add', label: 'Catat', icon: 'plus', color: 'var(--accent)' },
  { id: 'transfer', label: 'Transfer', icon: 'swap', color: '#F472B6' },
  { id: 'goal', label: 'Tabungan', icon: 'target', color: '#F59E0B' },
  { id: 'debt', label: 'Hutang', icon: 'coin', color: '#8B5CF6' },
  { id: 'budget', label: 'Anggaran', icon: 'pie', color: '#0EA5A4' },
]

const QUICK_ACTION_ROUTES = {
  add: '/transactions',
  transfer: '/wallets',
  goal: '/savings',
  debt: '/savings',
  budget: '/budget',
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display font-semibold text-base" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      {actionLabel && (
        <Button variant="ghost" size="sm" onClick={onAction}>
          {actionLabel}
          <Icon name="chevronR" size={14} />
        </Button>
      )}
    </div>
  )
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WALLET_TYPE_LABEL = {
  cash: 'Tunai',
  bank: 'Bank',
  ewallet: 'E-wallet',
  savings: 'Tabungan',
  investment: 'Investasi',
  credit: 'Kartu Kredit',
  other: 'Lainnya',
}

function WalletCardMini({ wallet }) {
  const color = wallet.color || 'var(--accent)'
  return (
    <Card
      padding={16}
      style={{
        minWidth: 200,
        flexShrink: 0,
        background: `color-mix(in srgb, ${color} 12%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      <div
        className="flex items-center justify-center mb-3"
        style={{ width: 40, height: 40, borderRadius: 14, background: color, color: '#fff', fontSize: 20 }}
      >
        {wallet.icon || '👛'}
      </div>
      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{WALLET_TYPE_LABEL[wallet.type] || wallet.type}</div>
      <div className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>{wallet.name}</div>
      <div className="font-display tabular-nums" style={{ fontSize: 20, color: 'var(--ink)' }}>
        {idrShort(Number(wallet.balance || 0))}
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const profile = useAuthStore((s) => s.profile)
  const family = useAuthStore((s) => s.family)
  const { isMobile } = useViewport()

  useDebtDueReminders()
  useActivityReminders()

  const { data: wallets = [] } = useWallets()
  const { data: stats } = useMonthlyStats(y, m)
  const { data: budgets = [] } = useBudgets(`${y}-${String(m).padStart(2, '0')}`)
  const { data: memberSpending = [] } = useMemberSpending(y, m)
  const { data: dailySpending = {} } = useDailySpending(y, m)
  const { data: goals = [] } = useSavingsGoals()

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0)
  const monthIncome = stats?.income || 0
  const monthExpense = stats?.expense || 0

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0)
  const leftToSpend = totalBudget - totalSpent
  const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  // useDailySpending only covers the current month, so early in the month only
  // the elapsed days are meaningful — average over those, not a fixed 14.
  const elapsedDays = Math.min(14, now.getDate())
  const spendBars = Array.from({ length: elapsedDays }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (elapsedDays - 1 - i))
    return dailySpending[toISODate(d)] || 0
  })
  const avgPerDay = spendBars.reduce((a, b) => a + b, 0) / elapsedDays

  const maxExpense = Math.max(...memberSpending.map((r) => r.expense), 1)
  const currentMonth = formatMonthYear(now.toISOString())

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--ink)' }}>
          Halo, {profile?.full_name?.split(' ')[0] || 'Pengguna'} 👋
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {family?.name ? `${family.name} · ${currentMonth}` : currentMonth}
        </p>
      </div>

      {/* Notice: no profile */}
      {!profile && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'color-mix(in srgb, var(--warn) 14%, var(--surface))', border: '1px solid color-mix(in srgb, var(--warn) 32%, var(--surface))' }}>
          <span className="text-base mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--warn)' }}>Profil belum dibuat</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--warn)' }}>
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
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-soft)' }}>
          <span className="text-base mt-0.5">👤</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-ink)' }}>Mode Personal</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent-ink)' }}>
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

      {/* 1. Hero balance card */}
      <HeroCard
        label="Total Saldo Keluarga"
        value={formatCurrency(totalBalance)}
        sub={`${wallets.length} kantong aktif`}
        style={isMobile ? { padding: 20 } : undefined}
      >
        <div style={{ display: 'flex', gap: 12, marginTop: 22, position: 'relative' }}>
          <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,.12)', borderRadius: 'var(--r-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
              <Icon name="arrowDown" size={12} stroke={2.5} /> PEMASUKAN
            </div>
            <div className="tabular-nums" style={{ fontSize: 17, fontWeight: 700 }}>{idrShort(monthIncome)}</div>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,.12)', borderRadius: 'var(--r-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
              <Icon name="arrowUp" size={12} stroke={2.5} /> PENGELUARAN
            </div>
            <div className="tabular-nums" style={{ fontSize: 17, fontWeight: 700 }}>{idrShort(monthExpense)}</div>
          </div>
        </div>
      </HeroCard>

      {/* 2. Quick actions (mobile only) */}
      {isMobile && (
        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {QUICK_ACTIONS.map((a) => {
            const route = QUICK_ACTION_ROUTES[a.id]
            const handler = route ? () => navigate(route) : undefined
            return (
              <button
                key={a.id}
                onClick={handler}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none', minWidth: 64,
                  cursor: handler ? 'pointer' : 'default',
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 52, height: 52, borderRadius: 18, background: a.color, color: '#fff', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)' }}
                >
                  <Icon name={a.icon} size={22} stroke={2.2} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>{a.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 3. Left to spend + 14-day spark */}
      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr' }}>
        <Card padding={20}>
          <div className="flex items-start justify-between mb-3.5">
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Sisa Bulan Ini
              </div>
              <div
                className="font-display tabular-nums"
                style={{ fontSize: 30, marginTop: 4, color: leftToSpend >= 0 ? 'var(--ink)' : 'var(--bad)' }}
              >
                {totalBudget > 0 ? formatCurrency(leftToSpend) : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                {totalBudget > 0 ? `dari anggaran ${idrShort(totalBudget)}` : 'Belum ada anggaran bulan ini'}
              </div>
            </div>
            {totalBudget > 0 && (
              <Pill
                tone={leftToSpend >= 0 ? 'good' : 'bad'}
                icon={<Icon name={leftToSpend >= 0 ? 'arrowDown' : 'arrowUp'} size={11} stroke={2.5} />}
              >
                {spentPct}%
              </Pill>
            )}
          </div>
          <Progress value={totalSpent} max={totalBudget || 1} color="var(--accent)" height={10} />
          <div className="flex justify-between mt-2" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            <span>Terpakai {idrShort(totalSpent)}</span>
            <span>Target {idrShort(totalBudget)}</span>
          </div>
        </Card>

        <Card padding={20}>
          <div className="mb-3.5">
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Pengeluaran {elapsedDays} Hari
            </div>
            <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600, color: 'var(--ink)' }}>
              Rata-rata {idrShort(avgPerDay)}/hari
            </div>
          </div>
          <Sparkbar data={spendBars} height={64} color="var(--accent)" />
          <div className="flex justify-between mt-2" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            <span>{elapsedDays} hari lalu</span>
            <span>Hari ini</span>
          </div>
        </Card>
      </div>

      {/* 4. Spend per member */}
      <Card padding={isMobile ? 18 : 24}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="family" size={18} style={{ color: 'var(--accent)' }} />
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Pengeluaran per Anggota
              </h3>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{currentMonth}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
            Detail
            <Icon name="chevronR" size={14} />
          </Button>
        </div>
        {memberSpending.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
            Belum ada pengeluaran bulan ini
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
            {memberSpending.map((row) => {
              const member = { id: row.id, full_name: row.name, avatar_color: row.avatar_color, emoji: row.emoji }
              return (
              <div key={row.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 14 }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Avatar member={member} size={36} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{row.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{ROLE_LABEL[row.role] || row.role}</div>
                  </div>
                </div>
                <div className="tabular-nums font-semibold mb-2" style={{ fontSize: 16, color: 'var(--ink)' }}>
                  {idrShort(row.expense)}
                </div>
                <Progress value={row.expense} max={maxExpense} color={memberColor(member)} height={5} />
              </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 5. Recent transactions + goals */}
      <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr' }}>
        <Card padding={isMobile ? 18 : 22}>
          <SectionHeader title="Transaksi Terbaru" actionLabel="Semua" onAction={() => navigate('/transactions')} />
          <RecentTransactions />
        </Card>

        <Card padding={isMobile ? 18 : 22}>
          <SectionHeader title="Tujuan Keluarga" actionLabel="Semua" onAction={() => navigate('/savings')} />
          {goals.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
              Belum ada tujuan keluarga
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {goals.slice(0, 3).map((g) => {
                const target = Number(g.target_amount || 0)
                const current = Number(g.current_amount || 0)
                const pct = target > 0 ? Math.round((current / target) * 100) : 0
                const color = g.color || 'var(--accent)'
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <Ring value={pct} size={48} stroke={5} color={color} track="var(--surface-2)">
                      <span style={{ fontSize: 18 }}>{g.icon || '🎯'}</span>
                    </Ring>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{g.name}</div>
                        <div className="tabular-nums font-bold" style={{ fontSize: 12, color }}>{pct}%</div>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        {idrShort(current)} / {idrShort(target)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 6. Wallet rail */}
      <div>
        <SectionHeader title="Kantong Keluarga" actionLabel="Kelola" onAction={() => navigate('/wallets')} />
        {wallets.length === 0 ? (
          <Card padding={20}>
            <div className="text-center text-sm" style={{ color: 'var(--ink-3)' }}>Belum ada kantong</div>
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {wallets.map((w) => (
              <WalletCardMini key={w.id} wallet={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
