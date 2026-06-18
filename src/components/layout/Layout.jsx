import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TransactionModal } from '@/components/transactions/TransactionModal'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setTransactionModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 text-white shadow-warm-lg flex items-center justify-center z-50 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'var(--accent)',
          borderRadius: 20,
          boxShadow: '0 8px 20px -6px rgba(14,165,164,.5), inset 0 -2px 0 rgba(0,0,0,.15)',
        }}
        aria-label="Tambah transaksi baru"
        title="Tambah transaksi"
      >
        <Plus className="w-7 h-7" strokeWidth={2.4} />
      </button>

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
      />
    </div>
  )
}
