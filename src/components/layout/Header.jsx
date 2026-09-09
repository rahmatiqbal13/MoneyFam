import { useLocation, useNavigate } from 'react-router-dom'
import { useUnreadNotificationsCount } from '@/hooks/useNotifications'
import { useAuthStore } from '@/stores/authStore'
import { formatMonthYear } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

const pageMeta = {
  '/':             { title: 'Dashboard',          subtitle: 'Ringkasan keuangan keluarga' },
  '/transactions': { title: 'Transaksi',          subtitle: 'Riwayat & pencatatan' },
  '/wallets':      { title: 'Kantong',            subtitle: 'Semua sumber dana' },
  '/budget':       { title: 'Anggaran',           subtitle: 'Rencanakan pengeluaran' },
  '/reports':      { title: 'Laporan',            subtitle: 'Analisis keuangan' },
  '/savings':      { title: 'Tabungan & Hutang',  subtitle: 'Tujuan & kewajiban' },
  '/investments':  { title: 'Investasi',          subtitle: 'Portofolio keluarga' },
  '/pension':      { title: 'Dana Pensiun',       subtitle: 'Rencana jangka panjang' },
  '/categories':   { title: 'Kategori',           subtitle: 'Atur klasifikasi transaksi' },
  '/notifications':{ title: 'Notifikasi',         subtitle: 'Aktivitas terbaru' },
  '/settings':     { title: 'Pengaturan',         subtitle: 'Akun & preferensi' },
}

export function Header({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuthStore()
  const { data: unreadCount } = useUnreadNotificationsCount()

  const meta = pageMeta[location.pathname] || { title: 'MoneyFam', subtitle: '' }
  let subtitle = meta.subtitle
  if (location.pathname === '/') {
    subtitle = `Halo, ${family?.name || 'Keluarga'} 👋`
  } else if (location.pathname === '/transactions') {
    subtitle = formatMonthYear(new Date().toISOString())
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4"
      style={{
        padding: '18px 24px 12px',
        background: 'var(--bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ color: 'var(--ink-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Buka menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="min-w-0">
          {subtitle && (
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--ink-3)' }}>
              {subtitle}
            </p>
          )}
          <h1
            className="font-display font-semibold truncate"
            style={{ fontSize: 26, lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}
          >
            {meta.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: 'var(--ink-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          aria-label="Notifikasi"
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{
                background: '#EF4444',
                border: '1.5px solid var(--bg)',
              }}
            />
          )}
        </button>
      </div>
    </header>
  )
}
