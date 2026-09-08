import { ACCENT_OPTIONS } from '@/lib/theme'

// Extra swatches so 6+ members still get distinct colors.
const PALETTE = [...ACCENT_OPTIONS, '#EF4444', '#10B981', '#F97316', '#3B82F6']

export function memberColor(profile) {
  if (profile?.avatar_color) return profile.avatar_color
  const id = String(profile?.id || '')
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
