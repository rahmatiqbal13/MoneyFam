// Ink "verdict" card from the Amplop design: flat, no gradients or ornaments.
export function HeroCard({
  label, value, sub, right, footer, children,
  className, style,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--accent)', color: 'var(--on-accent)',
        borderRadius: 'var(--r-lg)', padding: 26,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {label && (
            <div className="eyebrow" style={{ color: 'inherit', opacity: 0.72, marginBottom: 8 }}>{label}</div>
          )}
          <div className="font-mono" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-.045em' }}>{value}</div>
          {sub && <div style={{ fontSize: 15, opacity: 0.8, marginTop: 6 }}>{sub}</div>}
          {footer}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
