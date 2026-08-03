import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const triggerRef = useRef(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`)

  // Save trigger element before opening modal
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
    }
  }, [isOpen])

  // Focus trap and initial focus
  useEffect(() => {
    if (!isOpen) return

    // Move focus to modal container
    const modal = modalRef.current
    if (modal) {
      // Focus first focusable element or the modal itself
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length) {
        focusable[0].focus()
      } else {
        modal.focus()
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusableElements = modal?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Return focus to trigger element
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  const reduceMotion = useReducedMotion()

  const sizes = {
    sm:  'max-w-sm',
    md:  'max-w-md',
    lg:  'max-w-lg',
    xl:  'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(42,36,24,.45)', backdropFilter: 'blur(4px)' }}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId.current}
            tabIndex={-1}
            className={cn('w-full overflow-hidden outline-none', sizes[size], className)}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <h2
                id={titleId.current}
                className="text-base font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Tutup modal"
                className="p-1.5 rounded-xl transition-colors active:scale-90"
                style={{ color: 'var(--ink-3)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)'
                  e.currentTarget.style.color = 'var(--ink)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--ink-3)'
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[80vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ModalBody({ className, children }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function ModalFooter({ className, children }) {
  return (
    <div
      className={cn('px-5 py-4 flex gap-2 justify-end', className)}
      style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}
    >
      {children}
    </div>
  )
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Hapus', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <ModalBody>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
