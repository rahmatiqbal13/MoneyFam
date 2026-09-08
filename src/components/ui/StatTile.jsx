export function StatTile({ label, value, pill, accent = false, className, style }) {
  return (
    <div
      className={className}
      style={{
        background: accent ? 'var(--accent)' : 'var(--surface)',
        color: accent ? '#fff' : 'var(--ink)',
        border: accent ? 'none' : '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--shadow-sm)', ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: accent ? 'rgba(255,255,255,.85)' : 'var(--ink-3)' }}>{label}</span>
        {pill}
      </div>
      <div className="font-display tabular-nums" style={{ fontSize: 22, marginTop: 6, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
