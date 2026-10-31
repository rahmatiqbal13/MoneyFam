import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { forwardRef } from 'react'

export const Select = forwardRef(function Select(
  { label, error, className, helpText, required, children, style, ...props },
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
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none border-[1.5px] px-3.5 min-h-[50px] text-base pr-10',
            'focus:outline-none focus:border-[var(--ink)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          style={{
            borderRadius: 'var(--r-sm)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            borderColor: error ? 'var(--bad)' : 'var(--line-2)',
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
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{helpText}</p>
      )}
      {error && <p role="alert" className="text-[13px] font-semibold" style={{ color: 'var(--bad-ink)' }}>{error}</p>}
    </div>
  )
})
