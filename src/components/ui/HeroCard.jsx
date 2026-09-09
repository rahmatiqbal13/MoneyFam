export function HeroCard({
  label, value, sub, right, footer, children,
  gradientFrom = 'var(--accent)', gradientTo = 'var(--accent-ink)',
  className, style,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative', overflow: 'hidden', color: '#fff',
        borderRadius: 'var(--r-xl)', padding: 28,
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        boxShadow: 'var(--shadow-md)', ...style,
      }}
    >
      <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
      <div style={{ position: 'absolute', right: 40, bottom: -60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {label && <div style={{ fontSize: 12, fontWeight: 600, opacity: .8, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
          <div className="font-display tabular-nums" style={{ fontSize: 44, lineHeight: 1.05 }}>{value}</div>
          {sub && <div style={{ fontSize: 13, opacity: .85, marginTop: 4 }}>{sub}</div>}
          {footer}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
