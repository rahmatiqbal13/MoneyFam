import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { useFamilyMembers } from '@/hooks/useFamily'
import { NAV } from './navItems'
import { Logo } from './Logo'
import { Icon } from '@/components/ui/Icon'
import { AvatarStack } from '@/components/ui/Avatar'

export function MobileDrawer({ open, onClose }) {
  const { family } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()
  const members = useFamilyMembers().data || []

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,.4)',
        animation: 'mfDrawerFadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 'min(86vw, 320px)',
          background: 'var(--surface)',
          padding: 18,
          overflowY: 'auto',
          animation: 'mfDrawerSlideIn .25s cubic-bezier(.2,.9,.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div className="font-display font-semibold" style={{ fontSize: 19, color: 'var(--ink)' }}>
              MoneyFam
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Tutup menu"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div
          className="px-3.5 py-3"
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-sm)',
            marginBottom: 16,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
            Keluarga
          </p>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--ink)', margin: '4px 0 10px' }}>
            {family?.name || 'Mode Personal'}
          </p>
          <AvatarStack members={members} size={28} />
        </div>

        <nav className="flex-1">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-150',
                      isActive ? 'font-semibold' : 'font-medium'
                    )
                  }
                  style={({ isActive }) => ({
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent-ink)' : 'var(--ink-2)',
                  })}
                >
                  <Icon name={item.icon} size={20} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span
                      className="text-white font-bold px-1.5 py-0.5 rounded-full text-center"
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
      </div>
      <style>{`
        @keyframes mfDrawerFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mfDrawerSlideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  )
}
