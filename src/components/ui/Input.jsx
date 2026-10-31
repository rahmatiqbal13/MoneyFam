import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const baseInputStyle = {
  background: 'var(--surface)',
  color: 'var(--ink)',
  borderColor: 'var(--line-2)',
}

const errorInputStyle = {
  borderColor: 'var(--bad)',
}

export const Input = forwardRef(function Input(
  { label, error, className, helpText, required, style, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: 'var(--bad)' }}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full border-[1.5px] px-3.5 min-h-[50px] text-base placeholder:opacity-60',
          'focus:outline-none focus:border-[var(--ink)]',
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
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p role="alert" className="text-[13px] font-semibold" style={{ color: 'var(--bad-ink)' }}>{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, className, helpText, required, rows = 3, style, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: 'var(--bad)' }}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full border-[1.5px] px-3.5 py-3 text-base placeholder:opacity-60 resize-none',
          'focus:outline-none focus:border-[var(--ink)]',
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
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p role="alert" className="text-[13px] font-semibold" style={{ color: 'var(--bad-ink)' }}>{error}</p>}
    </div>
  )
})
