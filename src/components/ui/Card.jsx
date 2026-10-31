import { cn } from '@/lib/utils'

const RADIUS_MAP = {
  sm: 'var(--r-sm)',
  md: 'var(--r-md)',
  lg: 'var(--r-lg)',
  xl: 'var(--r-xl)',
}

function toneStyle(tone) {
  switch (tone) {
    case 'sub':
      return { background: 'var(--surface-2)', border: 'none' }
    case 'accent':
    case 'ink':
      return {
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        border: 'none',
      }
    case 'plain':
      return { background: 'transparent', border: 'none' }
    case 'surface':
    default:
      return {
        background: 'var(--surface)',
        border: 'none',
        boxShadow: '0 0 0 1px var(--line)',
      }
  }
}

export function Card({
  className,
  children,
  style,
  tone = 'surface',
  padding,
  radius,
  onClick,
  ...props
}) {
  return (
    <div
      className={cn(radius ? '' : 'rounded-r-lg', className)}
      style={{
        ...toneStyle(tone),
        borderRadius: RADIUS_MAP[radius] || RADIUS_MAP.lg,
        ...(padding !== undefined ? { padding } : {}),
        ...style,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, style, ...props }) {
  return (
    <div
      className={cn('px-5 py-4', className)}
      style={{ borderBottom: '1px solid var(--line)', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('font-display text-xl font-bold', className)}
      style={{ color: 'var(--ink)' }}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, style, ...props }) {
  return (
    <div
      className={cn('px-5 py-3', className)}
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--surface-2)',
        borderBottomLeftRadius: 'var(--r-lg)',
        borderBottomRightRadius: 'var(--r-lg)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
