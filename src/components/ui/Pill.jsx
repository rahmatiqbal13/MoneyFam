const TONES = {
  neutral: { background: 'var(--surface-2)', color: 'var(--ink-2)' },
  accent:  { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
  good:    { background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' },
  bad:     { background: 'color-mix(in srgb, var(--bad) 16%, var(--surface))', color: 'var(--bad)' },
  warn:    { background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))', color: 'var(--warn)' },
}

export function Pill({ tone = 'neutral', size = 'md', icon, children, className, style }) {
  const s = size === 'sm' ? { fontSize: 11, padding: '3px 8px' } : { fontSize: 12, padding: '4px 10px' }
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999,
        fontWeight: 600, ...s, ...TONES[tone], ...style,
      }}
    >
      {icon}{children}
    </span>
  )
}
