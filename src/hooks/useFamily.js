import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const QUERY_KEY = 'family-members'

// Bergabung ke keluarga menggunakan kode undangan (untuk user yang sudah punya akun)
export function useJoinFamily() {
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  return useMutation({
    mutationFn: async (code) => {
      // RPC sekaligus memvalidasi kode & mengisi family_id/role (tidak bisa
      // lewat update profiles langsung — diblokir trigger guard di database)
      const { data: rows, error } = await supabase.rpc('join_family_by_invite_code', {
        p_code: code.trim().toUpperCase(),
      })
      if (error) throw error
      if (!rows || rows.length === 0) throw new Error('Kode undangan tidak valid atau sudah tidak berlaku')
      return rows[0]
    },
    onSuccess: async () => {
      // Add small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchProfile(user.id)
    },
  })
}

// Buat keluarga baru (untuk user yang belum punya keluarga)
export function useCreateFamily() {
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  return useMutation({
    mutationFn: async (familyName) => {
      // Use RPC function to create family (bypasses RLS)
      const { data: familyId, error: rpcError } = await supabase.rpc('create_family', {
        p_name: familyName.trim(),
        p_user_id: user.id
      })
      
      if (rpcError) {
        console.error('Error creating family via RPC:', rpcError)
        throw new Error(`Gagal membuat keluarga: ${rpcError.message}`)
      }

      // Seed kategori default untuk keluarga baru (optional, don't fail if error)
      try {
        const { error: seedError } = await supabase.rpc('seed_default_categories', { p_family_id: familyId })
        if (seedError) {
          console.warn(seedError)
        }
      } catch (seedErr) {
        console.warn(seedErr)
      }

      return { familyId, name: familyName.trim() }
    },
    onSuccess: async () => {
      // Add small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchProfile(user.id)
    },
  })
}

export function useFamilyMembers() {
  const family = useAuthStore((s) => s.family)

  return useQuery({
    queryKey: [QUERY_KEY, family?.id],
    queryFn: async () => {
      if (!family?.id) return []
      const cols = 'id, full_name, email, role, created_at'
      const runQuery = (select) =>
        supabase
          .from('profiles')
          .select(select)
          .eq('family_id', family.id)
          .order('role', { ascending: false })  // owner (o) > member (m) → owner tampil duluan
          .order('created_at', { ascending: true })

      let { data, error } = await runQuery(`${cols}, avatar_color, emoji`)
      // Migrasi avatar_color/emoji mungkin belum diterapkan → fallback tanpa kolom itu.
      if (error && (error.code === '42703' || /column|schema cache/i.test(error.message || ''))) {
        const fallback = await runQuery(cols)
        data = fallback.data
        error = fallback.error
      }
      if (error) throw error
      return data || []
    },
    enabled: !!family?.id,
    staleTime: 1000 * 60,
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId) => {
      // RPC diperlukan karena RLS profiles_update hanya boleh edit profil sendiri
      const { error } = await supabase.rpc('remove_family_member', { member_id: userId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useGenerateInviteCode() {
  const queryClient = useQueryClient()
  const family = useAuthStore((s) => s.family)
  const setFamily = useAuthStore((s) => s.setFamily)

  return useMutation({
    mutationFn: async () => {
      const arr = new Uint8Array(6)
      crypto.getRandomValues(arr)
      const code = Array.from(arr, (b) => (b % 36).toString(36)).join('').toUpperCase()
      const { data, error } = await supabase
        .from('families')
        .update({ invite_code: code })
        .eq('id', family.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setFamily(data)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
