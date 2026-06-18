import { cn } from '@/lib/utils'

const variants = {
  green:   { background: '#DCFCE7', color: '#15803D' },
  red:     { background: '#FEE2E2', color: '#B91C1C' },
  blue:    { background: '#DBEAFE', color: '#1D4ED8' },
  yellow:  { background: '#FEF3C7', color: '#B45309' },
  gray:    { background: 'var(--surface-2)', color: 'var(--ink-2)' },
  purple:  { background: '#EDE9FE', color: '#6D28D9' },
  orange:  { background: '#FFEDD5', color: '#C2410C' },
  accent:  { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
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
