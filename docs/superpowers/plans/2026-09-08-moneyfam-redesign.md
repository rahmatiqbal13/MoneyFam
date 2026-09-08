# MoneyFam Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the "MoneyFam (offline)" prototype into the live React app — theme system (3 variants + dark + accent), redesigned shell, and all 11 pages + 4 auth screens, wired to the existing Supabase / react-query data layer.

**Architecture:** Evolve the existing `src/components/ui/*` primitives and add the missing ones (`HeroCard`, `Ring`, `Sparkbar`, `Avatar`, `Sheet`, `SegmentedControl`, `Progress`, `StatTile`, `Icon`). Theme state lives in a new zustand `themeStore` that writes CSS custom-property attributes on `<html>`, mirrors to `localStorage`, and debounce-syncs to `profiles.ui_prefs`. Pages are rebuilt to the prototype layouts (decompiled reference in `.claude/design/decompiled/`) using Tailwind + the token vars, keeping every existing data hook and form mutation.

**Tech Stack:** Vite 6, React 18, Tailwind 3, zustand 4, @tanstack/react-query 5, @supabase/supabase-js 2, framer-motion 12, lucide-react, recharts, date-fns.

## Global Constraints

- `npm run lint` MUST pass with **zero warnings** (`eslint --max-warnings 0` is already the configured script). Every task ends green.
- `npm run build` MUST complete clean. Every task ends green.
- No test runner exists in this repo. Verification = lint + build + the manual checks named in each task, run in `npm run dev`.
- Styling: Tailwind utility classes + the CSS custom properties in `src/index.css` (`var(--ink)`, `var(--accent)`, `var(--surface)`, `var(--r-lg)`, `var(--shadow-md)`, …). Do NOT hardcode palette hex except inside primitives that provide `data-dark` overrides.
- Icons: `lucide-react` only. Never add a different icon package.
- All user-facing copy is Bahasa Indonesia, matching the prototype's wording exactly.
- Currency: `formatCurrency` (full `Rp 1.234.567`) and the new `idrShort` (`Rp 1,4 jt`). Never `Intl` inline.
- Fonts: `font-display` class = Fraunces (headings/big numbers), `tabular-nums`/`font-mono` = JetBrains Mono (all amounts). Already loaded in `index.html`.
- Branch: `redesign/moneyfam-offline` (already created). Commit after every task.
- Do NOT touch `src/hooks/*`, `src/stores/authStore.js`, `src/lib/supabase.js`, or any `supabase/*.sql` except the one new migration file in Task 1.4.
- The prototype's dev-only Tweaks panel, mock data, and hide-balances masking are OUT OF SCOPE — never port them.

## Reference material

- Prototype decompiled sources: `.claude/design/decompiled/0{1..9}-*.jsx`
  - `03-theme.jsx` — `applyTheme`, `shadeColor`, `idr`, `idrShort`, `fmtRelative`, `ACCENT_OPTIONS`
  - `04-ui.jsx` — `Icon`, `Avatar`, `AvatarStack`, `Card`, `Pill`, `Progress`, `Ring`, `Sparkbar`, `Sheet`, `btnStyle`
  - `05-shell.jsx` — `NAV`, `useViewport`, `Logo`, `Sidebar`, `BottomNav`, `TopBar`, `MobileDrawer`
  - `06-pages-core.jsx` — `Dashboard`, `Transactions`, `Wallets`, `Budget`, `Categories`, `TransactionRow`, `WalletCardMini`, `AddTransactionSheet`
  - `07-pages-grow.jsx` — `SavingsDebts`, `Investments`, `Reports`, `PensionCalculator`
  - `08-pages-meta.jsx` — `Notifications`, `Settings`
  - `09-app.jsx` — root wiring, `PAGE_META`
- Full design spec: `docs/superpowers/specs/2026-09-08-moneyfam-redesign-design.md`
- The prototype's full stylesheet (variant + dark palettes) is inline in `.claude/design/MoneyFam (offline).html` between the second `<style>` tag (search `data-variant="ceria"`).

---

## File Structure

**New files**

| Path | Responsibility |
| --- | --- |
| `src/lib/theme.js` | `applyTheme({variant,dark,accent})`, `shadeColor`, `ACCENT_OPTIONS`, `THEME_VARIANTS` |
| `src/lib/memberColor.js` | `memberColor(profile)` → stable hex |
| `src/stores/themeStore.js` | zustand: `{variant,dark,accent}` + setters + `hydrate` |
| `src/components/ui/Icon.jsx` | `<Icon name size strokeWidth className />` → lucide map |
| `src/components/ui/Avatar.jsx` | `Avatar`, `AvatarStack` |
| `src/components/ui/Progress.jsx` | `Progress` bar |
| `src/components/ui/Ring.jsx` | `Ring` SVG donut |
| `src/components/ui/Sparkbar.jsx` | `Sparkbar` mini bar chart |
| `src/components/ui/Pill.jsx` | `Pill` (tone/size/icon) |
| `src/components/ui/StatTile.jsx` | `StatTile` (label + number + pill) |
| `src/components/ui/HeroCard.jsx` | `HeroCard` gradient panel |
| `src/components/ui/Sheet.jsx` | `Sheet` mobile bottom drawer |
| `src/components/ui/SegmentedControl.jsx` | `SegmentedControl` pill-group toggle |
| `src/components/layout/BottomNav.jsx` | mobile bottom nav + center FAB |
| `src/components/layout/MobileDrawer.jsx` | mobile full-nav drawer |
| `src/components/layout/Logo.jsx` | brand mark |
| `src/components/layout/navItems.js` | shared `NAV` array |
| `src/hooks/useViewport.js` | `{ w, isMobile, isTablet, isDesktop, narrow }` |
| `supabase/migration_ui_redesign.sql` | `profiles` columns |

**Modified files**

| Path | Change |
| --- | --- |
| `src/index.css` | radii bump + variant/dark palette blocks + var aliases |
| `tailwind.config.js` | `borderRadius` values, `data-*` variant plugin config |
| `src/lib/utils.js` | add `idrShort`, `fmtRelative` |
| `index.html` | no-flash inline theme script |
| `src/App.jsx` | mount theme hydration |
| `src/stores/authStore.js` | **do not modify** — hydration reads `profile.ui_prefs` from the store selector in `App.jsx` |
| `src/components/ui/Card.jsx` | `tone`/`padding`/`radius` props |
| `src/components/ui/Button.jsx` | `soft` + `dark` variants, `lg` sizing |
| `src/components/ui/Badge.jsx` | dark-mode-safe tone colors |
| `src/components/layout/Sidebar.jsx` | rebuild to prototype |
| `src/components/layout/Header.jsx` | restyle, dynamic month, drop hide-balances |
| `src/components/layout/Layout.jsx` | BottomNav/MobileDrawer wiring, main width |
| `src/pages/*.jsx` (all 15) | rebuild layouts |
| `src/components/**/*Modal.jsx` | restyle to new primitives |

> `authStore.js` is in the "do not modify" list but hydration needs `profile.ui_prefs`. That field already comes back from `fetchProfile`'s `select('*')` once the migration adds the column — no store change needed.

---

## PHASE 1 — Foundations

### Task 1.1: Radii + theme-variant CSS

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

**Interfaces:**
- Produces: CSS custom props scoped by `html[data-variant]` / `html[data-dark]`; Tailwind `rounded-r-lg` = 26px, `rounded-r-xl` = 34px.

- [ ] **Step 1: Update radii in `src/index.css`**

In the `:root` block change:
```css
  --r-lg:        26px;
  --r-xl:        34px;
```
(leave `--r-sm: 12px`, `--r-md: 18px`).

