const TONES = {
  neutral: { background: 'var(--bg-sub)', color: 'var(--ink-2)' },
  accent:  { background: 'var(--accent)', color: 'var(--on-accent)' },
  ink:     { background: 'var(--accent)', color: 'var(--on-accent)' },
  good:    { background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' },
  bad:     { background: 'color-mix(in srgb, var(--bad) 14%, var(--surface))', color: 'var(--bad-ink)' },
  warn:    { background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--warn)' },
}

export function Pill({ tone = 'neutral', size = 'md', icon, children, className, style }) {
  const s = size === 'sm' ? { fontSize: 12, padding: '2px 8px' } : { fontSize: 13, padding: '3px 10px' }
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
