export function Sparkbar({ data, height = 36, color = 'var(--accent)', track = 'var(--line)', barGap = 2 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: barGap, height, width: '100%' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${Math.max(4, (v / max) * 100)}%`,
          background: v === 0 ? track : color, borderRadius: 3, opacity: v === 0 ? .5 : 1,
          transition: 'height .4s ease',
        }} />
      ))}
    </div>
  );
}
