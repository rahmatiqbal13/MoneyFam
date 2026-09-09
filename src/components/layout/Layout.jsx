import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useViewport } from '@/hooks/useViewport'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { Icon } from '@/components/ui/Icon'

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  )
}

export function Layout() {
  const { isDesktop, narrow } = useViewport()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--bg)' }}>
      {isDesktop && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div
            className="p-4 lg:p-6 max-w-[1180px] mx-auto"
            style={narrow ? { paddingBottom: 110 } : undefined}
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {narrow && (
        <>
          <BottomNav onAddTransaction={() => setTransactionModalOpen(true)} />
          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </>
      )}

      {!narrow && (
        <button
          type="button"
          onClick={() => setTransactionModalOpen(true)}
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 22px', borderRadius: 999,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: 'var(--shadow-lg)',
          }}
        >
          <Icon name="plus" size={18} stroke={2.4} /> Catat Transaksi
        </button>
      )}

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
      />
    </div>
  )
}
