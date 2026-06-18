import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { forwardRef } from 'react'

export const Select = forwardRef(function Select(
  { label, error, className, helpText, required, children, style, ...props },
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
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none border px-3 py-2 text-sm pr-9',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          style={{
            borderRadius: 'var(--r-sm)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            borderColor: error ? '#DC2626' : 'var(--line-2)',
            ...style,
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--ink-3)' }}
        />
      </div>
      {helpText && !error && (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  )
})
