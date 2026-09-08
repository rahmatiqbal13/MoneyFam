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
