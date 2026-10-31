import { useLocation, useNavigate } from 'react-router-dom';
import { NAV } from './navItems';

function NavBtn({ item, active }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(item.to)}
      aria-current={active ? 'page' : undefined}
      style={{
        minHeight: 52, border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        fontSize: 12, fontWeight: active ? 700 : 500,
        color: active ? 'var(--ink)' : 'var(--ink-3)',
      }}
    >
      <span style={{ width: 22, height: 4, borderRadius: 2, background: active ? 'var(--ink)' : 'transparent', transition: 'background-color .15s ease' }} />
      {item.short}
    </button>
  );
}

export function BottomNav({ onAddTransaction }) {
  const location = useLocation();
  const primary = NAV.filter(n => n.primary);
  const isActive = (item) => location.pathname === item.to;

  return (
    <nav
      aria-label="Menu utama"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)', borderTop: '1px solid var(--line)',
        padding: '6px 8px max(14px, env(safe-area-inset-bottom))',
        display: 'grid', gridTemplateColumns: '1fr 1fr 76px 1fr 1fr', alignItems: 'center',
      }}
    >
      {primary.slice(0, 2).map(item => (
        <NavBtn key={item.id} item={item} active={isActive(item)} />
      ))}

      <button
        onClick={onAddTransaction}
        aria-label="Catat pengeluaran"
        className="press"
        style={{
          justifySelf: 'center', width: 60, height: 60, marginTop: -26, borderRadius: '50%',
          border: '4px solid var(--bg)', background: 'var(--accent)', color: 'var(--on-accent)',
          cursor: 'pointer', display: 'grid', placeItems: 'center',
          boxShadow: '0 10px 20px -8px rgba(29,27,23,.6)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {primary.slice(2, 4).map(item => (
        <NavBtn key={item.id} item={item} active={isActive(item)} />
      ))}
    </nav>
  );
}
