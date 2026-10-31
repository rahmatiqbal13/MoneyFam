export const NAV = [
  { to: '/',             id: 'dashboard',     label: 'Beranda',           short: 'Beranda',   icon: 'home',     group: 'daily',  primary: true },
  { to: '/transactions', id: 'transactions',  label: 'Transaksi',         short: 'Transaksi', icon: 'swap',     group: 'daily',  primary: true },
  { to: '/wallets',      id: 'wallets',       label: 'Kantong',           short: 'Kantong',   icon: 'wallet',   group: 'daily',  primary: true },
  { to: '/budget',       id: 'budget',        label: 'Amplop',            short: 'Amplop',    icon: 'pie',      group: 'daily',  primary: true },
  { to: '/savings',      id: 'savings',       label: 'Tabungan & Hutang', short: 'Tabungan',  icon: 'pig',      group: 'future' },
  { to: '/investments',  id: 'investments',   label: 'Investasi',         short: 'Investasi', icon: 'trending', group: 'future' },
  { to: '/pension',      id: 'pension',       label: 'Dana Pensiun',      short: 'Pensiun',   icon: 'calc',     group: 'future' },
  { to: '/reports',      id: 'reports',       label: 'Laporan',           short: 'Laporan',   icon: 'chart',    group: 'more' },
  { to: '/categories',   id: 'categories',    label: 'Kategori',          short: 'Kategori',  icon: 'tag',      group: 'more' },
  { to: '/notifications',id: 'notifications', label: 'Notifikasi',        short: 'Notifikasi',icon: 'bell',     group: 'more' },
  { to: '/settings',     id: 'settings',      label: 'Pengaturan',        short: 'Setelan',   icon: 'settings', group: 'more' },
];

export const NAV_GROUPS = [
  { id: 'daily',  label: 'Sehari-hari' },
  { id: 'future', label: 'Masa depan' },
  { id: 'more',   label: 'Lainnya' },
];

export function navItemFor(pathname) {
  return NAV.find((n) => n.to === pathname) || null
}