- [ ] **Step 2: Add variant + dark palette blocks to `src/index.css`**

Immediately after the `:root { … }` block, paste (values copied from `.claude/design/MoneyFam (offline).html` — verify against that file):

```css
html[data-variant="ceria"] {
  --bg: #FFFBF7; --bg-sub: #FFF1E6; --surface: #FFFFFF; --surface-2: #FFF6EC;
  --ink: #221A2D; --ink-2: #5A4D6B; --ink-3: #968AA6;
  --line: #F2E6F6; --line-2: #E8D8EE;
  --accent: #8B5CF6; --accent-ink: #6D3FE2; --accent-soft: #EFE6FE;
  --shadow-md: 0 8px 30px -10px rgba(139,92,246,.20), 0 2px 4px rgba(34,26,45,.04);
  --shadow-lg: 0 24px 56px -16px rgba(139,92,246,.30);
}
html[data-variant="studio"] {
  --bg: #F4F4F2; --bg-sub: #EAEAE6; --surface: #FFFFFF; --surface-2: #F8F8F6;
  --ink: #0D0D0D; --ink-2: #4A4A4A; --ink-3: #8C8C8C;
  --line: #E5E5E2; --line-2: #D5D5D1;
  --accent: #16A34A; --accent-ink: #0F7A37; --accent-soft: #DCFCE7;
  --shadow-md: 0 4px 16px -4px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04);
  --shadow-lg: 0 12px 32px -8px rgba(0,0,0,.16);
  --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 28px;
}
html[data-dark="true"] {
  --bg: #14110B; --bg-sub: #1C1812; --surface: #221D14; --surface-2: #2B2519;
  --ink: #F5EFE0; --ink-2: #C2B8A0; --ink-3: #897F68;
  --line: #2F2818; --line-2: #3A3120; --accent-soft: #1B2F2F;
  --shadow-md: 0 8px 32px -8px rgba(0,0,0,.50);
  --shadow-lg: 0 20px 56px -16px rgba(0,0,0,.65);
}
html[data-dark="true"][data-variant="ceria"] {
  --bg: #15101D; --bg-sub: #1D162A; --surface: #241B33; --surface-2: #2D2240;
  --ink: #F5EFFB; --ink-2: #B9ABD0; --ink-3: #8676A0;
  --line: #2D2240; --line-2: #3A2C52; --accent-soft: #2F1E50;
}
html[data-dark="true"][data-variant="studio"] {
  --bg: #0B0B0B; --bg-sub: #131313; --surface: #1A1A1A; --surface-2: #222222;
  --ink: #F5F5F5; --ink-2: #BABABA; --ink-3: #7E7E7E;
  --line: #262626; --line-2: #333333; --accent-soft: #0F2A1A;
}
```

- [ ] **Step 3: Add var aliases + hangat texture to `src/index.css`**

Inside `@layer base`, after the `body` rule, add:
```css
  :root { --display: 'Fraunces', 'Plus Jakarta Sans', serif; --mono: 'JetBrains Mono', ui-monospace, monospace; }
  html[data-variant="hangat"] body::before,
  html:not([data-variant]) body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      radial-gradient(circle at 20% 10%, rgba(217,119,6,.04), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(14,165,164,.05), transparent 40%);
  }
  #root { position: relative; z-index: 1; }
```

- [ ] **Step 4: Update `tailwind.config.js` borderRadius**

```js
      borderRadius: {
        'r-sm': '12px',
        'r-md': '18px',
        'r-lg': '26px',
        'r-xl': '34px',
      },
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: both pass. Then `npm run dev`, open devtools console, run `document.documentElement.setAttribute('data-dark','true')` — page goes dark. Run `document.documentElement.setAttribute('data-variant','ceria')` — surfaces shift violet. Reset both to `''`.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "feat(theme): add variant + dark palettes and bump radii"
```

---

### Task 1.2: `lib/theme.js` + formatters

**Files:**
- Create: `src/lib/theme.js`
- Modify: `src/lib/utils.js`

**Interfaces:**
- Produces:
  - `applyTheme({ variant: string, dark: boolean, accent: string }): void`
  - `shadeColor(hex: string, percent: number): string`
  - `ACCENT_OPTIONS: string[]` (6 hex)
  - `THEME_VARIANTS: [{ id, label, bg, accent }]` for the Settings picker
  - `idrShort(n: number): string`
  - `fmtRelative(iso: string): string`

- [ ] **Step 1: Create `src/lib/theme.js`**

```js
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
  }
}
```

- [ ] **Step 2: Add formatters to `src/lib/utils.js`**

