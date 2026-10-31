import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useViewport } from '@/hooks/useViewport'
import { useUiStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { QuickCatatSheet } from '@/components/transactions/QuickCatatSheet'

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--ink)' }}
      />
    </div>
  )
}

export function Layout() {
  const { narrow } = useViewport()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { txModalOpen, openTxModal, closeTxModal, catatOpen, catatCategoryId, openCatat, closeCatat } = useUiStore()

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--bg)' }}>
      {!narrow && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {narrow && <Header onMenuClick={() => setDrawerOpen(true)} />}
        <main className="flex-1 overflow-y-auto">
          <div
            className="mx-auto"
            style={narrow
              ? { padding: '4px 18px 120px', maxWidth: 720 }
              : { padding: '34px 40px 64px', maxWidth: 1280 }}
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {narrow && (
        <>
          <BottomNav onAddTransaction={() => openCatat()} />
          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
          <QuickCatatSheet
            open={catatOpen}
            onClose={closeCatat}
            initialCategoryId={catatCategoryId}
            onOpenFullForm={openTxModal}
          />
        </>
      )}

      <TransactionModal isOpen={txModalOpen} onClose={closeTxModal} />
    </div>
  )
}
