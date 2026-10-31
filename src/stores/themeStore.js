import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { applyTheme, THEME_MODES } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'

const LS_KEY = 'mf_theme_v3'

// One-time cleanup of superseded keys (hangat/ceria/studio + accent era).
try { localStorage.removeItem('mf_theme'); localStorage.removeItem('mf_theme_v2') } catch { /* private mode */ }

function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function writeLS(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

function prefersDark() {
  return (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) || false
}

const VALID = new Set(THEME_MODES.map((t) => t.id))
function defaultMode() { return prefersDark() ? 'malam' : 'kertas' }

// Older ui_prefs rows stored { variant, dark, accent }; map them onto the new modes.
function modeFromPrefs(prefs) {
  if (VALID.has(prefs?.mode)) return prefs.mode
  if (typeof prefs?.dark === 'boolean') return prefs.dark ? 'malam' : 'kertas'
  return null
}

const stored = readLS()
const initial = { mode: VALID.has(stored.mode) ? stored.mode : defaultMode() }

let syncTimer
function syncToProfile(prefs) {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const user = useAuthStore.getState().user
    if (!user?.id) return
    try { await supabase.from('profiles').update({ ui_prefs: prefs }).eq('id', user.id) } catch { /* ignore */ }
  }, 800)
}

export const useThemeStore = create((set) => ({
  ...initial,

  setMode(mode) {
    if (!VALID.has(mode)) return
    const next = { mode }
    set(next)
    applyTheme(next)
    writeLS(next)
    syncToProfile(next)
  },

  hydrate(prefs) {
    const mode = modeFromPrefs(prefs)
    if (!mode) return
    clearTimeout(syncTimer)
    const next = { mode }
    set(next)
    applyTheme(next)
    writeLS(next)
  },

  // Wipe theme back to defaults — used when the signed-in user changes so a
  // shared browser doesn't leak one person's theme into the next session.
  reset() {
    clearTimeout(syncTimer)
    const next = { mode: defaultMode() }
    set(next)
    applyTheme(next)
    try { localStorage.removeItem(LS_KEY) } catch { /* private mode */ }
  },
}))

// Apply once on module load so React tree renders with the right vars.
applyTheme(initial)
