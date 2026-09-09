# MoneyFam Redesign — Design

**Date:** 2026-09-08
**Source design:** `.claude/design/MoneyFam (offline).html` (Claude Design project `ed453757-971f-499e-b8b0-101808264570`)
**Status:** Approved

## Goal

Bring the full MoneyFam React app in line with the "MoneyFam (offline)" prototype: a
family-first visual redesign of the shell and all 11 in-app pages, plus a real theme
system (3 style variants, dark mode, accent switching). Every screen stays wired to the
existing Supabase / react-query data layer — this is a UI/layout job, not a data job.

## Context

- The app is a Vite + React 18 + Tailwind + Supabase build. Auth via `authStore`
  (zustand), data via `@tanstack/react-query` hooks in `src/hooks/*`.
- The codebase has already partially moved toward this design: `index.css` /
  `tailwind.config.js` carry the warm token palette, fonts are loaded in `index.html`,
  and `Header` / `Layout` already mirror the prototype's TopBar / shell structure.
- Every data hook the prototype needs already exists: `useMemberSpending`,
  `useDailySpending`, `useMonthlyTrend`, `useReportCategoryDetail`, `useSavingsGoals`,
  `useDebts`, `useInvestments`, `usePensionSettings`, etc.
- The prototype is a Babel-in-browser bundle. Its decompiled sources are in
  `.claude/design/decompiled/` (01-mock-data … 09-app) for reference during
  implementation.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Scope | Full redesign — shell + all 11 pages + auth screens, wired to real data |
| Styling | Translate the prototype's inline-style/CSS-var visuals to Tailwind + existing token config |
| Theme features | Dark mode, style variants (hangat/ceria/studio), accent color — all persisted. **No** hide-balances feature. |
| Delivery | One spec, one staged implementation plan with review checkpoints between phases |
| Auth screens | Restyle Login / Register / ForgotPassword / ResetPassword to match |
| Member identity | Add `profiles.avatar_color` + `profiles.emoji` columns + Settings editor |
| Icons | Keep `lucide-react` (already a dependency); map prototype icon names to lucide |
| Theme persistence | `localStorage` fast path (no-flash inline script) + `profiles.ui_prefs` jsonb sync path |
| Components | Evolve existing `src/components/ui/*`; do not introduce a parallel component set |

## Foundations

### Tokens — `src/index.css` + `tailwind.config.js`

- Bump radii to the new prototype scale: `--r-lg` 22 → **26**, `--r-xl` 28 → **34**
  (`--r-sm` 12 and `--r-md` 18 unchanged). Mirror in `tailwind.config.js` `borderRadius`.
- Add the three variant palettes:
  - `:root` — hangat (warm cream), the current default palette, unchanged values.
  - `html[data-variant="ceria"]` — violet accent, lighter surfaces.
  - `html[data-variant="studio"]` — neutral grey, green accent, tighter radii
    (`--r-sm:10 --r-md:14 --r-lg:20 --r-xl:28`).
- Add dark overrides: `html[data-dark="true"]` and
  `html[data-dark="true"][data-variant="ceria"|"studio"]`. Values lifted from the
  prototype stylesheet.
- Add var aliases `--display: 'Fraunces', …` and `--mono: 'JetBrains Mono', …`.
- Keep the hangat-only `body::before` texture overlay, scoped to
  `html[data-variant="hangat"]`.

### `applyTheme` — `src/lib/theme.js` (new)

```
applyTheme({ variant, dark, accent })
  root.setAttribute('data-variant', variant)
  root.setAttribute('data-dark', dark ? 'true' : 'false')
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-soft', accent + '22')
  root.style.setProperty('--accent-ink', shadeColor(accent, -22))
```

Plus `shadeColor(hex, percent)` and `ACCENT_OPTIONS` (6 swatches), ported from the
prototype's `theme.jsx`.

### Formatters — `src/lib/utils.js`

Add, alongside the existing `formatCurrency` / `formatDate*`:

- `idrShort(n)` → `Rp 1,4 jt` / `Rp 2,1 M` / `Rp 450 rb` / `Rp 250`
- `fmtRelative(iso)` → `Hari ini` / `Kemarin` / `3 hari lalu` / `2 minggu lalu` / date

