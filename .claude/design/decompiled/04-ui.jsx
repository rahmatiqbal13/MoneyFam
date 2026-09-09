// ui.jsx — Reusable UI components: Card, Avatar, MemberDot, Pill, Sparkbar, Sheet, Icon

const { useState, useEffect, useRef } = React;

// ── Icon: hand-rolled minimal stroke icons (we don't pull lucide) ──
function Icon({ name, size = 20, stroke = 1.75, className = "", style }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
    className, style,
  };
  const paths = {
    home:        <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
    swap:        <><path d="M7 7h12l-3-3"/><path d="M17 17H5l3 3"/></>,
    wallet:      <><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13h2"/></>,
    pie:         <><path d="M12 3a9 9 0 1 0 9 9h-9V3z"/></>,
    chart:       <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>,
    pig:         <><path d="M6 11a6 6 0 1 1 12 0v4a2 2 0 0 1-2 2h-1l-1 3h-2l-1-3H8a2 2 0 0 1-2-2zM4 11h2"/><circle cx="14" cy="11" r=".8" fill="currentColor"/></>,
    trending:    <><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></>,
    calc:        <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 7h6M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></>,
    tag:         <><path d="M3 12 12 3h8v8l-9 9z"/><circle cx="16" cy="8" r="1.2"/></>,
    bell:        <><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    plus:        <><path d="M12 5v14M5 12h14"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    menu:        <><path d="M3 7h18M3 12h18M3 17h18"/></>,
    x:           <><path d="M6 6 18 18M18 6 6 18"/></>,
    chevronR:    <><path d="m9 6 6 6-6 6"/></>,
    chevronL:    <><path d="m15 6-6 6 6 6"/></>,
    chevronD:    <><path d="m6 9 6 6 6-6"/></>,
    arrowUp:     <><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowDown:   <><path d="M12 5v14M19 12l-7 7-7-7"/></>,
    arrowR:      <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    check:       <><path d="M5 12l5 5 9-11"/></>,
    eye:         <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:      <><path d="M3 3l18 18"/><path d="M10.5 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.4 3"/><path d="M6 7c-2.4 1.5-4 5-4 5s3.5 7 10 7c1.6 0 3-.3 4.2-.8"/></>,
    filter:      <><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>,
    moon:        <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></>,
    sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></>,
    target:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    calendar:    <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    upload:      <><path d="M12 16V4M5 11l7-7 7 7"/><path d="M4 20h16"/></>,
    download:    <><path d="M12 4v12M5 13l7 7 7-7"/><path d="M4 22h16"/></>,
    trash:       <><path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"/></>,
    user:        <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    users:       <><circle cx="9" cy="8" r="4"/><path d="M3 21c1-4 3.5-6 6-6s5 2 6 6"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21c-.7-3-2.5-4.5-4.5-5"/></>,
    sparkles:    <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4 8.4 15.6M15.6 8.4l2.8-2.8"/></>,
    info:        <><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v4h1"/></>,
    pencil:      <><path d="M4 20h4l11-11-4-4L4 16z"/></>,
    star:        <><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 17l-5.4 2.5 1.2-6L3.3 9.3l6.1-.7z"/></>,
    coin:        <><circle cx="12" cy="12" r="9"/><path d="M9 14c.7.7 1.8 1 3 1s3-.5 3-2-1-1.8-3-2-3-.5-3-2 1.3-2 3-2 2.3.3 3 1"/><path d="M12 6v2M12 16v2"/></>,
    gift:        <><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M8 8c-2 0-3-3-1-4 2-1 4 2 5 4 1-2 3-5 5-4 2 1 1 4-1 4"/></>,
    logout:      <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m17 8 4 4-4 4M21 12H9"/></>,
    family:      <><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M3 21c.8-3 3-5 6-5s5.2 2 6 5"/><path d="M14 21c.5-2 2-3 3-3s2.5 1 3 3"/></>,
    heart:       <><path d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3 3.5 0 6 3.5 4.5 7-2 4.5-9 9-9 9z"/></>,
    book:        <><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h12"/></>,
    crown:       <><path d="m4 8 4 4 4-6 4 6 4-4-2 11H6z"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

// ── Avatar: colored circle with initials + optional emoji ──
function Avatar({ member, size = 32, style }) {
  if (!member) return null;
  const s = { width: size, height: size, background: member.color, ...style };
  const fontSize = Math.round(size * 0.42);
  return (
    <div style={{
      ...s,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize,
      letterSpacing: '-0.02em',
      flexShrink: 0,
      boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15), inset 0 2px 0 rgba(255,255,255,.18)',
    }}>
      {member.initials}
    </div>
  );
}

// ── Stacked avatars ──
function AvatarStack({ members, size = 28, max = 4, gap = -10 }) {
  if (!members || members.length === 0) return null;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : gap, border: '2px solid var(--surface)', borderRadius: '50%' }}>
          <Avatar member={m} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: gap, width: size, height: size, borderRadius: '50%',
          background: 'var(--surface-2)', color: 'var(--ink-2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: Math.round(size * 0.36),
          border: '2px solid var(--surface)',
        }}>+{extra}</div>
      )}
    </div>
  );
}

