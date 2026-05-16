import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  { label, error, className, helpText, required, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
          error && 'border-red-500 focus:ring-red-300 focus:border-red-500',
          className
        )}
        {...props}
      />
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, className, helpText, required, rows = 3, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
          error && 'border-red-500 focus:ring-red-300 focus:border-red-500',
          className
        )}
        {...props}
      />
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
