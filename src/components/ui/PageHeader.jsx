import { useViewport } from '@/hooks/useViewport'

// Page masthead from the Amplop design: mono eyebrow, big display title,
// pill actions on the right. On phones the title lives in the top bar, so
// only the eyebrow and actions render here.
export function PageHeader({ eyebrow, title, actions }) {
  const { narrow } = useViewport()

  if (narrow) {
    if (!eyebrow && !actions) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {eyebrow && <span className="eyebrow" style={{ color: 'var(--ink-2)' }}>{eyebrow}</span>}
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    )
  }

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {eyebrow && <span className="eyebrow" style={{ fontSize: 13, letterSpacing: '.06em', color: 'var(--ink-3)' }}>{eyebrow}</span>}
        <h1 className="font-display" style={{ margin: 0, fontWeight: 800, fontSize: 40, letterSpacing: '-.04em', lineHeight: 1, color: 'var(--ink)' }}>
          {title}
        </h1>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexDirection: 'row-reverse' }}>{actions}</div>}
    </header>
  )
}