// ── Card primitive ──
function Card({ children, padding = 20, radius = 'lg', tone = 'surface', style, onClick, className }) {
  const r = { sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)', xl: 'var(--r-xl)' }[radius];
  const bg = tone === 'accent' ? 'var(--accent)' : tone === 'sub' ? 'var(--surface-2)' : 'var(--surface)';
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: bg,
        borderRadius: r,
        padding,
        boxShadow: tone === 'accent' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        border: tone === 'surface' ? '1px solid var(--line)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease',
        ...style,
      }}
      onMouseDown={onClick ? (e) => (e.currentTarget.style.transform = 'scale(.99)') : undefined}
      onMouseUp={onClick ? (e) => (e.currentTarget.style.transform = '') : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.transform = '') : undefined}
    >
      {children}
    </div>
  );
}

// ── Pill / Tag ──
function Pill({ children, tone = 'neutral', size = 'md', icon, style }) {
  const tones = {
    neutral: { bg: 'var(--surface-2)', fg: 'var(--ink-2)' },
    accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)' },
    good:    { bg: '#DCFCE7', fg: '#15803D' },
    bad:     { bg: '#FEE2E2', fg: '#B91C1C' },
    warn:    { bg: '#FEF3C7', fg: '#B45309' },
  };
  const t = tones[tone];
  const sz = size === 'sm' ? { fs: 11, ph: 8, pv: 3 } : { fs: 12, ph: 10, pv: 4 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: t.bg, color: t.fg,
      padding: `${sz.pv}px ${sz.ph}px`,
      borderRadius: 999, fontSize: sz.fs, fontWeight: 600,
      ...style,
    }}>
      {icon}{children}
    </span>
  );
}

// ── Progress bar ──
function Progress({ value, max = 100, color = 'var(--accent)', height = 8, bg = 'var(--surface-2)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ background: bg, height, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: color, borderRadius: 999,
        transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
      }} />
    </div>
  );
}

// ── Ring progress (for goals) ──
function Ring({ value, max = 100, size = 64, stroke = 8, color = 'var(--accent)', track = 'var(--surface-2)', children }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Sparkbar (mini bar chart) ──
function Sparkbar({ data, height = 36, color = 'var(--accent)', track = 'var(--line)', barGap = 2 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: barGap, height, width: '100%' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${Math.max(4, (v / max) * 100)}%`,
          background: v === 0 ? track : color, borderRadius: 3, opacity: v === 0 ? .5 : 1,
          transition: 'height .4s ease',
        }} />
      ))}
    </div>
  );
}

// ── Sheet (mobile bottom drawer) ──
function Sheet({ open, onClose, title, children, fullHeight = false }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn .2s ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface)', width: '100%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: fullHeight ? '92vh' : '88vh',
        overflowY: 'auto',
        animation: 'slideUp .25s cubic-bezier(.2,.9,.3,1)',
        padding: '8px 0 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 40, height: 4, background: 'var(--line-2)', borderRadius: 2 }} />
        </div>
        {title && (
          <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={btnIconStyle()}>
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <div style={{ padding: '0 20px 20px' }}>{children}</div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}

function btnIconStyle(active = false) {
  return {
    width: 36, height: 36, borderRadius: 12,
    background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
    color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
    border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  };
}

function btnStyle({ tone = 'primary', size = 'md', full = false } = {}) {
  const sizes = {
    sm: { ph: 12, pv: 8, fs: 13, r: 10 },
    md: { ph: 16, pv: 11, fs: 14, r: 14 },
    lg: { ph: 22, pv: 14, fs: 15, r: 18 },
  };
  const s = sizes[size];
  const tones = {
    primary: { bg: 'var(--accent)', fg: '#fff', border: 'transparent' },
    ghost:   { bg: 'transparent',   fg: 'var(--ink)', border: 'var(--line)' },
    soft:    { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', border: 'transparent' },
    dark:    { bg: 'var(--ink)',    fg: 'var(--bg)',  border: 'transparent' },
  };
  const t = tones[tone];
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: `${s.pv}px ${s.ph}px`, fontSize: s.fs, fontWeight: 600,
    background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
    borderRadius: s.r, cursor: 'pointer', width: full ? '100%' : 'auto',
    transition: 'transform .12s ease, opacity .12s ease',
  };
}

// ── Helpers to look up data ──
const memberById = (id) => window.MF.FAMILY.members.find(m => m.id === id);
const categoryById = (id) => window.MF.CATEGORIES.find(c => c.id === id);
const walletById = (id) => window.MF.WALLETS.find(w => w.id === id);

Object.assign(window, {
  Icon, Avatar, AvatarStack, Card, Pill, Progress, Ring, Sparkbar, Sheet,
  btnIconStyle, btnStyle,
  memberById, categoryById, walletById,
});
