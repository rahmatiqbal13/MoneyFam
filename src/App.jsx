import { useEffect, useRef, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'

// Pages — Login/Register/ForgotPassword/ResetPassword/Dashboard load eagerly
// (first thing an unauthenticated or freshly-logged-in user sees). The rest
// are code-split via lazy() so the initial bundle stays lean; Layout renders
// them behind a <Suspense> boundary.
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'

const Transactions = lazy(() => import('@/pages/Transactions'))
const Wallets = lazy(() => import('@/pages/Wallets'))
const Budget = lazy(() => import('@/pages/Budget'))
const Reports = lazy(() => import('@/pages/Reports'))
const SavingsDebts = lazy(() => import('@/pages/SavingsDebts'))
const Categories = lazy(() => import('@/pages/Categories'))
const Settings = lazy(() => import('@/pages/Settings'))
const Investments = lazy(() => import('@/pages/Investments'))
const PensionCalculator = lazy(() => import('@/pages/PensionCalculator'))
const Notifications = lazy(() => import('@/pages/Notifications'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

function ProtectedRoute({ children }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--ink-3)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--ink-3)' }}
      >
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppInitializer({ children }) {
  const initialize = useAuthStore((s) => s.initialize)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    let cleanup
    
    const init = async () => {
      cleanup = await initialize()
    }
    
    init()
    
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [initialize])

  const uiPrefs = useAuthStore((s) => s.profile?.ui_prefs)
  useEffect(() => {
    if (uiPrefs) useThemeStore.getState().hydrate(uiPrefs)
  }, [uiPrefs])

  // Reset theme to defaults when the signed-in user goes away (sign-out) so a
  // shared browser doesn't carry one person's theme into the next session.
  const userId = useAuthStore((s) => s.user?.id)
  const prevUserId = useRef(userId)
  useEffect(() => {
    if (prevUserId.current && !userId) useThemeStore.getState().reset()
    prevUserId.current = userId
  }, [userId])

  // Show loading while initializing auth
  if (!initialized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', color: 'var(--ink-3)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-sm">Memuat aplikasi...</p>
        </div>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PWAInstallPrompt />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppInitializer>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  }
                />
                {/* Tidak dibungkus PublicRoute/ProtectedRoute: link recovery membuat
                    sesi sementara sehingga `user` di authStore bisa terisi, tapi
                    halaman ini tetap harus bisa diakses untuk set password baru. */}
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/savings" element={<SavingsDebts />} />
                  <Route path="/investments" element={<Investments />} />
                  <Route path="/pension" element={<PensionCalculator />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppInitializer>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
