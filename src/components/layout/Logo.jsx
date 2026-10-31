// Envelope mark: a paper slip tucked into an ink envelope.
export function Logo({ size = 34 }) {
  const w = size
  const h = Math.round(size * 0.76)
  const s = size / 34
  return (
    <div aria-hidden="true" style={{ width: w, height: h, position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: `${6 * s}px 0 0 0`, background: 'var(--ink)', borderRadius: 4 * s }} />
      <div style={{ position: 'absolute', left: 4 * s, right: 4 * s, top: 0, height: 14 * s, background: '#E6D2AA', borderRadius: 2 * s }} />
      <div
        className="envelope-mark"
        style={{ position: 'absolute', inset: `${11 * s}px 0 0 0`, background: 'var(--ink)', borderRadius: 4 * s }}
      />
    </div>
  )
}

export function Wordmark({ size = 21 }) {
  return (
    <span className="font-display" style={{ fontWeight: 800, fontSize: size, letterSpacing: '-.03em', color: 'var(--ink)' }}>
      MoneyFam
    </span>
  )
}
