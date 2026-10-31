/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapped onto the CSS variables so every theme mode (kertas/malam/kontras) follows.
        primary: {
          DEFAULT: 'var(--accent)',
          300: 'var(--line-2)',
          600: 'var(--accent)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          ink:  'var(--accent-ink)',
          soft: 'var(--accent-soft)',
        },
        danger:  'var(--bad)',
        warning: 'var(--warn)',
        good:    'var(--good)',
        paper: {
          bg:       'var(--bg)',
          sub:      'var(--bg-sub)',
          surface:  'var(--surface)',
          s2:       'var(--surface-2)',
          ink:      'var(--ink)',
          'ink-2':  'var(--ink-2)',
          'ink-3':  'var(--ink-3)',
          line:     'var(--line)',
          'line-2': 'var(--line-2)',
        },
      },
      fontFamily: {
        sans:    ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Geist', 'sans-serif'],
        mono:    ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'r-sm': '12px',
        'r-md': '14px',
        'r-lg': '18px',
        'r-xl': '22px',
      },
      boxShadow: {
        'warm-sm': 'var(--shadow-sm)',
        'warm-md': 'var(--shadow-md)',
        'warm-lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}
