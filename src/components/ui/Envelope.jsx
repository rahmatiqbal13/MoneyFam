import { envelopeTones } from '@/lib/theme'
import { idrShort } from '@/lib/utils'

const DASH = 'repeating-linear-gradient(90deg,#D8CFBE 0 4px,transparent 4px 8px)'

// Budget envelope: the paper slip's height shows what's left inside.
// ratio = remaining / limit (0..1). Over budget gets a "BOCOR" stamp.
export function Envelope({
  no, name, color, spent, limit, selected = false, onClick, compact = false, showSpent = true,
}) {
  const tones = envelopeTones(color)
  const sisa = limit - spent
  const over = spent > limit
  const ratio = limit > 0 ? Math.max(0, Math.min(1, sisa / limit)) : 0
  const low = !over && limit > 0 && ratio < 0.1

  const h = compact ? 184 : 206
  const slipH = compact ? 130 : 150
  const backTop = compact ? 40 : 44
  const faceTop = compact ? 72 : 78
  const travel = slipH - (compact ? 38 : 46)
  const slipY = Math.round(travel + 8 - ratio * travel)
  const tagTop = faceTop + (compact ? 12 : 18)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      aria-label={`Amplop ${name}: sisa ${idrShort(Math.max(0, sisa))} dari ${idrShort(limit)}`}
      className="lift"
      style={{
        position: 'relative', height: h, width: '100%', border: 'none', padding: 0,
        background: 'transparent', cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
        borderRadius: 12, overflow: 'hidden', color: 'var(--env-ink)',
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: backTop, bottom: 0, borderRadius: 12, background: tones.back }} />
      <div
        style={{
          position: 'absolute', left: compact ? 12 : 14, right: compact ? 12 : 14, top: 0, height: slipH,
          borderRadius: 6, background: 'var(--paper)', padding: compact ? '9px 10px' : '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 6,
          transform: `translateY(${slipY}px)`, transition: 'transform .6s var(--ease-out)',
        }}
      >
        {no && <span className="font-mono" style={{ fontSize: 11, letterSpacing: '.1em', color: '#6B6355' }}>{no}</span>}
        <div style={{ height: 1, background: DASH }} />
        {!compact && <div style={{ height: 1, background: DASH }} />}
      </div>
      <div
        className="envelope-mark"
        style={{
          position: 'absolute', left: 0, right: 0, top: faceTop, bottom: 0, borderRadius: 12,
          background: tones.face,
          clipPath: `polygon(0 0,50% ${compact ? 20 : 22}%,100% 0,100% 100%,0 100%)`,
          boxShadow: selected ? 'inset 0 0 0 2px #1D1B17' : 'none',
        }}
      />
      <div style={{ position: 'absolute', left: compact ? 12 : 14, right: compact ? 12 : 14, bottom: compact ? 10 : 12, display: 'flex', flexDirection: 'column', gap: compact ? 1 : 2 }}>
        <span className="font-display" style={{ fontWeight: 700, fontSize: compact ? 16 : 18, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </span>
        <span className="font-mono" style={{ fontWeight: 700, fontSize: compact ? 15 : 17, letterSpacing: '-.03em' }}>
          {over ? 'Rp0' : idrShort(sisa)}{' '}
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: compact ? 12 : 13, letterSpacing: 0 }}>sisa</span>
        </span>
        {showSpent && (
          <span style={{ fontSize: compact ? 12 : 13, color: '#3E382F' }}>
            {idrShort(spent)} dari {idrShort(limit)}
          </span>
        )}
      </div>
      {over && (
        <span
          className="font-mono"
          style={{
            position: 'absolute', right: 10, top: tagTop, transform: 'rotate(-7deg)',
            border: '2px solid #B3261E', color: '#B3261E', fontWeight: 700,
            fontSize: compact ? 11 : 12, letterSpacing: '.06em', padding: compact ? '2px 5px' : '3px 7px',
            borderRadius: 5, background: 'rgba(255,253,248,.6)',
          }}
        >
          {compact ? 'BOCOR' : `BOCOR ${idrShort(-sisa)}`}
        </span>
      )}
      {low && (
        <span
          style={{
            position: 'absolute', right: 10, top: tagTop, background: '#1D1B17', color: '#F2EDE3',
            fontSize: compact ? 11 : 12, fontWeight: 600, padding: compact ? '2px 8px' : '3px 9px', borderRadius: 999,
          }}
        >
          Hampir habis
        </span>
      )}
    </button>
  )
}

// Small envelope chip used as a category marker in lists.
export function EnvelopeMark({ color, width = 30, height = 22, flap = true, style }) {
  return (
    <span
      aria-hidden="true"
      className={flap ? 'envelope-mark' : undefined}
      style={{
        display: 'inline-block', width, height, flexShrink: 0, borderRadius: 5,
        background: envelopeTones(color).face, ...style,
      }}
    />
  )
}

export function envelopeStatus(spent, limit) {
  const sisa = limit - spent
  const over = spent > limit
  const ratio = limit > 0 ? Math.max(0, Math.min(1, sisa / limit)) : 0
  return { sisa, over, ratio, low: !over && limit > 0 && ratio < 0.1 }
}
