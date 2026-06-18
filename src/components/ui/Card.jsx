import { cn } from '@/lib/utils'

export function Card({ className, children, style, ...props }) {
  return (
    <div
      className={cn('rounded-r-lg', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: 'var(--r-lg)',
        ...style,
      }}
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
      className={cn('text-base font-semibold', className)}
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
