export const ACCENT_OPTIONS = ['#0EA5A4', '#F472B6', '#F59E0B', '#8B5CF6', '#16A34A', '#3B82F6']

export const THEME_VARIANTS = [
  { id: 'hangat', label: 'Hangat', bg: '#FAF6EF', accent: '#0EA5A4' },
  { id: 'ceria',  label: 'Ceria',  bg: '#FFFBF7', accent: '#8B5CF6' },
  { id: 'studio', label: 'Studio', bg: '#F4F4F2', accent: '#16A34A' },
]

export function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round(2.55 * percent)
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent)
  let b = (num & 0xff) + Math.round(2.55 * percent)
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

export function applyTheme({ variant, dark, accent }) {
  const root = document.documentElement
  root.setAttribute('data-variant', variant || 'hangat')
  root.setAttribute('data-dark', dark ? 'true' : 'false')
  if (accent) {
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-soft', accent + '22')
    root.style.setProperty('--accent-ink', shadeColor(accent, -22))
  } else {
    // Fall back to the variant stylesheet's accent (html[data-variant=…] rules).
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-soft')
    root.style.removeProperty('--accent-ink')
  }
}
