import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/': 'Dashboard',
  '/transactions': 'Transaksi',
  '/wallets': 'Kantong / Dompet',
  '/budget': 'Anggaran',
  '/reports': 'Laporan',
  '/savings': 'Tabungan & Hutang',
  '/categories': 'Kategori',
  '/settings': 'Pengaturan',
}

export function Header({ onMenuClick }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'MoneyFam'

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3.5 flex items-center gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
      <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
        <Bell className="w-5 h-5" />
      </button>
    </header>
  )
}
