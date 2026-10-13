import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  family: null,
  loading: false,
  initialized: false,
  initError: null,

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
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user })
          await get().fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, family: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user })
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          set({ user: session.user })
          await get().fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Auth state change handler error:', err)
      }
    })

    // Cleanup subscription on re-initialization
    return () => {
      subscription.unsubscribe()
    }
  },

  fetchProfile: async (userId) => {
    try {
      // Fetch profile first
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

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
      set({ user: data.user })
      await get().fetchProfile(data.user.id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ loading: false })
    }
  },

  register: async ({ email, password, fullName, familyName, inviteCode, isPersonal }) => {
    set({ loading: true })
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

      set({ user: data.user, family })
      await get().fetchProfile(data.user.id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, family: null })
  },
}))
