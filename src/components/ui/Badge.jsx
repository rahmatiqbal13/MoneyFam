import { cn } from '@/lib/utils'

const variants = {
  green:  { background: 'color-mix(in srgb, #16A34A 16%, var(--surface))', color: '#16A34A' },
  red:    { background: 'color-mix(in srgb, #DC2626 16%, var(--surface))', color: '#DC2626' },
  blue:   { background: 'color-mix(in srgb, #2563EB 16%, var(--surface))', color: '#2563EB' },
  yellow: { background: 'color-mix(in srgb, #D97706 18%, var(--surface))', color: '#D97706' },
  gray:   { background: 'var(--surface-2)', color: 'var(--ink-2)' },
  purple: { background: 'color-mix(in srgb, #7C3AED 16%, var(--surface))', color: '#7C3AED' },
  orange: { background: 'color-mix(in srgb, #EA580C 16%, var(--surface))', color: '#EA580C' },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
}

export function Badge({ variant = 'gray', className, style, children, ...props }) {
  const colorStyle = variants[variant] || variants.gray
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 text-xs font-semibold', className)}
      style={{ borderRadius: 999, ...colorStyle, ...style }}
      {...props}
    >
      {children}
    </span>
  )
}

export function TransactionTypeBadge({ type }) {
  const map = {
    income:   { variant: 'green',  label: 'Pemasukan' },
    expense:  { variant: 'red',    label: 'Pengeluaran' },
    transfer: { variant: 'blue',   label: 'Transfer' },
  }
  const config = map[type] || { variant: 'gray', label: type }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
