import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md', className }) {
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
          style={{ background: 'rgba(29,27,23,.45)' }}
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
              background: 'var(--bg)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-1">
              <div className="flex flex-col gap-1 min-w-0">
                <h2
                  id={titleId.current}
                  className="font-display font-extrabold"
                  style={{ color: 'var(--ink)', fontSize: 26, letterSpacing: '-.03em', lineHeight: 1.1, margin: 0 }}
                >
                  {title}
                </h2>
                {subtitle && <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: 0 }}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Tutup"
                className="press flex-shrink-0 grid place-items-center rounded-full"
                style={{ width: 44, height: 44, background: 'var(--bg-sub)', color: 'var(--ink)', border: 'none' }}
              >
                <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
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
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function ModalFooter({ className, children }) {
  return (
    <div
      className={cn('px-6 pt-4 pb-6 flex gap-3 justify-end', className)}
      style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      {children}
    </div>
  )
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Hapus', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <ModalBody>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>{message}</p>
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
