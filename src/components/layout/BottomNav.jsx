import { useLocation, useNavigate } from 'react-router-dom';
import { NAV } from './navItems';
import { Icon } from '@/components/ui/Icon';

function NavBtn({ item, active }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(item.to)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        border: 'none',
        background: 'transparent',
        padding: '6px 4px',
        borderRadius: 12,
        color: active ? 'var(--accent-ink)' : 'var(--ink-3)',
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
      }}
    >
      <Icon name={item.icon} size={22} stroke={active ? 2.2 : 1.7} />
      <span style={{ fontSize: 10.5 }}>{item.short}</span>
    </button>
  );
}

export function BottomNav({ onAddTransaction }) {
  const location = useLocation();
  const primary = NAV.filter(n => n.primary);

  // Determine active item based on pathname
  const isActive = (item) => {
    if (item.to === '/') {
      return location.pathname === '/';
    }
    return location.pathname === item.to;
  };

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        padding: '8px 8px max(8px, env(safe-area-inset-bottom)) 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4,
        boxShadow: '0 -8px 24px -8px rgba(0,0,0,.06)',
      }}
    >
      {primary.slice(0, 2).map(item => (
        <NavBtn key={item.id} item={item} active={isActive(item)} />
      ))}

      {/* Center FAB */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={onAddTransaction}
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            background: 'var(--accent)',
            color: '#fff',
            border: '4px solid var(--bg)',
            position: 'absolute',
            top: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px -6px rgba(0,0,0,.25), 0 0 0 1px var(--accent-ink) inset',
          }}
        >
          <Icon name="plus" size={26} stroke={2.4} />
        </button>
      </div>

      {primary.slice(2, 4).map(item => (
        <NavBtn key={item.id} item={item} active={isActive(item)} />
      ))}
    </nav>
  );
}