`fmtRelative` uses the real current date (not the prototype's frozen 2026-05-21).

### `src/stores/themeStore.js` (new, zustand)

State `{ variant, dark, accent }`. Actions `setVariant / setDark / setAccent` each:

1. call `applyTheme(next)`
2. write `localStorage.mf_theme` (JSON)
3. debounced `supabase.from('profiles').update({ ui_prefs: next }).eq('id', user.id)`

`hydrate(prefs)` — called after login from `profile.ui_prefs`; updates store +
localStorage without a DB write. Initial store value comes from `localStorage.mf_theme`,
else `{ variant:'hangat', dark: matchMedia('(prefers-color-scheme: dark)').matches,
accent:'#0EA5A4' }`.

### `index.html` inline script

Before `<div id="root">`, a small script (no imports):

```
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
```

Prevents theme flash on load. `--accent-ink` is recomputed by `applyTheme` once the app
mounts (shadeColor needs JS); the brief fallback to the CSS default is acceptable.

### Schema — `supabase/migration_ui_redesign.sql` (new)

```sql
alter table profiles add column if not exists avatar_color text;
alter table profiles add column if not exists emoji text;
alter table profiles add column if not exists ui_prefs jsonb not null default '{}'::jsonb;
```

No RLS change — `profiles` rows are already self-updatable. Run manually in the Supabase
SQL editor, consistent with the existing `supabase/migration_*.sql` files.

## Components — `src/components/ui/`

| Component | Status | Notes |
| --- | --- | --- |
| `Icon` | new | `<Icon name="wallet" size={20} />` → internal map to lucide components. Covers the ~45 names the prototype uses. |
| `Card` | evolve | add props `tone` (`surface` \| `sub` \| `accent`), `padding`, `radius` (`sm`\|`md`\|`lg`\|`xl`). Keep `CardHeader/Title/Content/Footer` exports for not-yet-migrated call sites. |
| `HeroCard` | new | gradient panel (`--accent` → `--accent-ink`), decorative blob circles, `overflow:hidden`, slots for label / big number / footer / right adornment (Ring or Sparkbar). Used by Dashboard, Budget, Savings, Investments, Pension. |
| `StatTile` | new | uppercase label + big `font-display` number + optional `Pill`. The summary-row cards. |
| `Progress` | new | rounded track + fill, `value` / `max` / `color` / `height`. |
| `Ring` | new | SVG donut, `value` / `max` / `size` / `stroke` / `color` / `track`, children centered. |
| `Sparkbar` | new | flex row of bars, `data` array, `color` / `track` / `height`. |
| `Avatar` / `AvatarStack` | new | initials from `full_name`, background = `memberColor(profile)`; stack with `+N` overflow chip and `--surface` ring. |
| `Pill` | new | tone `neutral` \| `accent` \| `good` \| `bad` \| `warn`, sizes `sm` \| `md`, optional leading icon. Shares palette with `Badge`. |
| `Sheet` | new | mobile bottom drawer — backdrop, drag handle, title row, scroll body, slide-up animation. Used for the add-transaction flow on narrow screens. |
| `Button` | evolve | add tones `soft` (accent-soft bg) and `dark` (ink bg); sizes `sm` / `md` / `lg` matching the prototype's `btnStyle`. |
| `SegmentedControl` | new | pill-group toggle. Used for txn filters, report period, savings/debts tabs, notification filter. |
| `Badge` | evolve | add `data-dark` overrides so `good`/`bad`/`warn` stay legible in dark mode (replace hardcoded pastel hex with `color-mix()` against `--surface`, or dark-scoped values). |

`src/lib/memberColor.js` (new): `memberColor(profile)` → `profile.avatar_color` if set,
else a stable pick from the 6-swatch palette keyed by a hash of `profile.id`.

## Shell — `src/components/layout/`

### `Sidebar` (desktop ≥ 1024) — rebuild

Brand (`Logo` + wordmark) → family card (`family.name`, `AvatarStack` of
`useFamilyMembers`, decorative chevron) → 11-item nav (`NavLink`, active state =
`--accent-soft` pill + `--accent-ink` text, notification count badge) → user footer
(`Avatar` of `profile`, name, email, logout button → `authStore.logout`).

### `BottomNav` (new, < 1024)

Fixed bottom bar, `env(safe-area-inset-bottom)` padding. 4 primary items — Beranda,
Transaksi, Kantong, Anggaran — with a raised center FAB between items 2 and 3 that opens
the add-transaction `Sheet` (routes to `/transactions` and signals "open add"). Replaces
the current mobile floating `+` button.

### `MobileDrawer` (new)

Slide-in from the hamburger with the full 11-item nav (the 7 non-primary items live only
here on mobile). Backdrop, `slideRight` animation, closes on nav.

### `Header` — keep structure, restyle

Sticky, blurred `--bg`. Hamburger (narrow only) + subtitle + `font-display` title +
notification bell (accent-aware unread dot). `pageMeta` copy updated to the prototype's
(dynamic month where the prototype hardcodes "Mei 2026"; "Halo, {family.name} 👋" on
dashboard). No hide-balances toggle.

### `Layout` — adjust

`Sidebar` (desktop) vs `BottomNav` + `MobileDrawer` (mobile). `main` max-width 1180,
centered; bottom padding 110 on mobile to clear `BottomNav`. Desktop keeps a
"Catat Transaksi" pill-FAB bottom-right on the Transactions route.

### Route map (unchanged)

`/` `/transactions` `/wallets` `/budget` `/reports` `/savings` `/investments` `/pension`
`/categories` `/notifications` `/settings` — plus the 4 public auth routes.

## Pages

All layouts come from the prototype (`.claude/design/decompiled/0{6,7,8}-*.jsx`). Existing
modals (`TransactionModal`, `WalletModal`, `BudgetModal`, `TransferModal`, savings/debt
modals) are **restyled to the new primitives, not rewritten** — their form logic and
mutations stay.

### Dashboard — `src/pages/Dashboard.jsx`

`HeroCard` (total wallet balance + income / expense mini-tiles for the month) → mobile
quick-actions rail (visual; each button routes only where a real destination exists) →
"Sisa Bulan Ini" card (budget remaining + `Progress`) alongside a 14-day spend
`Sparkbar` → **Pengeluaran per Anggota** card (`Avatar` + `Progress` per member, "Detail"
→ `/reports`) → Recent transactions + Goals (`Ring` per goal) → horizontal wallet rail.

Hooks: `useWallets`, `useMonthlyStats`, `useBudgets`, `useMemberSpending`,
`useDailySpending`, `useSavingsGoals`, `useRecentTransactions`, `authStore`.
Keeps the existing "no profile" / "personal mode" notices.

### Transactions — `src/pages/Transactions.jsx`

3 stat tiles (pemasukan / pengeluaran / net) → `SegmentedControl` (semua / masuk /
keluar) + member `Avatar` filter row → day-grouped list with per-day expense subtotals →
add-transaction `Sheet` on mobile (type toggle, centered amount input, category rail,
wallet `select`, member picker, note) / existing `TransactionModal` on desktop, both
restyled → desktop pill-FAB.

Hooks: `useTransactions`, `useFamilyMembers`, `useCategories`, `useWallets`,
`useCreateTransaction` / `useUpdateTransaction` / `useDeleteTransaction`.

### Wallets — `src/pages/Wallets.jsx`

3 tiles (total — accent card / bersama / pribadi, from wallet `scope`) → responsive
wallet grid (color-tinted cards, click to select, selected ring) + detail panel
(sticky on desktop): icon, type / number, big balance, Transfer + Ubah buttons, recent
activity list for that wallet.

Hooks: `useWallets` (+ CRUD), `useTransactions`, `useTransferBetweenWallets`.

### Budget — `src/pages/Budget.jsx`

`HeroCard` with a `Ring` (sisa bulan + % terpakai) → per-category rows (emoji tile,
name, `spent / limit`, `Progress` colored by status — accent / warn > 85% / bad over,
"% terpakai" + "Sisa/Lebih X") → add/edit via restyled `BudgetModal`, "Salin bulan lalu"
action.

Hooks: `useBudgets` (+ CRUD), `useCategorySpending`, `useCopyBudgetFromLastMonth`.

### Categories — `src/pages/Categories.jsx`

3 sections — Pengeluaran / Pemasukan / Transfer — each a `Card` with a tinted-chip grid
(emoji tile, name, "X bulan ini" usage from `useCategorySpending`) and an add button.
Edit / delete via restyled modal.

Hooks: `useCategories` (+ CRUD), `useCategorySpending`.

### Savings & Debts — `src/pages/SavingsDebts.jsx`

Tab `SegmentedControl`.
- **Tabungan:** `HeroCard` (total terkumpul + `Progress` to total target) → 2-col goal
  cards (`Ring`, name, deadline, `saved / target`, `Progress`, `AvatarStack`,
  "≈ N bln lagi", Setor button → `useAddToSavingsGoal`).
- **Hutang:** 2 tiles (sisa hutang / cicilan per bulan) → debt cards (`Progress`,
  sisa / terbayar % / cicilan, due-date `Pill`, pay action → `usePayDebt`).

Hooks: `useSavingsGoals` (+ payments, CRUD), `useDebts` (+ payments, CRUD).

### Investments — `src/pages/Investments.jsx`

`HeroCard` (total portfolio value + total gain % `Pill` + `Sparkbar` of a value curve) →
allocation bar + legend grouped by investment type → holdings list (icon, name,
broker · type, value, change %). Add / edit / delete + refresh crypto prices.

Hooks: `useInvestments` (+ CRUD), `useRefreshCryptoPrices`.

### Reports — `src/pages/Reports.jsx`

Period `SegmentedControl` (Minggu / Bulan / Tahun) + Ekspor → 6-month cash-flow bar
chart (income vs expense, paired bars) → donut by category (SVG, center total) + legend →
member-contribution bars (`Avatar` + `Progress`).

Hooks: `useMonthlyTrend`, `useReportCategoryDetail`, `useMemberSpending`,
`usePeriodStats`, `useYearlyStats`, `useDataExport`.

### Pension — `src/pages/PensionCalculator.jsx`

2-col (stacked on mobile): inputs `Card` (4 range sliders — usia pensiun, kebutuhan
bulanan, setoran/bulan, asumsi return; assumptions note) + results column (`HeroCard`
on-track / off-track with estimated fund at retirement + surplus/gap, projection bar
chart, kebutuhan / total setoran tiles).

Hooks: `usePensionSettings`, `useSavePensionSettings`, `useInvestments` (starting
balance). Calculation logic from the prototype's `PensionCalculator`.

### Notifications — `src/pages/Notifications.jsx`

`SegmentedControl` (Semua / Belum dibaca · N) + "Tandai dibaca" → list rows (colored icon
tile, title + unread dot, body, kind `Pill`, `fmtRelative` time, `--accent-soft` tint
when unread; click marks read).

Hooks: `useNotifications`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`,
`useDeleteNotification`.

### Settings — `src/pages/Settings.jsx`

Profile card (`Avatar`, name, email · role, Ubah) → **Anggota Keluarga** (member rows
with `Avatar` + role `Pill`, Undang → `useGenerateInviteCode`, remove →
`useRemoveMember`) → **Tampilan** (dark toggle, variant picker cards, accent swatch row —
all bound to `themeStore`) → **Identitas anggota** (avatar_color swatches + emoji input,
writes `profiles.avatar_color` / `emoji`) → **Data & Preferensi** (Ekspor / Impor CSV,
mata uang, notification settings) → **Zona Berbahaya** (hapus semua data, keluar) →
version footer.

Hooks: `useFamilyMembers`, `useRemoveMember`, `useGenerateInviteCode`,
`useDataExport` / `useDataImport`, `useDeleteAllTransactions`, `useNotificationSettings` /
`useUpdateNotificationSettings`, `themeStore`, `authStore`.

## Auth screens

`Login` / `Register` / `ForgotPassword` / `ResetPassword` — centered card on `--bg`,
brand `Logo`, `font-display` heading, `--accent` primary `Button`, evolved `Input`.
Auth / form logic unchanged. Theme defaults apply (no switcher on these routes).

## Testing & rollout

- No test runner in the repo. Verification per phase:
  - `npm run lint` — must pass with **zero warnings** (already enforced via
    `--max-warnings 0`).
  - `npm run build` — must complete clean.
  - Manual click-through of the changed screens in `npm run dev` at 375px and 1280px,
    in light + dark, across all 3 variants, plus one accent change.
- Dark-mode colour audit at the end of every page phase: grep the touched files for
  hardcoded hex / rgba and confirm each is either theme-neutral (translucent tint on a
  coloured base) or has a dark-scoped value.

### Phases (each ends at lint + build + visual checkpoint)

1. **Foundations** — token / variant / dark CSS, `lib/theme.js`, formatters,
   `themeStore`, `index.html` inline script, `migration_ui_redesign.sql`, `memberColor`.
2. **Component library** — `Icon` map, `HeroCard`, `StatTile`, `Progress`, `Ring`,
   `Sparkbar`, `Avatar` / `AvatarStack`, `Pill`, `Sheet`, `SegmentedControl`; evolve
   `Card` / `Button` / `Badge`.
3. **Shell** — `Sidebar`, `BottomNav`, `MobileDrawer`, `Header`, `Layout`.
4. **Core pages** — Dashboard, Transactions, Wallets, Budget, Categories (+ their
   modals).
5. **Grow pages** — Savings & Debts, Investments, Reports, Pension.
6. **Meta pages** — Notifications, Settings (theme controls + member-identity editor).
7. **Auth screens + polish** — restyle the 4 auth routes; final dark-mode audit across
   every touched file.

## Out of scope (YAGNI)

- The prototype's dev-only Tweaks panel and its host `postMessage` protocol.
- The mock "Keluarga Pratama" dataset (`01-mock-data.jsx`) — reference only.
- Hide-balances masking / eye toggles.
- Family switcher behaviour (the sidebar chevron is decorative for now).
- New routes for the dashboard quick-action rail beyond what already exists.
- Any change to the Supabase schema beyond the three `profiles` columns.
- Refactoring hooks / data layer — untouched.
