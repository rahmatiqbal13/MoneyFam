import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const NOTIFICATIONS_KEY = 'notifications'
const SETTINGS_KEY = 'notification_settings'

export function useNotifications() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })
}

export function useUnreadNotificationsCount() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, user?.id, 'unread'],
    queryFn: async () => {
      if (!user?.id) return 0
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
    },
  })
}

export function useNotificationSettings() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: [SETTINGS_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data || {
        budget_warning: true,
        monthly_report: true,
        transaction_alert: false,
        reminder_daily: false,
        goal_achieved: true,
        debt_due: true,
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (settings) => {
      const { error } = await supabase
        .from('notification_settings')
        .upsert(
          {
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] })
    },
  })
}

export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ family_id, user_id, type, title, message, data }) => {
      // Check user notification settings first
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle()
      
      // If setting exists and is disabled, don't create notification
      if (settings && settings[type] === false) {
        return null
      }
      
      const { error } = await supabase.from('notifications').insert({
        family_id,
        user_id,
        type,
        title,
        message,
        data,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
    },
  })
}

// Helper function to check if notification should be sent
export async function shouldSendNotification(userId, type) {
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (!settings) return true // Default to true if no settings
  return settings[type] !== false
}
