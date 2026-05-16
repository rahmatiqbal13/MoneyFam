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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button for Quick Add Transaction */}
      <button
        onClick={() => setTransactionModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group"
        aria-label="Tambah transaksi baru"
        title="Tambah transaksi"
      >
        <Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
      </button>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
      />
    </div>
  )
}
