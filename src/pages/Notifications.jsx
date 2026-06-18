import { useState } from 'react'
import { Bell, Check, Trash2, AlertCircle, TrendingUp, Calendar, PiggyBank, CreditCard } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications'
import { formatDistanceToNow } from '@/lib/utils'

const typeConfig = {
  budget_warning: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  monthly_report: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
  transaction_alert: { icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50' },
  reminder_daily: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' },
  goal_achieved: { icon: PiggyBank, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  debt_due: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

export default function Notifications() {
  const toast = useToast()
  const { data: notifications, isLoading } = useNotifications()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const deleteNotification = useDeleteNotification()
  const [deleteId, setDeleteId] = useState(null)

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead.mutateAsync(id)
    } catch (err) {
      toast.error('Gagal menandai notifikasi')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync()
      toast.success('Semua notifikasi ditandai telah dibaca')
    } catch (err) {
      toast.error('Gagal menandai notifikasi')
    }
  }

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteNotification.mutateAsync(id)
    },
    { itemName: 'Notifikasi' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  const getTypeConfig = (type) => typeConfig[type] || typeConfig.reminder_daily

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-400">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Tidak ada notifikasi baru'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead} loading={markAllAsRead.isPending}>
            <Check className="w-4 h-4 mr-1.5" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="py-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Belum ada notifikasi</p>
          <p className="text-gray-300 text-sm mt-1">Notifikasi akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const config = getTypeConfig(notification.type)
            const Icon = config.icon
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  notification.is_read ? 'border-gray-100 opacity-75' : 'border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Tandai telah dibaca"
                            aria-label="Tandai telah dibaca"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(notification.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus notifikasi"
                          aria-label="Hapus notifikasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Settings Link */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Kelola pengaturan notifikasi di{' '}
          <a href="/settings" className="text-primary font-medium hover:underline">
            Pengaturan
          </a>
        </p>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Notifikasi"
        message="Yakin ingin menghapus notifikasi ini?"
        loading={deleteNotification.isPending}
      />
    </div>
  )
}
