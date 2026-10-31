import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// Pesan error Supabase Auth → Bahasa Indonesia
const AUTH_ERRORS = [
  [/invalid login credentials/i, 'Email atau password salah'],
  [/user already registered/i, 'Email sudah terdaftar. Silakan masuk.'],
  [/email not confirmed/i, 'Email belum dikonfirmasi. Cek kotak masuk Anda.'],
  [/password should be at least/i, 'Password minimal 6 karakter'],
  [/rate limit|too many requests/i, 'Terlalu banyak percobaan. Coba lagi beberapa saat.'],
  [/failed to fetch|network/i, 'Tidak dapat terhubung ke server. Periksa koneksi internet.'],
]
// fetchProfile yang sedang berjalan per user: login() dan listener SIGNED_IN
// memanggilnya bersamaan — tanpa ini profile diambil dua kali dan pemulihan
// akun tanpa profile bisa insert ganda (duplicate key).
let profileFetch = null

const translateAuthError = (msg = '') => AUTH_ERRORS.find(([re]) => re.test(msg))?.[1] || msg

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  family: null,
  loading: false,
  initialized: false,
  initError: null,
  // true selama register() berjalan: signUp memicu SIGNED_IN sebelum family &
  // profile dibuat, jadi listener tidak boleh mengisi user lebih awal (yang
  // membuat PublicRoute langsung redirect ke dashboard di tengah setup).
  registering: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setFamily: (family) => set({ family }),

  initialize: async () => {
    // Singleton promise guard: prevent double registration in StrictMode
    if (get().initialized) return () => {}
    set({ loading: true, initError: null })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await get().fetchProfile(session.user.id, session.user)
        set({ user: session.user })
      } else {
        // No session, ensure clean state
        set({ user: null, profile: null, family: null })
      }
    } catch (err) {
      console.error('Auth init error:', err)
      set({ user: null, profile: null, family: null, initError: err.message })
    } finally {
      set({ loading: false, initialized: true })
    }

    // Setup auth state change listener
    // auth-js menjalankan callback ini sambil memegang auth lock. Query Supabase
    // di dalamnya (fetchProfile) butuh lock yang sama untuk membaca token →
    // deadlock: semua query berikutnya menggantung ("Memuat…" selamanya).
    // Jadi pekerjaan dijalankan setelah callback selesai dan lock dilepas.
    const handleAuthEvent = async (event, session) => {
      try {
        if (get().registering) return
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          // Profile dimuat sebelum user diisi: begitu user ada, route guard
          // langsung menampilkan dashboard, dan tanpa profile dashboard sempat
          // menampilkan "Profil belum dibuat".
          await get().fetchProfile(session.user.id, session.user)
          set({ user: session.user })
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, family: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user })
        }
      } catch (err) {
        console.error('Auth state change handler error:', err)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => handleAuthEvent(event, session), 0)
    })

    // Cleanup subscription on re-initialization
    return () => {
      subscription.unsubscribe()
    }
  },

  fetchProfile: (userId, user = get().user) => {
    if (profileFetch?.userId === userId) return profileFetch.promise
    const promise = get().loadProfile(userId, user).finally(() => {
      if (profileFetch?.promise === promise) profileFetch = null
    })
    profileFetch = { userId, promise }
    return promise
  },

  loadProfile: async (userId, user) => {
    try {
      // Fetch profile first
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      // Akun tanpa profile (setup pendaftaran terputus, mis. tab ditutup/reload
      // di tengah register): pulihkan sebagai akun personal agar tetap bisa dipakai.
      if (!profile && !get().registering) {
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna',
            email: user?.email,
            role: 'owner',
          })
          .select()
          .maybeSingle()
        if (createError) throw createError
        set({ profile: created || null, family: null, initError: null })
        return
      }

      // If profile has family_id, fetch family separately
      let family = null
      if (profile?.family_id) {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', profile.family_id)
          .maybeSingle()

        if (!familyError && familyData) {
          family = familyData
        }
      }

      set({ profile: profile || null, family, initError: null })
    } catch (err) {
      console.error('Fetch profile error:', err)
      set({ initError: err.message })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await get().fetchProfile(data.user.id, data.user)
      set({ user: data.user })
      return { success: true }
    } catch (err) {
      return { success: false, error: translateAuthError(err.message) }
    } finally {
      set({ loading: false })
    }
  },

  register: async ({ email, password, fullName, familyName, inviteCode, isPersonal }) => {
    set({ loading: true, registering: true })
    try {
      let family = null

      if (inviteCode) {
        // Mode bergabung: cari family berdasarkan kode undangan
        const { data: rows, error: codeErr } = await supabase.rpc('get_family_by_invite_code', {
          p_code: inviteCode,
        })
        if (codeErr) throw codeErr
        if (!rows || rows.length === 0) throw new Error('Kode undangan tidak valid atau sudah tidak berlaku')
        family = rows[0]
      }

      // Buat akun Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error

      // Supabase mengembalikan session=null jika email confirmation aktif.
      // Tanpa sesi, semua operasi DB selanjutnya akan gagal dengan 401.
      if (!data.session) {
        throw new Error(
          'Konfirmasi email diperlukan. Matikan "Confirm email" di Supabase Dashboard → Authentication → Providers → Email, lalu coba lagi.'
        )
      }

      if (!inviteCode && !isPersonal) {
        // Mode buat keluarga baru
        // UUID dibuat di client agar tidak perlu .select() setelah insert —
        // SELECT akan gagal karena RLS families_select memakai get_user_family_id()
        // yang masih null sebelum profile diinsert dengan family_id.
        const familyId = crypto.randomUUID()
        const { error: familyError } = await supabase
          .from('families')
          .insert({ id: familyId, name: familyName })
        if (familyError) throw familyError
        family = { id: familyId, name: familyName }
      }

      // Buat profile. Bergabung ke keluarga lain wajib lewat RPC — insert
      // profile dengan family_id orang lain diblokir trigger guard di database.
      const profileData = {
        id: data.user.id,
        full_name: fullName,
        email,
        role: inviteCode ? 'member' : 'owner',
      }
      if (family?.id && !inviteCode) profileData.family_id = family.id

      const { error: profileError } = await supabase.from('profiles').insert(profileData)
      if (profileError) throw profileError

      if (inviteCode) {
        const { error: joinError } = await supabase.rpc('join_family_by_invite_code', { p_code: inviteCode })
        if (joinError) throw joinError
      }

      // Seed kategori default untuk keluarga baru
      if (!inviteCode && !isPersonal && family?.id) {
        await supabase.rpc('seed_default_categories', { p_family_id: family.id })
      }

      // Muat profile dulu baru isi user, supaya dashboard tidak sempat tampil
      // dengan user tapi tanpa profile ("Profil belum dibuat")
      await get().fetchProfile(data.user.id, data.user)
      set({ user: data.user, registering: false })
      return { success: true }
    } catch (err) {
      return { success: false, error: translateAuthError(err.message) }
    } finally {
      set({ loading: false, registering: false })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, family: null })
  },
}))
