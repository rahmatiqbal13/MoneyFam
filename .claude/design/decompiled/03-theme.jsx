// theme.jsx — applies CSS variables to <html> from tweaks, plus formatters

const ACCENT_OPTIONS = [
  '#0EA5A4', // teal
  '#F472B6', // pink
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#16A34A', // green (default for studio)
  '#3B82F6', // blue
];

function applyTheme({ variant, dark, accent }) {
  const root = document.documentElement;
  root.setAttribute('data-variant', variant);
  root.setAttribute('data-dark', dark ? 'true' : 'false');
  if (accent) {
    root.style.setProperty('--accent', accent);
    // soft tint: low-alpha version of the accent
    root.style.setProperty('--accent-soft', accent + '22');
    root.style.setProperty('--accent-ink', shadeColor(accent, -22));
  }
}

function shadeColor(hex, percent) {
  // simple darken/lighten
  const num = parseInt(hex.replace('#',''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent);
  let b = (num & 0xff) + Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + ((r<<16) | (g<<8) | b).toString(16).padStart(6,'0');
}

// ── Formatters (Bahasa Indonesia / IDR) ──
const idr = (n, opts = {}) => {
  const v = Math.abs(Math.round(n));
  const sign = n < 0 ? '-' : '';
  const formatted = v.toLocaleString('id-ID');
  return opts.noSign ? formatted : `${sign}Rp ${formatted}`;
};

const idrShort = (n) => {
  const v = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (v >= 1_000_000_000) return `${sign}Rp ${(v/1_000_000_000).toFixed(1).replace('.',',')} M`;
  if (v >= 1_000_000)     return `${sign}Rp ${(v/1_000_000).toFixed(1).replace('.',',')} jt`;
  if (v >= 1_000)         return `${sign}Rp ${(v/1_000).toFixed(0)} rb`;
  return `${sign}Rp ${v}`;
};

const monthName = (m) => ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][m];
const monthShort = (m) => ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][m];
const dayShort = (d) => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d];

const fmtDate = (iso) => {
  const dt = new Date(iso);
  return `${dt.getDate()} ${monthShort(dt.getMonth())} ${dt.getFullYear()}`;
};

const fmtTime = (iso) => {
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2,'0')}.${String(dt.getMinutes()).padStart(2,'0')}`;
};

const fmtRelative = (iso) => {
  const dt = new Date(iso);
  const today = new Date(2026, 4, 21);
  const days = Math.round((today - dt) / (1000*60*60*24));
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days/7)} minggu lalu`;
  return fmtDate(iso);
};

Object.assign(window, { applyTheme, ACCENT_OPTIONS, idr, idrShort, monthName, monthShort, dayShort, fmtDate, fmtTime, fmtRelative });
