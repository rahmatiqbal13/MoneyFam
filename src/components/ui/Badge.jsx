import { cn } from '@/lib/utils'

const variants = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
}

export function Badge({ variant = 'gray', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant] || variants.gray,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function TransactionTypeBadge({ type }) {
  const map = {
    income: { variant: 'green', label: 'Pemasukan' },
    expense: { variant: 'red', label: 'Pengeluaran' },
    transfer: { variant: 'blue', label: 'Transfer' },
  }
  const config = map[type] || { variant: 'gray', label: type }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
