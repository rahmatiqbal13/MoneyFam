import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { useFamilyMembers } from '@/hooks/useFamily'
import { NAV, NAV_GROUPS } from './navItems'
import { Logo, Wordmark } from './Logo'
import { Icon } from '@/components/ui/Icon'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'

export function FamilyCard({ family, members }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, background: 'var(--bg-sub)' }}>
      {members.length > 0 && <AvatarStack members={members} size={28} ring="var(--bg-sub)" />}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {family?.name || 'Mode Personal'}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          {family ? `${members.length} anggota` : 'Belum bergabung keluarga'}
        </span>
      </div>
    </div>
  )
}

export function UnreadBadge({ count, size = 22 }) {
  if (!count) return null
  return (
    <span
      style={{
        minWidth: size, height: size, padding: '0 6px', borderRadius: size / 2,
        background: '#B3261E', color: '#fff', fontSize: 12, fontWeight: 700,
        display: 'grid', placeItems: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

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
      className="hidden lg:flex flex-col flex-shrink-0 h-full overflow-y-auto scrollbar-hide"
      style={{ width: 232, padding: '28px 18px 22px', gap: 26, borderRight: '1px solid var(--line)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
        <Logo size={34} />
        <Wordmark />
      </div>

      <FamilyCard family={family} members={members} />

      <nav aria-label="Menu utama" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {NAV_GROUPS.map((g) => (
          <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="eyebrow" style={{ padding: '0 10px 6px' }}>{g.label}</span>
            {NAV.filter((n) => n.group === g.id).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className="sidebar-link"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  minHeight: 40, padding: '0 10px', borderRadius: 10, textDecoration: 'none', fontSize: 15,
                  background: isActive ? 'var(--accent)' : undefined,
                  color: isActive ? 'var(--on-accent)' : 'var(--ink-2)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background-color .15s ease',
                })}
              >
                {item.label}
                {item.id === 'notifications' && <UnreadBadge count={unreadCount} />}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
        <Avatar member={profile} size={34} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.full_name || 'Pengguna'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.email || user?.email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          title="Keluar"
          aria-label="Keluar"
          className="sidebar-link press"
          style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </aside>
  )
}
