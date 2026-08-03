import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Bell, Check, Trash2, AlertCircle, Calendar, PiggyBank, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  NOTIFICATIONS_PAGE_SIZE,
} from '@/hooks/useNotifications'
import { formatDistanceToNow } from '@/lib/utils'

const typeConfig = {
  budget_warning: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', to: '/budget' },
  monthly_report: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50', to: '/reports' },
  transaction_alert: { icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-50', to: '/transactions' },
  reminder_daily: { icon: Bell, color: 'text-ink-2', bg: 'bg-surface-2', to: '/transactions' },
  goal_achieved: { icon: PiggyBank, color: 'text-emerald-500', bg: 'bg-emerald-50', to: '/savings' },
  debt_due: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', to: '/savings' },
}

export default function Notifications() {
  const toast = useToast()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [page, setPage] = useState(0)
  const { data: notifData, isLoading } = useNotifications(page)
  const notifications = notifData?.data || []
  const totalCount = notifData?.count || 0
  const totalPages = Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE)
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const deleteNotification = useDeleteNotification()
  const [deleteId, setDeleteId] = useState(null)

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

  const handleOpenNotification = (notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id)
    const target = getTypeConfig(notification.type).to
    if (target) navigate(target)
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Notifikasi</h1>
          <p className="text-sm text-ink-3">
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
            <div key={i} className="bg-surface rounded-xl border border-line p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-2 rounded w-3/4" />
                  <div className="h-3 bg-surface-2 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="py-16 text-center">
          <Bell className="w-12 h-12 text-ink-3 mx-auto mb-3" />
          <p className="text-ink-3 font-medium">Belum ada notifikasi</p>
          <p className="text-ink-3 text-sm mt-1">Notifikasi akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, i) => {
            const config = getTypeConfig(notification.type)
            const Icon = config.icon
            return (
              <motion.div
                key={notification.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.24), ease: 'easeOut' }}
                onClick={() => handleOpenNotification(notification)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenNotification(notification)
                  }
                }}
                className={`bg-surface rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm ${
                  notification.is_read ? 'border-line opacity-75' : 'border-line-2 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${notification.is_read ? 'text-ink-2' : 'text-ink'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-ink-2 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-ink-3 mt-1">
                          {formatDistanceToNow(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="p-1.5 rounded-lg text-ink-3 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Tandai telah dibaca"
                            aria-label="Tandai telah dibaca"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(notification.id)
                          }}
                          className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus notifikasi"
                          aria-label="Hapus notifikasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ink-3">
            Halaman {page + 1} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    pageNum === page ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-ink-2 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Settings Link */}
      <div className="bg-surface-2 rounded-xl border border-line p-4">
        <p className="text-sm text-ink-2">
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
