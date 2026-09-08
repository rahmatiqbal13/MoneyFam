import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { useFamilyMembers } from '@/hooks/useFamily'
import { NAV } from './navItems'
import { Logo } from './Logo'
import { Icon } from '@/components/ui/Icon'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'

export function Sidebar() {
  const navigate = useNavigate()
  const { user, profile, family, logout } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()
  const members = useFamilyMembers().data || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 static h-full"
      style={{
        width: 264,
        background: 'var(--surface)',
        borderRight: '1px solid var(--line)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center px-5 py-5">
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
      </div>

        {/* Family card */}
        <div
          className="mx-4 mb-4 px-3.5 py-3"
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
              Keluarga
            </p>
            <Icon name="chevronD" size={16} style={{ color: 'var(--ink-3)' }} />
          </div>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
            {family?.name || 'Mode Personal'}
          </p>
          <div className="mt-2">
            <AvatarStack members={members} size={28} />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
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
                  <Icon name={item.icon} size={20} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
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
            <Avatar member={profile} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
                {profile?.email || user?.email}
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
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
  )
}
