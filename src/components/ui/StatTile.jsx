// Ruled number cell: label over a mono figure, no card chrome.
export function StatTile({ label, value, sub, pill, tone, className, style }) {
  const color = tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--bad)' : 'var(--ink)'
  return (
    <div
      className={className}
      style={{
        borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)',
        padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
        {pill}
      </div>
      <div className="font-mono" style={{ fontSize: 22, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  )
}

// A row of figures separated by hairlines — the design's summary strip.
// items: [{ label, value, tone?, onClick? }]
export function StatStrip({ items, columns, compact = false }) {
  const cols = columns || items.length
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        borderTop: '1px solid var(--rule)',
      }}
    >
      {items.map((it, i) => {
        const col = i % cols
        const color = it.tone === 'good' ? 'var(--good)' : it.tone === 'bad' ? 'var(--bad)' : 'var(--ink)'
        const Tag = it.onClick ? 'button' : 'div'
        return (
          <Tag
            key={it.label}
            type={it.onClick ? 'button' : undefined}
            onClick={it.onClick}
            style={{
              padding: compact ? '12px 0' : '16px 0',
              paddingLeft: col === 0 ? 0 : compact ? 12 : 20,
              paddingRight: compact ? 12 : 20,
              borderLeft: col === 0 ? 'none' : '1px solid var(--rule)',
              borderBottom: '1px solid var(--rule)',
              borderTop: 'none', borderRight: 'none',
              background: 'transparent', textAlign: 'left', cursor: it.onClick ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', gap: compact ? 2 : 4, minWidth: 0, color: 'inherit',
            }}
          >
            <span style={{ fontSize: compact ? 12 : 13, color: 'var(--ink-3)' }}>{it.label}</span>
            <span
              className="font-mono"
              style={{
                fontSize: compact ? 16 : 22, fontWeight: 600, color,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {it.value}
            </span>
          </Tag>
        )
      })}
    </div>
  )
}
