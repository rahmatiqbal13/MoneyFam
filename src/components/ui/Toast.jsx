import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

// Ink pill toast from the Amplop design; the icon carries the tone.
const iconColor = {
  success: '#9FD3A8',
  error:   '#F2A39C',
  warning: '#E5B866',
  info:    'currentColor',
}

const IconMap = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertCircle,
  info:    Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const reduceMotion = useReducedMotion()

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
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
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
        className="fixed z-[400] flex flex-col items-center gap-2 pointer-events-none"
        style={{ left: '50%', transform: 'translateX(-50%)', bottom: 'max(104px, calc(env(safe-area-inset-bottom) + 96px))', width: 'min(440px, calc(100vw - 32px))' }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const IconComp = IconMap[t.type]
            return (
              <motion.div
                key={t.id}
                layout={!reduceMotion}
                role="status"
                className="flex items-center gap-2.5 pointer-events-auto"
                style={{
                  background: 'var(--accent)', color: 'var(--on-accent)',
                  padding: '12px 14px 12px 18px', borderRadius: 18,
                  boxShadow: '0 16px 30px -12px rgba(29,27,23,.5)',
                }}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              >
                <span className="flex-shrink-0">
                  <IconComp className="w-[18px] h-[18px]" strokeWidth={2.4} style={{ color: iconColor[t.type] }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.message}</p>
                  {t.action && (
                    <button
                      onClick={() => {
                        t.action.onClick()
                        removeToast(t.id)
                      }}
                      className="mt-1 text-sm font-semibold underline underline-offset-[3px]"
                      style={{ color: 'inherit' }}
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Tutup"
                  className="flex-shrink-0 grid place-items-center rounded-full"
                  style={{ width: 32, height: 32, color: 'inherit', opacity: 0.7 }}
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
