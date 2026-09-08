export function Logo({ size = 36 }) {
  // Two overlapping circles + "M" mark
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: 'var(--accent)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15), inset 0 2px 0 rgba(255,255,255,.2)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M4 18 L4 7 L9 13 L14 7 L14 18 M14 13 a4 4 0 1 0 6 0 a4 4 0 1 0 -6 0"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
