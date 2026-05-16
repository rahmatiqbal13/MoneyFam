import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const QUERY_KEY = 'categories'

export function useCategories(type) {
  const auth = useAuthStore()
  const family = auth?.family
  const user = auth?.user

  return useQuery({
    queryKey: [QUERY_KEY, family?.id, user?.id, type],
    queryFn: async () => {
      if (!user?.id) return []
      
      let hiddenIds = []
      
      // For family users, get hidden categories
      if (family?.id) {
        const { data: hiddenCategories, error: hiddenError } = await supabase
          .from('hidden_default_categories')
          .select('category_id')
          .eq('family_id', family.id)
        
        if (hiddenError) throw hiddenError
        hiddenIds = hiddenCategories?.map(h => h.category_id) || []
      }
      
      let query = supabase
        .from('categories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })
      
      // Filter by family or user
      if (family?.id) {
        query = query.or(`family_id.eq.${family.id},family_id.is.null`)
      } else {
        // For solo users, get default categories (null family_id) and their own categories
        query = query.or(`family_id.is.null,user_id.eq.${user.id}`)
      }

      if (type) query = query.eq('type', type)

      const { data, error } = await query
      if (error) throw error
      
      // Filter out hidden default categories (only for family users)
      return (data || []).filter(cat => !hiddenIds.includes(cat.id))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  const family = auth?.family
  const user = auth?.user

  return useMutation({
    mutationFn: async (data) => {
      console.log('[CreateCategory] Starting with data:', data)
      console.log('[CreateCategory] User:', user?.id)
      console.log('[CreateCategory] Family:', family?.id)
      
      const insertData = {
        ...data,
        is_default: false,
        user_id: user?.id,
      }
      
      // Add family_id only if user has family
      if (family?.id) {
        insertData.family_id = family.id
      }
      
      console.log('[CreateCategory] Insert data:', insertData)
      
      const { data: result, error } = await supabase
        .from('categories')
        .insert(insertData)
        .select()
      
      if (error) {
        console.error('[CreateCategory] Error:', error)
        throw error
      }
      
      console.log('[CreateCategory] Success:', result)
      return result
    },
    onSuccess: () => {
      console.log('[CreateCategory] onSuccess called')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error) => {
      console.error('[CreateCategory] onError:', error)
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  const family = auth?.family
  const user = auth?.user

  return useMutation({
    mutationFn: async ({ id, originalCategory, ...data }) => {
      console.log('[UpdateCategory] Starting with id:', id, 'data:', data)
      console.log('[UpdateCategory] User:', user?.id)
      console.log('[UpdateCategory] Family:', family?.id)
      
      // Jika kategori default (family_id null), buat salinan baru untuk keluarga
      if (originalCategory?.family_id === null) {
        console.log('[UpdateCategory] Creating copy of default category')
        const insertData = {
          ...data,
          is_default: false,
          user_id: user?.id,
        }
        if (family?.id) {
          insertData.family_id = family.id
        }
        
        const { data: result, error } = await supabase.from('categories').insert(insertData).select()
        if (error) {
          console.error('[UpdateCategory] Insert error:', error)
          throw error
        }
        console.log('[UpdateCategory] Insert success:', result)
        return result
      } else {
        // Update kategori milik user/keluarga secara normal
        console.log('[UpdateCategory] Updating existing category')
        let query = supabase.from('categories').update(data).eq('id', id)
        
        if (!family?.id && user?.id) {
          // Solo user: pastikan hanya update kategori sendiri
          query = query.eq('user_id', user.id)
        } else if (family?.id) {
          // Family user: pastikan hanya update kategori keluarga
          query = query.eq('family_id', family.id)
        }
        
        const { data: result, error } = await query.select()
        if (error) {
          console.error('[UpdateCategory] Update error:', error)
          throw error
        }
        console.log('[UpdateCategory] Update success:', result)
        return result
      }
    },
    onSuccess: () => {
      console.log('[UpdateCategory] onSuccess called')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error) => {
      console.error('[UpdateCategory] onError:', error)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  const family = auth?.family
  const user = auth?.user

  return useMutation({
    mutationFn: async ({ id, isDefault }) => {
      console.log('[DeleteCategory] Starting with id:', id, 'isDefault:', isDefault)
      console.log('[DeleteCategory] User:', user?.id)
      console.log('[DeleteCategory] Family:', family?.id)
      
      if (isDefault && family?.id) {
        // Family user: untuk kategori default, tambahkan ke tabel hidden_default_categories
        console.log('[DeleteCategory] Hiding default category for family')
        const { data, error } = await supabase
          .from('hidden_default_categories')
          .insert({ family_id: family.id, category_id: id })
          .select()
        
        if (error) {
          console.error('[DeleteCategory] Hide error:', error)
          throw error
        }
        console.log('[DeleteCategory] Hide success:', data)
        return data
      } else if (isDefault && !family?.id) {
        // Solo user: untuk kategori default, tidak bisa dihapus
        console.log('[DeleteCategory] Cannot delete default category for solo user')
        throw new Error('Kategori default tidak dapat dihapus. Anda bisa mengabaikannya saja.')
      } else {
        // Untuk kategori custom, hapus secara normal
        console.log('[DeleteCategory] Deleting custom category...')
        
        let query = supabase.from('categories').delete().eq('id', id)
        
        if (!family?.id && user?.id) {
          // Solo user: pastikan hanya hapus kategori sendiri
          console.log('[DeleteCategory] Adding user_id filter for solo user')
          query = query.eq('user_id', user.id)
        } else if (family?.id) {
          // Family user: pastikan hanya hapus kategori keluarga
          console.log('[DeleteCategory] Adding family_id filter for family user')
          query = query.eq('family_id', family.id)
        }
        
        const { data, error } = await query.select()
        
        if (error) {
          console.error('[DeleteCategory] Delete error:', error)
          throw error
        }
        
        console.log('[DeleteCategory] Delete success:', data)
        return data
      }
    },
    onSuccess: () => {
      console.log('[DeleteCategory] onSuccess called')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error) => {
      console.error('[DeleteCategory] onError:', error)
    },
  })
}

export function useResetCategories() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  const family = auth?.family

  return useMutation({
    mutationFn: async () => {
      if (!family?.id) throw new Error('Family required for reset categories')
      
      // Hapus semua kategori custom milik keluarga
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('family_id', family.id)
      if (deleteError) throw deleteError

      // Hapus semua hidden_default_categories untuk keluarga ini
      const { error: hiddenError } = await supabase
        .from('hidden_default_categories')
        .delete()
        .eq('family_id', family.id)
      if (hiddenError) throw hiddenError

      // Seed kategori default lagi
      const { error: seedError } = await supabase
        .rpc('seed_default_categories', { p_family_id: family.id })
      if (seedError) throw seedError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
