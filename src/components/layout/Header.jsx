import { useLocation, useNavigate } from 'react-router-dom'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { navItemFor } from './navItems'

// Phone top bar: menu button, page title, notification bell.
// On desktop each page renders its own PageHeader instead.
export function Header({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: unreadCount } = useUnreadNotificationsCount()

  const title = navItemFor(location.pathname)?.label || 'MoneyFam'

  return (
    <header
      className="flex items-center gap-2 flex-shrink-0"
      style={{ padding: 'max(6px, env(safe-area-inset-top)) 14px 8px', background: 'var(--bg)' }}
    >
      <button onClick={onMenuClick} aria-label="Buka menu" className="topbar-btn">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      <h1
        className="font-display flex-1 min-w-0 truncate"
        style={{ margin: 0, fontWeight: 800, fontSize: 22, letterSpacing: '-.03em', color: 'var(--ink)' }}
      >
        {title}
      </h1>
      <button
        onClick={() => navigate('/notifications')}
        aria-label={unreadCount ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        className="topbar-btn relative"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9,
              background: '#B3261E', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
