import { Icon } from './Icon'

// Pill tablist from the Amplop design: sand track, ink-filled active tab.
// size="sm" renders loose chips (filters); anything else renders the tablist.
export function SegmentedControl({ value, onChange, options, size = 'sm', className, fill = false, nowrap = false }) {
  if (size === 'sm') {
    return (
      <div className={className} style={{ display: 'flex', gap: 8, flexWrap: nowrap ? 'nowrap' : 'wrap' }}>
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className="press"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                minHeight: 38, padding: '0 14px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`, cursor: 'pointer',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--on-accent)' : 'var(--ink)',
                whiteSpace: 'nowrap',
              }}
            >
              {o.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot }} />}
              {o.icon && <Icon name={o.icon} size={15} />}{o.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: fill ? 'grid' : 'inline-flex',
        gridTemplateColumns: fill ? `repeat(${options.length}, 1fr)` : undefined,
        gap: 4, background: 'var(--bg-sub)', padding: 4, borderRadius: 999,
      }}
    >
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 38, padding: '0 18px', border: 'none', borderRadius: 999, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--ink)',
              transition: 'background-color .15s ease',
            }}
          >
            {o.icon && <Icon name={o.icon} size={16} />}{o.label}
          </button>
        )
      })}
    </div>
  )
}
