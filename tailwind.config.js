/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5A4',
          50:  '#F0FAFA',
          100: '#D8F0EF',
          200: '#A8DEDD',
          300: '#6ECBCA',
          400: '#35B6B5',
          500: '#0EA5A4',
          600: '#0A8180',
          700: '#086160',
          800: '#064442',
          900: '#042E2E',
        },
        accent: {
          DEFAULT: '#0EA5A4',
          ink:  '#0A6B6A',
          soft: '#D8F0EF',
        },
        danger:  '#DC2626',
        warning: '#D97706',
        good:    '#16A34A',
        // Warm neutral palette
        warm: {
          bg:       '#FAF6EF',
          'bg-sub': '#F2ECDF',
          surface:  '#FFFFFF',
          's2':     '#F7F1E4',
          ink:      '#2A2418',
          'ink-2':  '#5A5142',
          'ink-3':  '#918878',
          line:     '#ECE2CB',
          'line-2': '#E4D8BB',
        },
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Plus Jakarta Sans', 'serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'r-sm': '12px',
        'r-md': '18px',
        'r-lg': '22px',
        'r-xl': '28px',
      },
      boxShadow: {
        'warm-sm': '0 1px 2px rgba(75,53,18,.05)',
        'warm-md': '0 6px 24px -8px rgba(75,53,18,.12), 0 2px 4px rgba(75,53,18,.04)',
        'warm-lg': '0 20px 48px -16px rgba(75,53,18,.22)',
      },
    },
  },
  plugins: [],
}
