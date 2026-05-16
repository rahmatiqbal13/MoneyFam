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
  DollarSign,
  Tag,
  PiggyBank,
  TrendingUp,
  Calculator,
  Bell,
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

export function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, profile, family, logout } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-sidebar z-50 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">MoneyFam</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Family info */}
        {family && (
          <div className="px-5 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-400">Keluarga</p>
            <p className="text-sm text-white font-medium truncate">{family.name}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.showBadge && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
