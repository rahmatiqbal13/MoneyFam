import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useViewport } from '@/hooks/useViewport'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { TransactionModal } from '@/components/transactions/TransactionModal'

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

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
      />
    </div>
  )
}
