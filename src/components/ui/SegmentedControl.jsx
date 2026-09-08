import { Icon } from './Icon'

export function SegmentedControl({ value, onChange, options, size = 'sm', className }) {
  if (size === 'sm') {
    return (
      <div className={className} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--line)', cursor: 'pointer',
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink-2)',
              }}
            >
              {o.icon && <Icon name={o.icon} size={15} />}{o.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className={className} style={{ display: 'inline-flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 16 }}>
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', border: 'none', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {o.icon && <Icon name={o.icon} size={16} />}{o.label}
          </button>
        )
      })}
    </div>
  )
}
