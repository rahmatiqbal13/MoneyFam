import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { useFamilyMembers } from '@/hooks/useFamily'
import { NAV, NAV_GROUPS } from './navItems'
import { Sheet } from '@/components/ui/Sheet'
import { FamilyCard, UnreadBadge } from './Sidebar'

// Full menu as a bottom sheet: family card + grouped two-column tiles.
export function MobileDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { family } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()
  const members = useFamilyMembers().data || []

  const go = (to) => {
    onClose()
    navigate(to)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8 }}>
        <FamilyCard family={family} members={members} />
        {NAV_GROUPS.map((g) => (
          <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="eyebrow" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{g.label}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {NAV.filter((n) => n.group === g.id).map((item) => {
                const active = location.pathname === item.to
                return (
                  <button
                    key={item.to}
                    onClick={() => go(item.to)}
                    aria-current={active ? 'page' : undefined}
                    className="press"
                    style={{
                      minHeight: 52, padding: '0 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      boxShadow: '0 0 0 1px var(--line)', textAlign: 'left', fontWeight: 600, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                      background: active ? 'var(--accent)' : 'var(--surface)',
                      color: active ? 'var(--on-accent)' : 'var(--ink)',
                    }}
                  >
                    {item.label}
                    {item.id === 'notifications' && <UnreadBadge count={unreadCount} size={20} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
