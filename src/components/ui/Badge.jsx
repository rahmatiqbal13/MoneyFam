import { cn } from '@/lib/utils'

const variants = {
  green:  { background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' },
  red:    { background: 'color-mix(in srgb, var(--bad) 14%, var(--surface))', color: 'var(--bad-ink)' },
  blue:   { background: 'color-mix(in srgb, #3E6AA8 16%, var(--surface))', color: 'color-mix(in srgb, #3E6AA8 80%, var(--ink))' },
  yellow: { background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--warn)' },
  gray:   { background: 'var(--bg-sub)', color: 'var(--ink-2)' },
  purple: { background: 'color-mix(in srgb, #6A57AC 16%, var(--surface))', color: 'color-mix(in srgb, #6A57AC 80%, var(--ink))' },
  orange: { background: 'color-mix(in srgb, #A3452C 16%, var(--surface))', color: 'color-mix(in srgb, #A3452C 80%, var(--ink))' },
  accent: { background: 'var(--accent)', color: 'var(--on-accent)' },
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
