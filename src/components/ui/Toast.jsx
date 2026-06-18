import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const toastStyles = {
  success: {
    border: '1px solid #A7F3D0',
    background: '#ECFDF5',
    iconColor: '#16A34A',
  },
  error: {
    border: '1px solid #FECACA',
    background: '#FEF2F2',
    iconColor: '#DC2626',
  },
  warning: {
    border: '1px solid #FDE68A',
    background: '#FFFBEB',
    iconColor: '#D97706',
  },
  info: {
    border: '1px solid var(--accent-soft)',
    background: 'var(--accent-soft)',
    iconColor: 'var(--accent-ink)',
  },
}

const IconMap = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertCircle,
  info:    Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const timersRef = useRef(new Map())

  const addToast = useCallback((message, type = 'info', duration = 3500, action = null) => {
    const id = Math.random().toString(36).substring(2, 11)
    setToasts((prev) => [...prev, { id, message, type, action }])
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
    timersRef.current.set(id, timer)
  }, [])

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const toast = {
    success: (msg, opts = {}) => addToast(msg, 'success', opts.duration, opts.action),
    error:   (msg, opts = {}) => addToast(msg, 'error',   opts.duration, opts.action),
    warning: (msg, opts = {}) => addToast(msg, 'warning', opts.duration, opts.action),
    info:    (msg, opts = {}) => addToast(msg, 'info',    opts.duration, opts.action),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        style={{ maxWidth: 360, width: 'calc(100vw - 2rem)' }}
      >
        {toasts.map((t) => {
          const s = toastStyles[t.type]
          const IconComp = IconMap[t.type]
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 p-3.5"
              style={{
                ...s,
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span className="flex-shrink-0 mt-0.5">
                <IconComp className="w-5 h-5" style={{ color: s.iconColor }} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t.message}</p>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action.onClick()
                      removeToast(t.id)
                    }}
                    className="mt-1.5 text-xs font-semibold hover:underline"
                    style={{ color: 'var(--accent-ink)' }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 transition-colors"
                style={{ color: 'var(--ink-3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
