import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  BarChart3,
  Settings,
  LogOut,
  X,
  Tag,
  PiggyBank,
  TrendingUp,
  Calculator,
  Bell,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/wallets', icon: Wallet, label: 'Kantong' },
  { to: '/budget', icon: PieChart, label: 'Anggaran' },
  { to: '/reports', icon: BarChart3, label: 'Laporan' },
  { to: '/savings', icon: PiggyBank, label: 'Tabungan & Hutang' },
  { to: '/investments', icon: TrendingUp, label: 'Investasi' },
  { to: '/pension', icon: Calculator, label: 'Dana Pensiun' },
  { to: '/categories', icon: Tag, label: 'Kategori' },
  { to: '/notifications', icon: Bell, label: 'Notifikasi', showBadge: true },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
]

function Logo({ size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'var(--accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15), inset 0 2px 0 rgba(255,255,255,.2)',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 18 L4 7 L9 13 L14 7 L14 18 M14 13 a4 4 0 1 0 6 0 a4 4 0 1 0 -6 0"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, profile, family, logout } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(42,36,24,.45)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          width: 264,
          background: 'var(--surface)',
          borderRight: '1px solid var(--line)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Logo size={40} />
            <div>
              <div className="font-display font-semibold text-xl leading-tight" style={{ color: 'var(--ink)' }}>
                MoneyFam
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Keuangan Keluarga
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Family card */}
        {family && (
          <div
            className="mx-4 mb-4 rounded-r-md px-3.5 py-3"
            style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
                Keluarga
              </p>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
            </div>
            <p className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
              {family.name}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                      isActive ? 'font-semibold' : 'font-medium'
                    )
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent-ink)' : 'var(--ink-2)',
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('font-semibold')) {
                      e.currentTarget.style.background = 'var(--surface-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('font-semibold')) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.showBadge && unreadCount > 0 && (
                    <span
                      className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center"
                      style={{ background: '#EF4444', fontSize: 10 }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & logout */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'var(--ink-3)' }}
              title="Keluar"
              aria-label="Keluar"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)'
                e.currentTarget.style.color = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--ink-3)'
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
