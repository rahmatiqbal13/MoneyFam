// shell.jsx — Responsive shell: sidebar (desktop) + bottom nav (mobile) + topbar

const { useState: useStateShell, useEffect: useEffectShell } = React;

const NAV = [
  { id: 'dashboard',     label: 'Beranda',           short: 'Beranda',  icon: 'home',     primary: true },
  { id: 'transactions',  label: 'Transaksi',         short: 'Catat',    icon: 'swap',     primary: true },
  { id: 'wallets',       label: 'Kantong',           short: 'Kantong',  icon: 'wallet',   primary: true },
  { id: 'budget',        label: 'Anggaran',          short: 'Anggaran', icon: 'pie',      primary: true },
  { id: 'savings',       label: 'Tabungan & Hutang', short: 'Tabungan', icon: 'pig' },
  { id: 'investments',   label: 'Investasi',         short: 'Investasi',icon: 'trending' },
  { id: 'reports',       label: 'Laporan',           short: 'Laporan',  icon: 'chart' },
  { id: 'pension',       label: 'Dana Pensiun',      short: 'Pensiun',  icon: 'calc' },
  { id: 'categories',    label: 'Kategori',          short: 'Kategori', icon: 'tag' },
  { id: 'notifications', label: 'Notifikasi',        short: 'Lonceng',  icon: 'bell' },
  { id: 'settings',      label: 'Pengaturan',        short: 'Setelan',  icon: 'settings' },
];

function useViewport() {
  const [w, setW] = useStateShell(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffectShell(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return {
    w,
    isMobile: w < 700,            // phone: bottom nav + single column
    isTablet: w >= 700 && w < 1024, // tablet: bottom nav + multi-column
    isDesktop: w >= 1024,         // desktop: full sidebar
    narrow: w < 1024,             // anything that uses the bottom nav
  };
}

function Logo({ size = 36 }) {
  // Two overlapping circles + "M" mark
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: 'var(--accent)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15), inset 0 2px 0 rgba(255,255,255,.2)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M4 18 L4 7 L9 13 L14 7 L14 18 M14 13 a4 4 0 1 0 6 0 a4 4 0 1 0 -6 0"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Sidebar({ current, onNav, unreadCount }) {
  const fam = window.MF.FAMILY;
  return (
    <aside style={{
      width: 264, flexShrink: 0, padding: 20,
      borderRight: '1px solid var(--line)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Logo size={40} />
        <div>
          <div className="display" style={{ fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>MoneyFam</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Keuangan Keluarga</div>
        </div>
      </div>

      {/* Family card */}
      <Card padding={14} radius="md" tone="sub" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Keluarga</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fam.name}</div>
          </div>
          <Icon name="chevronD" size={16} style={{ color: 'var(--ink-3)' }} />
        </div>
        <AvatarStack members={fam.members} size={28} gap={-8} />
      </Card>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
        {NAV.map(item => {
          const active = current === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 12px',
              border: 'none', background: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
              borderRadius: 12, fontSize: 14, fontWeight: active ? 600 : 500,
              cursor: 'pointer', textAlign: 'left', marginBottom: 2,
              transition: 'background .15s ease, color .15s ease',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon name={item.icon} size={20} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span style={{
                  background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center',
                }}>{unreadCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar member={fam.members[0]} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fam.members[0].name} Pratama</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>budi@keluarga.id</div>
          </div>
          <button style={btnIconStyle()} title="Keluar">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ current, onNav, onMore }) {
  const primary = NAV.filter(n => n.primary);
  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        padding: '8px 8px max(8px, env(safe-area-inset-bottom)) 8px',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
        boxShadow: '0 -8px 24px -8px rgba(0,0,0,.06)',
      }}>
        {primary.slice(0, 2).map(item => (
          <NavBtn key={item.id} item={item} active={current === item.id} onClick={() => onNav(item.id)} />
        ))}
        {/* Center FAB */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <button onClick={() => onNav('transactions', { add: true })} style={{
            width: 56, height: 56, borderRadius: 20,
            background: 'var(--accent)', color: '#fff',
            border: '4px solid var(--bg)',
            position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px -6px rgba(0,0,0,.25), 0 0 0 1px var(--accent-ink) inset',
          }}>
            <Icon name="plus" size={26} stroke={2.4} />
          </button>
        </div>
        {primary.slice(2, 4).map(item => (
          <NavBtn key={item.id} item={item} active={current === item.id} onClick={() => onNav(item.id)} />
        ))}
      </nav>
    </>
  );
}

function NavBtn({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      border: 'none', background: 'transparent',
      padding: '6px 4px', borderRadius: 12,
      color: active ? 'var(--accent-ink)' : 'var(--ink-3)',
      cursor: 'pointer',
      fontWeight: active ? 600 : 500,
    }}>
      <Icon name={item.icon} size={22} stroke={active ? 2.2 : 1.7} />
      <span style={{ fontSize: 10.5 }}>{item.short}</span>
    </button>
  );
}

function TopBar({ title, subtitle, current, onNav, onMenu, unreadCount, right }) {
  const { narrow, isMobile } = useViewport();
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: narrow ? '14px 18px 8px' : '24px 32px 16px',
      gap: 12, position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {narrow && (
          <button onClick={onMenu} style={btnIconStyle()}>
            <Icon name="menu" size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 2 }}>{subtitle}</div>}
          <h1 className="display" style={{ margin: 0, fontSize: isMobile ? 22 : 28, lineHeight: 1.1 }}>{title}</h1>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        <button onClick={() => onNav('notifications')} style={{ ...btnIconStyle(), position: 'relative' }}>
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: '#EF4444', border: '2px solid var(--surface-2)',
            }} />
          )}
        </button>
      </div>
    </header>
  );
}

// Mobile drawer (full nav)
function MobileDrawer({ open, onClose, current, onNav, unreadCount }) {
  if (!open) return null;
  const fam = window.MF.FAMILY;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.4)',
      animation: 'fadeIn .2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 'min(86vw, 320px)',
        background: 'var(--surface)', padding: 18, overflowY: 'auto',
        animation: 'slideRight .25s cubic-bezier(.2,.9,.3,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={36} />
            <div className="display" style={{ fontSize: 19 }}>MoneyFam</div>
          </div>
          <button onClick={onClose} style={btnIconStyle()}><Icon name="x" /></button>
        </div>
        <Card padding={14} radius="md" tone="sub" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>Keluarga</div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 10px' }}>{fam.name}</div>
          <AvatarStack members={fam.members} size={28} gap={-8} />
        </Card>
        <nav style={{ flex: 1 }}>
          {NAV.map(item => {
            const active = current === item.id;
            return (
              <button key={item.id} onClick={() => { onNav(item.id); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 12px',
                border: 'none', background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                borderRadius: 12, fontSize: 15, fontWeight: active ? 600 : 500,
                cursor: 'pointer', textAlign: 'left', marginBottom: 2,
              }}>
                <Icon name={item.icon} size={20} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <style>{`@keyframes slideRight { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>
    </div>
  );
}

Object.assign(window, { NAV, useViewport, Logo, Sidebar, BottomNav, TopBar, MobileDrawer });
