import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// Pill buttons from the Amplop design: ink-filled primary, outlined secondary.
const VARIANT_STYLE = {
  primary:   { background: 'var(--accent)', color: 'var(--on-accent)', border: '1.5px solid transparent' },
  dark:      { background: 'var(--accent)', color: 'var(--on-accent)', border: '1.5px solid transparent' },
  secondary: { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--line-2)' },
  outline:   { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--ink)' },
  ghost:     { background: 'transparent', color: 'var(--ink-2)', border: '1.5px solid transparent' },
  soft:      { background: 'var(--bg-sub)', color: 'var(--ink)', border: '1.5px solid transparent' },
  danger:    { background: 'var(--bad)', color: 'var(--on-accent)', border: '1.5px solid transparent' },
  'danger-outline': { background: 'transparent', color: 'var(--bad-ink)', border: '1.5px solid var(--bad)' },
}

const HOVER_BG = {
  primary: 'var(--accent-hover)',
  dark: 'var(--accent-hover)',
  secondary: 'var(--bg-sub)',
  outline: 'var(--bg-sub)',
  ghost: 'var(--bg-sub)',
  soft: 'var(--line)',
  'danger-outline': 'var(--bad-soft)',
}

const sizes = {
  sm:   'min-h-[36px] px-3.5 text-sm gap-1.5',
  md:   'min-h-[44px] px-5 text-[15px] gap-2',
  lg:   'min-h-[48px] px-6 text-[15px] gap-2',
  icon: 'w-11 h-11',
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
  const base = VARIANT_STYLE[variant] || VARIANT_STYLE.primary
  const hover = HOVER_BG[variant]

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap rounded-full transition-[transform,background-color] duration-150 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] motion-reduce:active:scale-100',
        sizes[size],
        className
      )}
      style={{ ...base, ...style }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (hover && !disabled && !loading) e.currentTarget.style.background = hover
      }}
      onMouseLeave={(e) => {
        if (hover) e.currentTarget.style.background = style?.background || base.background
      }}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
