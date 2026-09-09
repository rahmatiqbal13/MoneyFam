import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'text-white hover:opacity-90 focus:ring-2 focus:ring-offset-1',
  secondary: 'border focus:ring-2',
  danger:    'text-white hover:opacity-90 focus:ring-2',
  ghost:     'hover:opacity-80 focus:ring-2',
  outline:   'border focus:ring-2',
  soft:      'focus:ring-2',
  dark:      'focus:ring-2',
}

const sizes = {
  sm:   'px-3 py-1.5 text-sm gap-1.5',
  md:   'px-4 py-2 text-sm gap-2',
  lg:   'px-5 py-2.5 text-base gap-2',
  icon: 'p-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled = false,
  style,
  children,
  ...props
}) {
  const inlineStyle = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'secondary':
        return {
          background: 'var(--surface)',
          color: 'var(--ink-2)',
          borderColor: 'var(--line-2)',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'danger':
        return {
          background: 'var(--bad)',
          color: '#fff',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--ink-2)',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--accent)',
          borderColor: 'var(--accent)',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'soft':
        return {
          background: 'var(--accent-soft)',
          color: 'var(--accent-ink)',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      case 'dark':
        return {
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 'var(--r-sm)',
          ...style,
        }
      default:
        return style
    }
  })()

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] motion-reduce:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      style={inlineStyle}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (variant === 'ghost' && !disabled) {
          e.currentTarget.style.background = 'var(--surface-2)'
        }
        if (variant === 'secondary' && !disabled) {
          e.currentTarget.style.background = 'var(--surface-2)'
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost' && !disabled) {
          e.currentTarget.style.background = 'transparent'
        }
        if (variant === 'secondary' && !disabled) {
          e.currentTarget.style.background = 'var(--surface)'
        }
      }}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
