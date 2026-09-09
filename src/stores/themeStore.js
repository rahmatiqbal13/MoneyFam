import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { applyTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'

const LS_KEY = 'mf_theme_v2'

// One-time cleanup of the superseded key (it always pinned a teal accent).
try { localStorage.removeItem('mf_theme') } catch { /* private mode */ }

function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function writeLS(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

function prefersDark() {
  return (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || false
}

const stored = readLS()
const initial = {
  variant: stored.variant || 'hangat',
  dark: typeof stored.dark === 'boolean' ? stored.dark : prefersDark(),
  accent: stored.accent || null,
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
  setVariant(variant) { get()._commit({ variant, accent: null }) },
  setDark(dark) { get()._commit({ dark }) },
  setAccent(accent) { get()._commit({ accent }) },

  hydrate(prefs) {
    if (!prefs || typeof prefs !== 'object') return
    clearTimeout(syncTimer)
    const next = {
      variant: prefs.variant || get().variant,
      dark: typeof prefs.dark === 'boolean' ? prefs.dark : get().dark,
      accent: (prefs.accent && prefs.accent.toLowerCase() !== '#0ea5a4') ? prefs.accent : null,
    }
    set(next)
    applyTheme(next)
    writeLS(next)
  },

  // Wipe theme back to defaults — used when the signed-in user changes so a
  // shared browser doesn't leak one person's theme into the next session.
  reset() {
    clearTimeout(syncTimer)
    const next = { variant: 'hangat', dark: prefersDark(), accent: null }
    set(next)
    applyTheme(next)
    try { localStorage.removeItem(LS_KEY) } catch { /* private mode */ }
  },
}))

// Apply once on module load so React tree renders with the right vars.
applyTheme(initial)
