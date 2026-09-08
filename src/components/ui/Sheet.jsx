import { useEffect } from 'react'
import { Icon } from './Icon'

export function Sheet({ open, onClose, title, children, fullHeight = false }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'sheetFadeIn .2s ease',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)', width: '100%',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          maxHeight: fullHeight ? '92vh' : '88vh',
          overflowY: 'auto',
          animation: 'sheetSlideUp .25s cubic-bezier(.2,.9,.3,1)',
          padding: '8px 0 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 40, height: 4, background: 'var(--line-2)', borderRadius: 2 }} />
        </div>
        {title && (
          <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
            <button
              onClick={onClose}
              aria-label="Tutup"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'var(--surface-2)', color: 'var(--ink-2)',
                border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <div style={{ padding: '0 20px 20px' }}>{children}</div>
      </div>
      <style>{`
        @keyframes sheetFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheetSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
