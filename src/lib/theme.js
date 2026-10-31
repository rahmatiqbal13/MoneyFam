// Member identity colors — used on avatars, transaction dots and report bars.
export const MEMBER_COLORS = ['#2F7F7A', '#B8507A', '#95600F', '#6A57AC', '#3E6AA8', '#A3452C']

// Deeper envelope inks for color pickers; envelopeTones() turns each into
// its pastel paper face, and they stay legible as dots, bars and text.
export const INK_COLORS = ['#9C7A3E', '#A85F4E', '#3F7A70', '#6A5C93', '#5E7A35', '#A3711C', '#46658F', '#A1503F', '#2F7F7A', '#B8507A']

export const THEME_MODES = [
  { id: 'kertas',  label: 'Kertas',          bg: '#F2EDE3', fg: '#1D1B17' },
  { id: 'malam',   label: 'Malam',           bg: '#1D1B17', fg: '#F2EDE3' },
  { id: 'kontras', label: 'Kontras tinggi',  bg: '#FFFFFF', fg: '#000000' },
]

const THEME_COLOR = { kertas: '#F2EDE3', malam: '#1D1B17', kontras: '#FFFFFF' }

export function applyTheme({ mode }) {
  const m = THEME_COLOR[mode] ? mode : 'kertas'
  document.documentElement.setAttribute('data-theme', m)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[m])
}

// Envelope tones derived from a (often saturated) category color, so every
// envelope reads as pastel paper while staying recognisably "its" color.
export function envelopeTones(color) {
  const c = color || '#CDB384'
  return {
    face: `color-mix(in srgb, ${c} 24%, #F6EEDF)`,
    back: `color-mix(in srgb, ${c} 40%, #D9CBB0)`,
    ink:  `color-mix(in srgb, ${c} 70%, #1D1B17)`,
  }
}
