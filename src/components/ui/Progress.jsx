export function Progress({ value, max = 100, color = 'var(--ink)', height = 8, track = 'var(--bg-sub)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ background: track, height, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: color, borderRadius: 999,
        transition: 'width .5s var(--ease-out)',
      }} />
    </div>
  );
}
