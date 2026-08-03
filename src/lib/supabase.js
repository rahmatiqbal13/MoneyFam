import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // true: diperlukan agar link reset password (yang membawa token di URL hash) terbaca otomatis.
    detectSessionInUrl: true,
    storageKey: 'moneyfam-supabase-session',
    storage: cookieStorage,
  },
})

// Menandai apakah page load ini berasal dari klik link reset password.
// Didaftarkan segera setelah client dibuat (sebelum kode lain jalan) agar
// event PASSWORD_RECOVERY dari proses deteksi URL awal tidak terlewat.
export let isPasswordRecovery = false
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') isPasswordRecovery = true
})
