// app.jsx — root component, routing, theme + tweaks wiring

const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "hangat",
  "dark": false,
  "accent": "#0EA5A4",
  "hideBalances": false
}/*EDITMODE-END*/;

const PAGE_META = {
  dashboard:     { title: 'Beranda',            subtitle: 'Halo, Keluarga Pratama 👋' },
  transactions:  { title: 'Transaksi',          subtitle: 'Mei 2026' },
  wallets:       { title: 'Kantong',            subtitle: 'Semua sumber dana' },
  budget:        { title: 'Anggaran',           subtitle: 'Mei 2026' },
  savings:       { title: 'Tabungan & Hutang',  subtitle: 'Tujuan & kewajiban' },
  investments:   { title: 'Investasi',          subtitle: 'Portofolio keluarga' },
  reports:       { title: 'Laporan',            subtitle: 'Analisis keuangan' },
  pension:       { title: 'Dana Pensiun',       subtitle: 'Rencana jangka panjang' },
  categories:    { title: 'Kategori',           subtitle: 'Atur klasifikasi' },
  notifications: { title: 'Notifikasi',         subtitle: 'Aktivitas terbaru' },
  settings:      { title: 'Pengaturan',         subtitle: 'Akun & preferensi' },
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useStateApp(() => {
    const h = (window.location.hash || '').replace('#', '');
    return PAGE_META[h] ? h : 'dashboard';
  });
  const [drawerOpen, setDrawerOpen] = useStateApp(false);
  const [pendingAdd, setPendingAdd] = useStateApp(false);

  const { isMobile, isTablet, isDesktop, narrow } = useViewport();
  const unreadCount = window.MF.NOTIFICATIONS.filter(n => n.unread).length;

  // Apply theme whenever tweaks change
  useEffectApp(() => {
    applyTheme({ variant: tweaks.variant, dark: tweaks.dark, accent: tweaks.accent });
  }, [tweaks.variant, tweaks.dark, tweaks.accent]);

  // Scroll to top + sync hash on page change
  useEffectApp(() => {
    window.location.hash = page;
    const main = document.getElementById('mf-main');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [page]);

  const nav = (id, opts = {}) => {
    setPage(id);
    if (opts.add) setPendingAdd(true);
    setDrawerOpen(false);
  };

  const hideBalances = tweaks.hideBalances;
  const toggleHide = () => setTweak('hideBalances', !hideBalances);

  const meta = PAGE_META[page];

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard onNav={nav} hideBalances={hideBalances} toggleHide={toggleHide} />;
      case 'transactions':  return <Transactions hideBalances={hideBalances} openAdd={pendingAdd} onClearAdd={() => setPendingAdd(false)} />;
      case 'wallets':       return <Wallets hideBalances={hideBalances} />;
      case 'budget':        return <Budget hideBalances={hideBalances} />;
      case 'savings':       return <SavingsDebts hideBalances={hideBalances} />;
      case 'investments':   return <Investments hideBalances={hideBalances} />;
      case 'reports':       return <Reports hideBalances={hideBalances} />;
      case 'pension':       return <PensionCalculator />;
      case 'categories':    return <Categories />;
      case 'notifications': return <Notifications />;
      case 'settings':      return <Settings tweaks={tweaks} setTweak={setTweak} />;
      default:              return <Dashboard onNav={nav} hideBalances={hideBalances} toggleHide={toggleHide} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {isDesktop && <Sidebar current={page} onNav={nav} unreadCount={unreadCount} />}

      <div id="mf-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          current={page}
          onNav={nav}
          onMenu={() => setDrawerOpen(true)}
          unreadCount={unreadCount}
          right={!narrow && page !== 'settings' && (
            <button onClick={toggleHide} style={btnIconStyle(hideBalances)} title={hideBalances ? 'Tampilkan saldo' : 'Sembunyikan saldo'}>
              <Icon name={hideBalances ? 'eyeOff' : 'eye'} size={20} />
            </button>
          )}
        />
        <main style={{
          flex: 1,
          padding: narrow ? `4px ${isMobile ? 16 : 28}px 110px` : '8px 32px 48px',
          maxWidth: 1180, width: '100%', margin: '0 auto',
        }}>
          {renderPage()}
        </main>
      </div>

      {narrow && <BottomNav current={page} onNav={nav} />}
      {narrow && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} current={page} onNav={nav} unreadCount={unreadCount} />}

      {/* Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakRadio label="Gaya" value={tweaks.variant}
          options={['hangat', 'ceria', 'studio']}
          onChange={(v) => setTweak('variant', v)} />
        <TweakColor label="Warna aksen" value={tweaks.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak('accent', v)} />
        <TweakToggle label="Mode gelap" value={tweaks.dark}
          onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Privasi" />
        <TweakToggle label="Sembunyikan saldo" value={tweaks.hideBalances}
          onChange={(v) => setTweak('hideBalances', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
