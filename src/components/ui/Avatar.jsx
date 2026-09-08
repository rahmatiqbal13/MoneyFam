import { memberColor, initialsOf } from '@/lib/memberColor'

export function Avatar({ member, size = 32, className, style }) {
  if (!member) return null
  const fontSize = Math.round(size * 0.42)
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: member.emoji ? 'var(--surface-2)' : memberColor(member),
        color: '#fff', fontWeight: 700, fontSize, letterSpacing: '-0.02em',
        boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15), inset 0 2px 0 rgba(255,255,255,.18)',
        ...style,
      }}
    >
      {member.emoji || initialsOf(member.full_name)}
    </div>
  )
}

export function AvatarStack({ members, size = 28, max = 4 }) {
  if (!members?.length) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="inline-flex items-center">
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10, border: '2px solid var(--surface)', borderRadius: '50%' }}>
          <Avatar member={m} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="inline-flex items-center justify-center font-bold"
          style={{
            marginLeft: -10, width: size, height: size, borderRadius: '50%',
            background: 'var(--surface-2)', color: 'var(--ink-2)',
            fontSize: Math.round(size * 0.36), border: '2px solid var(--surface)',
          }}
        >+{extra}</div>
      )}
    </div>
  )
}
