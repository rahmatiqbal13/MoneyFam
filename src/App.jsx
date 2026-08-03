import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { useAuthStore } from '@/stores/authStore'

// Pages
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Wallets from '@/pages/Wallets'
import Budget from '@/pages/Budget'
import Reports from '@/pages/Reports'
import SavingsDebts from '@/pages/SavingsDebts'
import Categories from '@/pages/Categories'
import Settings from '@/pages/Settings'
import Investments from '@/pages/Investments'
import PensionCalculator from '@/pages/PensionCalculator'
import Notifications from '@/pages/Notifications'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Memuat...</p>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

  // Show loading while initializing auth
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Memuat aplikasi...</p>
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
