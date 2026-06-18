import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const baseInputStyle = {
  background: 'var(--surface)',
  color: 'var(--ink)',
  borderColor: 'var(--line-2)',
}

const errorInputStyle = {
  borderColor: '#DC2626',
}

export const Input = forwardRef(function Input(
  { label, error, className, helpText, required, style, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full border px-3 py-2 text-sm placeholder:opacity-50',
          'focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        style={{
          borderRadius: 'var(--r-sm)',
          ...baseInputStyle,
          ...(error ? errorInputStyle : {}),
          ...style,
        }}
        {...props}
      />
      {helpText && !error && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, className, helpText, required, rows = 3, style, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full border px-3 py-2 text-sm placeholder:opacity-50 resize-none',
          'focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        style={{
          borderRadius: 'var(--r-sm)',
          ...baseInputStyle,
          ...(error ? errorInputStyle : {}),
          ...style,
        }}
        {...props}
      />
      {helpText && !error && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  )
})