Append:
```js
export function idrShort(n) {
  const v = Math.abs(n || 0)
  const sign = n < 0 ? '-' : ''
  if (v >= 1_000_000_000) return `${sign}Rp ${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (v >= 1_000_000) return `${sign}Rp ${(v / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (v >= 1_000) return `${sign}Rp ${Math.round(v / 1_000)} rb`
  return `${sign}Rp ${Math.round(v)}`
}

export function fmtRelative(dateString) {
  if (!dateString) return '-'
  const dt = new Date(dateString)
  const now = new Date()
  const days = Math.round((now.setHours(0, 0, 0, 0) - new Date(dt).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) return 'Hari ini'
  if (days === 1) return 'Kemarin'
  if (days < 7) return `${days} hari lalu`
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`
  return formatDate(dateString)
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: pass. In `npm run dev` console: `import('/src/lib/utils.js').then(m => console.log(m.idrShort(1_450_000), m.idrShort(850_000_000)))` → `Rp 1,4 jt Rp 850,0 M`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme.js src/lib/utils.js
git commit -m "feat(theme): applyTheme helper + idrShort/fmtRelative formatters"
```

---

### Task 1.3: `themeStore` + no-flash script + App hydration

**Files:**
- Create: `src/stores/themeStore.js`
- Modify: `index.html`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `applyTheme` (1.2), `supabase` client, `useAuthStore`.
- Produces: `useThemeStore` with `{ variant, dark, accent, setVariant(v), setDark(b), setAccent(hex), hydrate(prefs) }`.

- [ ] **Step 1: Create `src/stores/themeStore.js`**

```js
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { applyTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'

const LS_KEY = 'mf_theme'

function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function writeLS(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

const stored = readLS()
const initial = {
  variant: stored.variant || 'hangat',
  dark: typeof stored.dark === 'boolean'
    ? stored.dark
    : (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || false,
  accent: stored.accent || '#0EA5A4',
}

let syncTimer
function syncToProfile(prefs) {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const user = useAuthStore.getState().user
    if (!user?.id) return
    try { await supabase.from('profiles').update({ ui_prefs: prefs }).eq('id', user.id) } catch { /* ignore */ }
  }, 800)
}

export const useThemeStore = create((set, get) => ({
  ...initial,

  _commit(patch) {
    const next = { variant: get().variant, dark: get().dark, accent: get().accent, ...patch }
    set(patch)
    applyTheme(next)
    writeLS(next)
    syncToProfile(next)
  },
  setVariant(variant) { get()._commit({ variant }) },
  setDark(dark) { get()._commit({ dark }) },
  setAccent(accent) { get()._commit({ accent }) },

  hydrate(prefs) {
    if (!prefs || typeof prefs !== 'object') return
    const next = {
      variant: prefs.variant || get().variant,
      dark: typeof prefs.dark === 'boolean' ? prefs.dark : get().dark,
      accent: prefs.accent || get().accent,
    }
    set(next)
    applyTheme(next)
    writeLS(next)
  },
}))

// Apply once on module load so React tree renders with the right vars.
applyTheme(initial)
```

- [ ] **Step 2: Add no-flash script to `index.html`**

Directly before `<div id="root"></div>`:
```html
    <script>
      (function () {
        try {
          var t = JSON.parse(localStorage.getItem('mf_theme') || '{}')
          var r = document.documentElement
          r.setAttribute('data-variant', t.variant || 'hangat')
          r.setAttribute('data-dark', t.dark ? 'true' : 'false')
          if (t.accent) {
            r.style.setProperty('--accent', t.accent)
            r.style.setProperty('--accent-soft', t.accent + '22')
          }
        } catch (e) {}
      })()
    </script>
```

- [ ] **Step 3: Hydrate from profile in `src/App.jsx`**

Inside `AppInitializer`, after the existing `useEffect`, add:
```jsx
  const uiPrefs = useAuthStore((s) => s.profile?.ui_prefs)
  useEffect(() => {
    if (uiPrefs) useThemeStore.getState().hydrate(uiPrefs)
  }, [uiPrefs])
```
Add import: `import { useThemeStore } from '@/stores/themeStore'`.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Then `npm run dev`: in console `useThemeStore` isn't global — instead toggle via a temporary call: open React devtools or run `localStorage.setItem('mf_theme', JSON.stringify({variant:'studio',dark:true,accent:'#F472B6'}))` and reload → loads dark studio with pink accent, no white flash.
Reset: `localStorage.removeItem('mf_theme')` + reload.

- [ ] **Step 5: Commit**

```bash
git add src/stores/themeStore.js index.html src/App.jsx
git commit -m "feat(theme): themeStore with localStorage + profile sync, no-flash boot"
```

---

### Task 1.4: `profiles` migration + `memberColor`

**Files:**
- Create: `supabase/migration_ui_redesign.sql`
- Create: `src/lib/memberColor.js`

**Interfaces:**
- Produces: `memberColor(profile: { id, avatar_color? }): string`

- [ ] **Step 1: Create `supabase/migration_ui_redesign.sql`**

```sql
-- MoneyFam UI redesign: per-member identity + theme prefs.
-- Run in Supabase SQL editor. Safe to re-run.
alter table profiles add column if not exists avatar_color text;
alter table profiles add column if not exists emoji text;
alter table profiles add column if not exists ui_prefs jsonb not null default '{}'::jsonb;
```

- [ ] **Step 2: Create `src/lib/memberColor.js`**

```js
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
```

- [ ] **Step 3: Run the migration**

Tell the user to run `supabase/migration_ui_redesign.sql` in the Supabase dashboard SQL editor before Phase 6. Note it in the task's completion message.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build` → pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_ui_redesign.sql src/lib/memberColor.js
git commit -m "feat: profiles avatar_color/emoji/ui_prefs migration + memberColor util"
```

---

### Task 1.5: `useViewport` hook

**Files:**
- Create: `src/hooks/useViewport.js`

**Interfaces:**
- Produces: `useViewport(): { w, isMobile, isTablet, isDesktop, narrow }` — breakpoints from `05-shell.jsx`: `isMobile` `<700`, `isTablet` `700–1023`, `isDesktop` `>=1024`, `narrow` `<1024`.

- [ ] **Step 1: Create `src/hooks/useViewport.js`**

```js
import { useSyncExternalStore } from 'react'

function subscribe(cb) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}
function getSnapshot() { return window.innerWidth }
function getServerSnapshot() { return 1280 }

export function useViewport() {
  const w = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return {
    w,
    isMobile: w < 700,
    isTablet: w >= 700 && w < 1024,
    isDesktop: w >= 1024,
    narrow: w < 1024,
  }
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build` → pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useViewport.js
git commit -m "feat: useViewport hook"
```

---

## PHASE 2 — Component library

> Each primitive is one task: create file, wire into `npm run dev` via a scratch route OR just build-check, commit. Because there is no test runner, "verify" = lint + build + (where noted) eyeball in an existing page that already imports nothing. Use `.claude/design/decompiled/04-ui.jsx` as the visual spec; convert inline-style objects to Tailwind + `style={{}}` for token vars (Tailwind can't express `var(--accent)` arbitrary values cleanly for every case — `style` is acceptable for color/gradient/radius, Tailwind for layout/spacing).

### Task 2.1: `Icon`

**Files:**
- Create: `src/components/ui/Icon.jsx`

**Interfaces:**
- Produces: `<Icon name={string} size={number=20} strokeWidth={number=1.75} className style />`. Names required (superset of `04-ui.jsx` `paths` keys): `home, swap, wallet, pie, chart, pig, trending, calc, tag, bell, settings, plus, search, menu, x, chevronR, chevronL, chevronD, arrowUp, arrowDown, arrowR, check, eye, eyeOff, filter, moon, sun, target, calendar, upload, download, trash, user, users, sparkles, info, pencil, star, coin, gift, logout, family, heart, book, crown`.

- [ ] **Step 1: Create `src/components/ui/Icon.jsx`**

```jsx
import {
  Home, ArrowLeftRight, Wallet, PieChart, BarChart3, PiggyBank, TrendingUp,
  Calculator, Tag, Bell, Settings, Plus, Search, Menu, X, ChevronRight,
  ChevronLeft, ChevronDown, ArrowUp, ArrowDown, ArrowRight, Check, Eye, EyeOff,
  Filter, Moon, Sun, Target, Calendar, Upload, Download, Trash2, User, Users,
  Sparkles, Info, Pencil, Star, Coins, Gift, LogOut, Users2, Heart, BookOpen, Crown,
} from 'lucide-react'

const MAP = {
  home: Home, swap: ArrowLeftRight, wallet: Wallet, pie: PieChart, chart: BarChart3,
  pig: PiggyBank, trending: TrendingUp, calc: Calculator, tag: Tag, bell: Bell,
  settings: Settings, plus: Plus, search: Search, menu: Menu, x: X,
  chevronR: ChevronRight, chevronL: ChevronLeft, chevronD: ChevronDown,
  arrowUp: ArrowUp, arrowDown: ArrowDown, arrowR: ArrowRight, check: Check,
  eye: Eye, eyeOff: EyeOff, filter: Filter, moon: Moon, sun: Sun, target: Target,
  calendar: Calendar, upload: Upload, download: Download, trash: Trash2, user: User,
  users: Users, sparkles: Sparkles, info: Info, pencil: Pencil, star: Star,
  coin: Coins, gift: Gift, logout: LogOut, family: Users2, heart: Heart,
  book: BookOpen, crown: Crown,
}

export function Icon({ name, size = 20, strokeWidth = 1.75, className, style }) {
  const C = MAP[name]
  if (!C) return null
  return <C size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
}
```

- [ ] **Step 2: Verify** — `npm run lint && npm run build` → pass.
- [ ] **Step 3: Commit** — `git add src/components/ui/Icon.jsx && git commit -m "feat(ui): Icon lucide map"`

---

### Task 2.2: `Avatar` + `AvatarStack`

**Files:**
- Create: `src/components/ui/Avatar.jsx`

**Interfaces:**
- Consumes: `memberColor`, `initialsOf` (1.4).
- Produces:
  - `<Avatar member={{ id, full_name, avatar_color?, emoji? }} size={number=32} className style />`
  - `<AvatarStack members={array} size={number=28} max={number=4} />`
- Note: `member` may be a profile row OR `{ id, full_name }`. If `member.emoji`, render it centered instead of initials.

- [ ] **Step 1: Create the file** using `04-ui.jsx` `Avatar`/`AvatarStack` as the visual spec, substituting: `member.color` → `memberColor(member)`, `member.initials` → `member.emoji || initialsOf(member.full_name)`, `border: '2px solid var(--surface)'` for stack ring, `+N` chip uses `var(--surface-2)`/`var(--ink-2)`. Keep the `boxShadow` inset highlight.

```jsx
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
```

- [ ] **Step 2: Verify** — lint + build pass.
- [ ] **Step 3: Commit** — `git commit -m "feat(ui): Avatar + AvatarStack"`

---

### Task 2.3: `Progress`, `Ring`, `Sparkbar`

**Files:**
- Create: `src/components/ui/Progress.jsx`
- Create: `src/components/ui/Ring.jsx`
- Create: `src/components/ui/Sparkbar.jsx`

**Interfaces:**
- Produces:
  - `<Progress value max={100} color="var(--accent)" height={8} track="var(--surface-2)" />`
  - `<Ring value max={100} size={64} stroke={8} color="var(--accent)" track="var(--surface-2)">{children}</Ring>`
  - `<Sparkbar data={number[]} height={36} color="var(--accent)" track="var(--line)" />`

- [ ] **Step 1:** Port all three verbatim from `04-ui.jsx` (`Progress`, `Ring`, `Sparkbar`) — they are already pure token-var + inline-style; only change `export function` and remove the `Object.assign(window, …)`.
- [ ] **Step 2: Verify** — lint + build pass.
- [ ] **Step 3: Commit** — `git commit -m "feat(ui): Progress, Ring, Sparkbar"`

---

### Task 2.4: `Pill` + `Badge` dark-safety

**Files:**
- Create: `src/components/ui/Pill.jsx`
- Modify: `src/components/ui/Badge.jsx`

**Interfaces:**
- Produces: `<Pill tone="neutral|accent|good|bad|warn" size="sm|md" icon={node}>text</Pill>`

- [ ] **Step 1: Create `src/components/ui/Pill.jsx`**

```jsx
const TONES = {
  neutral: { background: 'var(--surface-2)', color: 'var(--ink-2)' },
  accent:  { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
  good:    { background: 'color-mix(in srgb, var(--good) 16%, var(--surface))', color: 'var(--good)' },
  bad:     { background: 'color-mix(in srgb, var(--bad) 16%, var(--surface))', color: 'var(--bad)' },
  warn:    { background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))', color: 'var(--warn)' },
}

export function Pill({ tone = 'neutral', size = 'md', icon, children, className, style }) {
  const s = size === 'sm' ? { fontSize: 11, padding: '3px 8px' } : { fontSize: 12, padding: '4px 10px' }
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999,
        fontWeight: 600, ...s, ...TONES[tone], ...style,
      }}
    >
      {icon}{children}
    </span>
  )
}
```

- [ ] **Step 2: Make `Badge` dark-safe**

In `src/components/ui/Badge.jsx` replace the `green/red/blue/yellow/purple/orange` entries' hardcoded pastels with `color-mix` against `var(--surface)`:
```js
const variants = {
  green:  { background: 'color-mix(in srgb, #16A34A 16%, var(--surface))', color: '#16A34A' },
  red:    { background: 'color-mix(in srgb, #DC2626 16%, var(--surface))', color: '#DC2626' },
  blue:   { background: 'color-mix(in srgb, #2563EB 16%, var(--surface))', color: '#2563EB' },
  yellow: { background: 'color-mix(in srgb, #D97706 18%, var(--surface))', color: '#D97706' },
  gray:   { background: 'var(--surface-2)', color: 'var(--ink-2)' },
  purple: { background: 'color-mix(in srgb, #7C3AED 16%, var(--surface))', color: '#7C3AED' },
  orange: { background: 'color-mix(in srgb, #EA580C 16%, var(--surface))', color: '#EA580C' },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
}
```
Keep `TransactionTypeBadge` unchanged (it maps to these keys).

- [ ] **Step 3: Verify** — lint + build pass. In `npm run dev` on `/transactions`, existing badges still render; toggle `data-dark` in console → badge text stays readable.
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): Pill + dark-safe Badge tones"`

---

### Task 2.5: `StatTile` + `HeroCard`

**Files:**
- Create: `src/components/ui/StatTile.jsx`
- Create: `src/components/ui/HeroCard.jsx`

**Interfaces:**
- Produces:
  - `<StatTile label={string} value={node} pill={node} accent={bool=false} className />` — accent=true renders white text on `var(--accent)` bg.
  - `<HeroCard label value sub right footer gradientFrom="var(--accent)" gradientTo="var(--accent-ink)" className>{children}</HeroCard>` — gradient panel, two decorative blob circles, `overflow:hidden`, `borderRadius: var(--r-xl)`. `right` sits top-right (e.g. a `Ring`); `footer` renders below `value`; `children` optional extra content.

- [ ] **Step 1: Create `StatTile.jsx`**

```jsx
export function StatTile({ label, value, pill, accent = false, className, style }) {
  return (
    <div
      className={className}
      style={{
        background: accent ? 'var(--accent)' : 'var(--surface)',
        color: accent ? '#fff' : 'var(--ink)',
        border: accent ? 'none' : '1px solid var(--line)',
        borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--shadow-sm)', ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: accent ? 'rgba(255,255,255,.85)' : 'var(--ink-3)' }}>{label}</span>
        {pill}
      </div>
      <div className="font-display tabular-nums" style={{ fontSize: 22, marginTop: 6, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create `HeroCard.jsx`**

```jsx
export function HeroCard({
  label, value, sub, right, footer, children,
  gradientFrom = 'var(--accent)', gradientTo = 'var(--accent-ink)',
  className, style,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative', overflow: 'hidden', color: '#fff',
        borderRadius: 'var(--r-xl)', padding: 28,
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        boxShadow: 'var(--shadow-md)', ...style,
      }}
    >
      <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
      <div style={{ position: 'absolute', right: 40, bottom: -60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {label && <div style={{ fontSize: 12, fontWeight: 600, opacity: .8, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
          <div className="font-display tabular-nums" style={{ fontSize: 44, lineHeight: 1.05 }}>{value}</div>
          {sub && <div style={{ fontSize: 13, opacity: .85, marginTop: 4 }}>{sub}</div>}
          {footer}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Verify** — lint + build pass.
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): StatTile + HeroCard"`

---

### Task 2.6: `SegmentedControl` + `Sheet`

**Files:**
- Create: `src/components/ui/SegmentedControl.jsx`
- Create: `src/components/ui/Sheet.jsx`

**Interfaces:**
- Produces:
  - `<SegmentedControl value={string} onChange={fn} options={[{ id, label, icon? }]} size="sm|md" />` — pill style when `size='sm'` (outlined pills, active = `var(--ink)` bg / `var(--bg)` text); tab style when `size='md'` (inset track, active = `var(--surface)` card).
  - `<Sheet open onClose title fullHeight={bool=false}>{children}</Sheet>` — fixed overlay, bottom drawer, drag handle, slide-up. Locks body scroll while open.

- [ ] **Step 1: Create `SegmentedControl.jsx`**

```jsx
import { Icon } from './Icon'

export function SegmentedControl({ value, onChange, options, size = 'sm', className }) {
  if (size === 'sm') {
    return (
      <div className={className} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--line)', cursor: 'pointer',
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink-2)',
              }}
            >
              {o.icon && <Icon name={o.icon} size={15} />}{o.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className={className} style={{ display: 'inline-flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 16 }}>
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', border: 'none', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {o.icon && <Icon name={o.icon} size={16} />}{o.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `Sheet.jsx`** — port `04-ui.jsx` `Sheet` + its `<style>` keyframes; add `useEffect` that sets `document.body.style.overflow='hidden'` while `open` and restores on cleanup; use `Icon name="x"` for close. Keep `role="dialog" aria-modal="true"`.

- [ ] **Step 3: Verify** — lint + build pass.
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): SegmentedControl + Sheet"`

---

### Task 2.7: `Card`, `Button` evolution

**Files:**
- Modify: `src/components/ui/Card.jsx`
- Modify: `src/components/ui/Button.jsx`

**Interfaces:**
- Produces:
  - `Card` gains `tone="surface|sub|accent"`, `padding={number|string}`, `radius="sm|md|lg|xl"`, `onClick`. Defaults reproduce today's look (`tone='surface'`, `padding` unset → callers use `CardContent`, `radius='lg'`). `CardHeader/Title/Content/Footer` exports unchanged.
  - `Button` gains variants `soft` (bg `var(--accent-soft)`, text `var(--accent-ink)`) and `dark` (bg `var(--ink)`, text `var(--bg)`); `size="lg"` already exists — confirm padding matches prototype (`px-5 py-2.5`).

- [ ] **Step 1: Edit `Card.jsx`** — add the props; when `padding` is provided render children directly in the root `div` with that padding and no header/border-bottom machinery; when absent, keep current behavior. `tone`: `sub` → `background: var(--surface-2); border: none`, `accent` → `background: var(--accent); color: #fff; border: none; boxShadow: var(--shadow-md)`. `radius` maps to `var(--r-{sm,md,lg,xl})`. Keep `rounded-r-lg` class off when `radius` given.

- [ ] **Step 2: Edit `Button.jsx`** — add to `variants` map: `soft: 'focus:ring-2'`, `dark: 'focus:ring-2'`; add cases to the `inlineStyle` switch:
```js
      case 'soft':
        return { background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: 'var(--r-sm)', ...style }
      case 'dark':
        return { background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-sm)', ...style }
```

- [ ] **Step 3: Verify** — lint + build pass. `npm run dev` `/` still renders (Dashboard uses `Card`/`CardHeader` — must be visually unchanged).
- [ ] **Step 4: Commit** — `git commit -m "feat(ui): Card tone/padding/radius props, Button soft/dark variants"`

---

## PHASE 3 — Shell

### Task 3.1: `navItems.js` + `Logo`

**Files:**
- Create: `src/components/layout/navItems.js`
- Create: `src/components/layout/Logo.jsx`

**Interfaces:**
- Produces:
  - `NAV: [{ to, id, label, short, icon, primary? }]` — from `05-shell.jsx` `NAV`, mapped to router paths: dashboard `/`, transactions `/transactions`, wallets `/wallets`, budget `/budget`, savings `/savings`, investments `/investments`, reports `/reports`, pension `/pension`, categories `/categories`, notifications `/notifications`, settings `/settings`. `primary: true` on dashboard/transactions/wallets/budget.
  - `<Logo size={number=36} />` — port `05-shell.jsx` `Logo`.

- [ ] **Step 1:** Create both files.
- [ ] **Step 2: Verify** — lint + build pass.
- [ ] **Step 3: Commit** — `git commit -m "feat(shell): shared nav items + Logo"`

---

### Task 3.2: `Sidebar` rebuild

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

**Interfaces:**
- Consumes: `NAV`, `Logo`, `Avatar`, `AvatarStack`, `Card`, `Icon`, `useAuthStore` (`profile`, `family`, `logout`), `useFamilyMembers`, `useUnreadNotificationsCount`.
- Renders only at `>= lg` (the mobile drawer handles narrow — keep the existing `isOpen`/`onClose` props but the drawer becomes `MobileDrawer` in Task 3.4; for this task keep the current off-canvas behavior working so the app stays usable between tasks).

- [ ] **Step 1:** Rebuild the desktop `<aside>` per `05-shell.jsx` `Sidebar`: brand row (`Logo size={40}` + "MoneyFam" `font-display` + "Keuangan Keluarga"), family `Card tone="sub"` (label "KELUARGA", `family?.name || 'Mode Personal'`, `AvatarStack` of `useFamilyMembers().data`, `chevronD` icon), nav list (`NavLink` to `item.to`, active styling `var(--accent-soft)` / `var(--accent-ink)`, unread badge on notifications from `useUnreadNotificationsCount`), footer (`Avatar` of `profile`, `profile?.full_name`, `profile?.email`, logout button → `useAuthStore.getState().logout()` then `navigate('/login')`).
- [ ] **Step 2:** Keep the existing mobile slide-in markup for now (wrapped in the `lg:hidden` path) so nothing breaks.
- [ ] **Step 3: Verify** — lint + build pass. `npm run dev` desktop 1280: new sidebar renders with real family/member/profile data; every nav link routes; active item highlights. Mobile 375: hamburger still opens the (old) drawer.
- [ ] **Step 4: Commit** — `git commit -m "feat(shell): rebuild desktop Sidebar to prototype"`

---

### Task 3.3: `BottomNav`

**Files:**
- Create: `src/components/layout/BottomNav.jsx`

**Interfaces:**
- Consumes: `NAV` (`.filter(n => n.primary)`), `Icon`, `useLocation`, `useNavigate`.
- Produces: `<BottomNav onAddTransaction={fn} />` — fixed bottom bar, `grid-cols-5`, items = primary[0], primary[1], center FAB, primary[2], primary[3]. FAB calls `onAddTransaction`. Active state from `location.pathname === item.to`. `env(safe-area-inset-bottom)` padding.

- [ ] **Step 1:** Port `05-shell.jsx` `BottomNav` + `NavBtn`; FAB `onClick={onAddTransaction}`; `border: '4px solid var(--bg)'`.
- [ ] **Step 2: Verify** — lint + build pass (not wired yet).
- [ ] **Step 3: Commit** — `git commit -m "feat(shell): BottomNav component"`

---

### Task 3.4: `MobileDrawer` + `Header` + `Layout` wiring

**Files:**
- Create: `src/components/layout/MobileDrawer.jsx`
- Modify: `src/components/layout/Header.jsx`
- Modify: `src/components/layout/Layout.jsx`
- Modify: `src/components/layout/Sidebar.jsx` (strip the now-dead mobile branch)

**Interfaces:**
- `<MobileDrawer open onClose />` — full `NAV` list, backdrop, `slideRight` anim, family card, closes on nav. Consumes same data as Sidebar.
- `Header`: drop the (never-added) hide-balances toggle; keep hamburger (`narrow` only) + title/subtitle + bell. `pageMeta` dashboard subtitle → `` `Halo, ${family?.name || 'Keluarga'} 👋` ``; other subtitles: replace any literal month with `formatMonthYear(new Date().toISOString())` where the prototype shows "Mei 2026" (transactions, budget).
- `Layout`: `useViewport`; `isDesktop` → `<Sidebar />` (no props); `narrow` → `<BottomNav onAddTransaction={() => setTransactionModalOpen(true)} />` + `<MobileDrawer open={drawerOpen} … />` + hamburger opens `drawerOpen`. `main` wrapper `max-w-[1180px] mx-auto`, mobile bottom padding `pb-28`. Remove the old always-on floating `+` FAB (BottomNav FAB replaces it on mobile; Transactions page adds its own desktop FAB in Task 4.2). Keep `TransactionModal` mount.

- [ ] **Step 1:** Create `MobileDrawer.jsx` from `05-shell.jsx` `MobileDrawer`.
- [ ] **Step 2:** Edit `Header.jsx` — remove hide-balances remnants if any, wire dynamic month, keep bell → `/notifications`.
- [ ] **Step 3:** Edit `Layout.jsx` per interface above.
- [ ] **Step 4:** Remove the dead mobile branch from `Sidebar.jsx`; it now returns `null` below `lg` (Layout gates it, but keep a `hidden lg:flex` guard).
- [ ] **Step 5: Verify** — lint + build pass. `npm run dev`:
  - 1280: sidebar only, no bottom nav, page content max-width 1180 centered.
  - 375: bottom nav with 4 items + center FAB (opens transaction modal); hamburger opens full drawer; all 11 links route; no leftover floating FAB.
- [ ] **Step 6: Commit** — `git commit -m "feat(shell): MobileDrawer + BottomNav wiring, restyle Header, Layout"`

---

## PHASE 4 — Core pages

> Pattern for every page task: (1) read the decompiled prototype function, (2) rebuild the page component section-by-section using the real hook data in place of `window.MF.*`, (3) keep existing modals but pass the restyled primitives, (4) lint + build, (5) manual check at 375 + 1280 in light + dark, (6) commit. Data-shape notes below are exact.

### Task 4.1: Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/components/dashboard/RecentTransactions.jsx` (reuse as the recent list, restyle rows) OR inline a `TransactionRow`.

**Interfaces / data:**
- `useWallets()` → `[{ id, name, icon, color, balance, type, is_shared?, ... }]` (confirm field for shared vs personal; prototype uses `scope`. Use `wallet.is_shared` if present else treat all as shared — check `useWallets.js`).
- `useMonthlyStats(y, m)` → `{ income, expense, savings }`.
- `useBudgets(yearMonth)` → budget rows with `amount` + spending; pair with `useCategorySpending(y,m)` for `spent`. Compute `totalBudget = Σ amount`, `totalSpent = Σ matched spending`.
- `useMemberSpending(y, m)` → `[{ userId, name, role, income, expense }]` sorted by expense desc.
- `useDailySpending(y, m)` → `[{ date, amount }]`; build a 14-slot array ending today.
- `useSavingsGoals()` → `[{ id, name, emoji?, target_amount, current_amount, color?, deadline }]`.
- `useRecentTransactions(5)` → tx rows with `categories`, `wallets`, `creator_name`.

- [ ] **Step 1:** Build sections from `06-pages-core.jsx` `Dashboard`:
  1. `HeroCard` label "Total Saldo Keluarga", value `formatCurrency(totalBalance)`, sub `` `${wallets.length} kantong aktif` ``, `children` = the two translucent income/expense mini-tiles (`idrShort`). No eye toggle.
  2. Mobile-only quick-actions rail — render 5 buttons; wire only `Catat` (→ open transaction modal via a prop/callback from Layout or `navigate('/transactions')`), `Anggaran` (→ `/budget`); the rest are visual (`disabled` cursor default, no handler).
  3. Grid: "Sisa Bulan Ini" `Card` (value `formatCurrency(leftToSpend)`, `Progress value={totalSpent} max={totalBudget}`, `Pill` with `%`) + "Pengeluaran 14 Hari" `Card` with `Sparkbar`.
  4. "Pengeluaran per Anggota" `Card`: grid of member tiles (`Avatar` from member profile — map `useMemberSpending` rows to `{ id: userId, full_name: name }`, `Progress` colored `memberColor`). "Detail" → `/reports`.
  5. Grid: "Transaksi Terbaru" `Card` (5 rows) + "Tujuan Keluarga" `Card` (top 3 goals, `Ring` with `emoji || 🎯`, `%`).
  6. Wallet rail: horizontal `scroll-x` of mini wallet cards (`06-pages-core.jsx` `WalletCardMini`).
  - Keep the existing "no profile" / "personal mode" notice blocks at the top.
- [ ] **Step 2:** `npm run lint && npm run build`.
- [ ] **Step 3:** Manual: `/` at 375 + 1280, light + dark + one non-hangat variant. Numbers match the old dashboard's totals. Links route.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Dashboard"`

---

### Task 4.2: Transactions

**Files:**
- Modify: `src/pages/Transactions.jsx`
- Modify: `src/components/transactions/TransactionList.jsx`, `TransactionFilters.jsx` (restyle; or replace usage with new inline sections)
- Modify: `src/components/transactions/TransactionModal.jsx` (restyle only)

**Interfaces / data:**
- `useTransactions(filters, page)` → `{ data, count }`, tx rows include `categories`, `wallets`, `creator_name`, `user_id`, `amount`, `type`, `date`, `description`.
- `useFamilyMembers()` → `[{ id, full_name, role }]`.
- `useCreateTransaction()` mutation — keep TransactionModal's existing call.

- [ ] **Step 1:** Rebuild from `06-pages-core.jsx` `Transactions`:
  1. 3 `StatTile`s (Pemasukan/Pengeluaran/Net) from the current page's data.
  2. Filter `Card`: `SegmentedControl` size `sm` for `all|income|expense` (map to `filters.type`), + member `Avatar` filter row (all + one per `useFamilyMembers`, sets a `memberId` client filter — filter `data` client-side by `user_id` since the hook has no member filter param).
  3. Day-grouped list: group filtered rows by `fmtRelative(date)`, per-group header with day label + expense subtotal (`idrShort`), rows = restyled `TransactionRow` (category emoji tile from `categories.icon`/color, `description`, `creator_name`, `wallets.name`, `fmtRelative`, signed `idrShort`).
  4. Mobile: FAB in `BottomNav` opens `TransactionModal` (already wired via Layout). Desktop: a fixed bottom-right pill-button "Catat Transaksi" that opens `TransactionModal` — render it here (`hidden lg:flex`).
  - Keep pagination controls if the current page has them (restyle).
- [ ] **Step 2:** Restyle `TransactionModal` — swap buttons to `Button`, inputs to `Input`/`Select`, wrap sections; do NOT change its form state or mutation logic.
- [ ] **Step 3:** lint + build.
- [ ] **Step 4:** Manual: create a transaction end-to-end (modal → list updates), filter by member + type, 375 + 1280.
- [ ] **Step 5:** `git commit -m "feat(pages): redesign Transactions + restyle TransactionModal"`

---

### Task 4.3: Wallets

**Files:**
- Modify: `src/pages/Wallets.jsx`
- Modify: `src/components/wallets/WalletCard.jsx`, `WalletModal.jsx`, `TransferModal.jsx` (restyle)

**Interfaces / data:**
- `useWallets()` (+ `useCreateWallet`/`useUpdateWallet`/`useDeleteWallet`), `useTransferBetweenWallets()`, `useTransactions({ wallet_id })` for the detail panel activity.

- [ ] **Step 1:** Rebuild from `06-pages-core.jsx` `Wallets`: 3 tiles (total — `accent` `StatTile`; bersama/pribadi split by shared flag), wallet grid (color-tinted `Card`s, click selects, selected ring), sticky detail panel (icon, type/number, `formatCurrency(balance)`, Transfer → `TransferModal`, Ubah → `WalletModal`, recent activity list). If wallets have no shared/personal concept, show a single "Semua Kantong" tile instead of bersama/pribadi and note it in the commit body.
- [ ] **Step 2:** Restyle the three modals (primitives only).
- [ ] **Step 3:** lint + build.
- [ ] **Step 4:** Manual: select wallets, open transfer + edit, 375 + 1280.
- [ ] **Step 5:** `git commit -m "feat(pages): redesign Wallets + restyle wallet modals"`

---

### Task 4.4: Budget

**Files:**
- Modify: `src/pages/Budget.jsx`
- Modify: `src/components/budget/BudgetCard.jsx`, `BudgetModal.jsx` (restyle)

**Interfaces / data:**
- `useBudgets(yearMonth)`, `useCategorySpending(y, m)`, `useCopyBudgetFromLastMonth()`, CRUD.

- [ ] **Step 1:** Rebuild from `06-pages-core.jsx` `Budget`: `HeroCard` with a `Ring` on the right (`value={totalSpent} max={totalLimit}`, center `%` + "terpakai"), value = `formatCurrency(left)`. Per-category rows: emoji tile, name, `spent / limit` (`idrShort`), `Progress` colored by `getBudgetStatus` (`over`→bad, `warning`→warn, else `cat.color`), "% terpakai" + "Sisa/Lebih X". "Tambah" + "Salin bulan lalu" buttons.
- [ ] **Step 2:** Restyle `BudgetModal`.
- [ ] **Step 3:** lint + build.
- [ ] **Step 4:** Manual: add/edit a budget, copy-from-last-month, over-budget row shows red, 375 + 1280.
- [ ] **Step 5:** `git commit -m "feat(pages): redesign Budget"`

---

### Task 4.5: Categories

**Files:**
- Modify: `src/pages/Categories.jsx`

**Interfaces / data:**
- `useCategories()` → `[{ id, name, icon, color, type }]`, `useCategorySpending(y,m)` for "X bulan ini", CRUD + `useResetCategories`.

- [ ] **Step 1:** Rebuild from `06-pages-core.jsx` `Categories`: 3 sections (expense/income/transfer), each a `Card` with a tinted-chip grid (`color + '15'` bg, emoji tile, name, `idrShort(used)` "bulan ini"), "Tambah" per section. Keep the existing add/edit/delete modal (restyle) + reset action.
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: add/edit/delete a category, 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Categories"`

---

## PHASE 5 — Grow pages

### Task 5.1: Savings & Debts

**Files:**
- Modify: `src/pages/SavingsDebts.jsx`
- Modify: savings/debt modals under `src/components/` (restyle) — locate via `grep -rl "SavingsGoal\|Debt" src/components`.

**Interfaces / data:**
- `useSavingsGoals()` → `[{ id, name, emoji?, color?, target_amount, current_amount, deadline, members? }]`; `useAddToSavingsGoal()`; goal CRUD.
- `useDebts()` → `[{ id, name, creditor, total_amount, paid_amount, monthly_payment, due_day, color? }]`; `usePayDebt()`; debt CRUD; `useDebtPayments(id)`.

- [ ] **Step 1:** Rebuild from `07-pages-grow.jsx` `SavingsDebts`:
  - `SegmentedControl` size `md` tabs `savings|debts`.
  - Savings: `HeroCard` (total `current_amount`, `Progress` to Σ`target_amount`), goal cards grid (`Ring` %, name, `fmtDate(deadline)`, `current/target`, `Progress`, `AvatarStack` if `members`, "Setor" → add-payment modal).
  - Debts: 2 `StatTile`s (sisa = Σ(total-paid), cicilan/bln = Σ monthly), debt cards (`Progress paid/total`, sisa/terbayar%/cicilan, due-day `Pill` tone warn, pay action).
- [ ] **Step 2:** Restyle the modals.
- [ ] **Step 3:** lint + build.
- [ ] **Step 4:** Manual: switch tabs, add a savings payment, record a debt payment, 375 + 1280, dark.
- [ ] **Step 5:** `git commit -m "feat(pages): redesign Savings & Debts"`

---

### Task 5.2: Investments

**Files:**
- Modify: `src/pages/Investments.jsx`
- Modify: investment modal(s) (restyle).

**Interfaces / data:**
- `useInvestments()` → `[{ id, name, broker?, type, quantity, buy_price, current_price, ... }]`; value = `quantity * (current_price || buy_price)`; cost = `quantity * buy_price`; `change = (current-buy)/buy`. `useRefreshCryptoPrices()`, CRUD.

- [ ] **Step 1:** Rebuild from `07-pages-grow.jsx` `Investments`: `HeroCard` (total value, gain `Pill` `+X%`, `Sparkbar` — synthesize a 12-point curve from total or use flat if no history), allocation bar + legend grouped by `type`, holdings list (icon by type, name, `broker · type`, `idrShort(value)`, `change%` good/bad). Keep refresh + CRUD.
- [ ] **Step 2:** Restyle modal(s).
- [ ] **Step 3:** lint + build.
- [ ] **Step 4:** Manual: add/edit an investment, refresh prices, 375 + 1280.
- [ ] **Step 5:** `git commit -m "feat(pages): redesign Investments"`

---

### Task 5.3: Reports

**Files:**
- Modify: `src/pages/Reports.jsx`

**Interfaces / data:**
- `useMonthlyTrend(y, m, 6)` → `[{ label, income, expense }]`; `useReportCategoryDetail(y, m)` → `[{ id, name, icon, color, amount, count }]`; `useMemberSpending(y, m)`; `usePeriodStats(from, to)`; `useDataExport()`.

- [ ] **Step 1:** Rebuild from `07-pages-grow.jsx` `Reports`: period `SegmentedControl` (Minggu/Bulan/Tahun — wire Bulan to current behavior, others best-effort with `usePeriodStats`/`useYearlyStats`), Ekspor button → `useDataExport`. 6-month paired-bar cash-flow chart (plain divs, `07` markup). Donut by category (SVG from `07`, center total). Member-contribution bars (`Avatar` + `Progress`).
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: chart renders with real numbers, export downloads a CSV, 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Reports"`

---

### Task 5.4: Pension

**Files:**
- Modify: `src/pages/PensionCalculator.jsx`

**Interfaces / data:**
- `usePensionSettings()` → saved inputs; `useSavePensionSettings()`; `useInvestments()` for starting balance. Calculation formulas: port verbatim from `07-pages-grow.jsx` `PensionCalculator`.

- [ ] **Step 1:** Rebuild: 2-col (`grid-cols-1 lg:grid-cols-[1fr_1.1fr]`). Left `Card`: 4 range sliders (`accentColor: var(--accent)`) — usia pensiun, kebutuhan bulanan, setoran/bln, asumsi return — + info note. Right: `HeroCard` (green when on-track / amber when not — pass `gradientFrom/To`), projection bar chart, kebutuhan + total setoran tiles. Debounce-save inputs via `useSavePensionSettings`.
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: drag each slider → result recomputes; reload → inputs persisted; 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Pension calculator"`

---

## PHASE 6 — Meta pages

> **Prerequisite:** the user must have run `supabase/migration_ui_redesign.sql`. Confirm before starting Task 6.2.

### Task 6.1: Notifications

**Files:**
- Modify: `src/pages/Notifications.jsx`

**Interfaces / data:**
- `useNotifications(page)` → `[{ id, type, title, message, read, created_at, data }]`; `useMarkNotificationAsRead()`, `useMarkAllNotificationsAsRead()`, `useDeleteNotification()`.

- [ ] **Step 1:** Rebuild from `08-pages-meta.jsx` `Notifications`: `SegmentedControl` `all|unread` (+ count), "Tandai dibaca" button. List rows: colored icon tile (map `type` → emoji + color: `budget_warning`→⚠️ warn, `member`→🛒 accent, `goal`→🎯, `debt`→📅, `system`→💼), title + unread dot, message, kind `Pill`, `fmtRelative(created_at)`, `var(--accent-soft)` tint when unread; click → mark read. Empty state.
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: mark one read, mark all read, filter unread, 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Notifications"`

---

### Task 6.2: Settings + theme controls + member identity

**Files:**
- Modify: `src/pages/Settings.jsx`
- Modify: `src/components/settings/ImportExportSection.jsx`, `DangerZoneSection.jsx` (restyle)

**Interfaces / data:**
- `useThemeStore()` → `{ variant, dark, accent, setVariant, setDark, setAccent }`.
- `THEME_VARIANTS`, `ACCENT_OPTIONS` from `@/lib/theme`.
- `useFamilyMembers`, `useRemoveMember`, `useGenerateInviteCode`, `useJoinFamily`, `useCreateFamily`.
- `useNotificationSettings`, `useUpdateNotificationSettings`.
- Member identity write: `supabase.from('profiles').update({ avatar_color, emoji }).eq('id', memberId)` — **only allowed for the current user's own row** per RLS. So: current user edits their own `avatar_color`/`emoji`; other members show read-only.

- [ ] **Step 1:** Rebuild from `08-pages-meta.jsx` `Settings`:
  1. Profile `Card` (`Avatar` of `profile`, name, `email · role`, Ubah).
  2. **Anggota Keluarga** `Card` — member rows (`Avatar`, name · role, role `Pill`), Undang → invite-code flow (keep existing), remove (owner only).
  3. **Tampilan** `Card` — dark `Toggle` → `setDark`; variant picker (3 `THEME_VARIANTS` cards, active ring, → `setVariant`); accent swatch row (`ACCENT_OPTIONS`, active ring `var(--ink)`, → `setAccent`).
  4. **Identitas Kamu** `Card` — `avatar_color` swatch row + `emoji` text input (maxLength 2), Save → update own profile row, then `useAuthStore.getState().fetchProfile(user.id)`.
  5. **Data & Preferensi** — Ekspor/Impor (restyled `ImportExportSection`), mata uang (static "Rupiah (IDR)"), Notifikasi (link/inline `useNotificationSettings` toggles).
  6. **Zona Berbahaya** (restyled `DangerZoneSection` — hapus semua data, keluar).
  7. Version footer "MoneyFam v2.0 · Dibuat dengan ❤️ untuk keluarga Indonesia".
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: flip dark → whole app re-themes and persists across reload; change variant + accent → persists; set own emoji/color → avatar updates in sidebar; export/import still work; 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(pages): redesign Settings with live theme controls + member identity"`

---

## PHASE 7 — Auth screens + polish

### Task 7.1: Auth screens

**Files:**
- Modify: `src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx`

- [ ] **Step 1:** For each: centered column on `var(--bg)`, a `Card` (`max-w-[400px]`) containing `Logo size={40}` + wordmark, `font-display` heading, the existing form fields swapped to `Input`/`Button` (`variant="primary"` `size="lg"` `full`), links styled `var(--accent-ink)`. **Do not touch** any auth logic, validation, `useAuthStore` calls, or the password-recovery handling in `ResetPassword`.
- [ ] **Step 2:** lint + build.
- [ ] **Step 3:** Manual: log out → login screen restyled; register, forgot-password, and reset-password (open a recovery link) all still function; 375 + 1280.
- [ ] **Step 4:** `git commit -m "feat(auth): restyle Login/Register/Forgot/Reset to new system"`

---

### Task 7.2: Dark-mode + variant audit

**Files:**
- Modify: any file surfaced by the audit.

- [ ] **Step 1:** `grep -rnE "#[0-9A-Fa-f]{6}|rgba?\(" src/pages src/components --include=*.jsx` — for each hit that is NOT (a) inside a primitive with a `data-dark` override, (b) a translucent overlay on a colored base (`+ '15'`, `rgba(255,255,255,…)` on a gradient), or (c) `var(--…)` — replace with the nearest token or a `color-mix(... var(--surface))`.
- [ ] **Step 2:** Click through all 11 pages + auth at 1280 and 375, in: hangat light, hangat dark, ceria dark, studio light. Note any unreadable text / invisible border / white-on-white and fix.
- [ ] **Step 3:** `npm run lint && npm run build`.
- [ ] **Step 4:** `git commit -m "fix: dark-mode + variant color audit across all pages"`

---

### Task 7.3: Cleanup

**Files:**
- Delete: `.claude/design/decompiled/` (optional — keep if useful), `.claude/design/MoneyFam (offline).html`
- Modify: `src/components/dashboard/*` — remove any now-unused components (`KPICard`, old `WalletSummary`, etc.) if nothing imports them (`grep -rl` first).

- [ ] **Step 1:** `grep -rl "KPICard\|IncomeExpenseChart\|CategoryChart\|WalletSummary" src/` — delete files with zero remaining importers.
- [ ] **Step 2:** `npm run lint && npm run build` — the lint step catches unused imports.
- [ ] **Step 3:** Update `README`/`CLAUDE.md` if they describe the old UI (check with `grep -in "dashboard\|lucide\|KPI" CLAUDE.md README.md` — files may not exist).
- [ ] **Step 4:** `git commit -m "chore: remove superseded dashboard components + design bundle"`

---

## Self-Review

**Spec coverage**

| Spec section | Task(s) |
| --- | --- |
| Radii bump | 1.1 |
| Variant + dark palettes | 1.1 |
| `applyTheme` / `shadeColor` / `ACCENT_OPTIONS` | 1.2 |
| `idrShort` / `fmtRelative` | 1.2 |
| `themeStore` (localStorage + profile sync) | 1.3 |
| No-flash inline script | 1.3 |
| Login hydration from `profile.ui_prefs` | 1.3 |
| `profiles` migration (avatar_color/emoji/ui_prefs) | 1.4 |
| `memberColor` | 1.4 |
| `useViewport` | 1.5 |
| Icon map (lucide) | 2.1 |
| Avatar/AvatarStack | 2.2 |
| Progress/Ring/Sparkbar | 2.3 |
| Pill + dark-safe Badge | 2.4 |
| StatTile/HeroCard | 2.5 |
| SegmentedControl/Sheet | 2.6 |
| Card/Button evolution | 2.7 |
| Sidebar rebuild | 3.2 |
| BottomNav + center FAB | 3.3 |
| MobileDrawer | 3.4 |
| Header restyle + dynamic month | 3.4 |
| Layout wiring | 3.4 |
| Dashboard … Settings (11 pages) | 4.1–4.5, 5.1–5.4, 6.1–6.2 |
| Modal restyles | folded into 4.2–4.4, 5.1–5.2 |
| Auth screens | 7.1 |
| Dark-mode audit | 7.2 |
| Out-of-scope items | never referenced ✔ |

**Placeholder scan:** page tasks (Phase 4–6) intentionally reference the decompiled prototype file rather than transcribing 800+ lines of JSX — the prototype is the layout spec and lives in the repo; each such task pins the exact data-shape mapping, the primitives, the responsive rule, and the manual-verification steps. Foundation + component tasks (Phase 1–2) carry complete code. No "TBD"/"handle edge cases"/"add validation" left.

**Type consistency:** `applyTheme({variant,dark,accent})` — same shape in 1.2, 1.3, no-flash script (reads `mf_theme`), themeStore `_commit`. `memberColor(profile)` / `initialsOf(name)` — defined 1.4, consumed 2.2, 4.1. `useViewport()` return keys — defined 1.5, consumed 3.3, 3.4, all pages. `NAV` item shape `{to,id,label,short,icon,primary}` — defined 3.1, consumed 3.2, 3.3, 3.4. `HeroCard` prop names (`label,value,sub,right,footer,gradientFrom,gradientTo`) — defined 2.5, consumed 4.1, 4.4, 5.1, 5.2, 5.4. `SegmentedControl({value,onChange,options,size})` — defined 2.6, consumed 4.2, 5.1, 5.3, 6.1, 6.2.

**Known follow-ups flagged inside tasks:** wallet shared/personal field (4.1, 4.3 — verify against `useWallets.js`, fall back gracefully); Reports week/year periods (5.3 — best-effort); Investments value curve (5.2 — synthetic).
