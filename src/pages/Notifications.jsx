import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Icon } from '@/components/ui/Icon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
  budget_warning:    { emoji: '⚠️', color: '#F59E0B',      label: 'Anggaran',  to: '/budget' },
  monthly_report:    { emoji: '📊', color: '#3B82F6',      label: 'Laporan',   to: '/reports' },
  transaction_alert: { emoji: '🛒', color: '#8B5CF6',      label: 'Transaksi', to: '/transactions' },
  reminder_daily:    { emoji: '🔔', color: 'var(--ink-3)', label: 'Pengingat', to: '/transactions' },
  goal_achieved:     { emoji: '🎯', color: '#16A34A',      label: 'Tujuan',    to: '/savings' },
  debt_due:          { emoji: '📅', color: '#DC2626',      label: 'Hutang',    to: '/savings' },
}

const UNKNOWN = { emoji: '🔔', color: 'var(--ink-3)', label: 'Info', to: null }

const getTypeConfig = (type) => typeConfig[type] || UNKNOWN

const tint = (c) =>
  c.startsWith('#') ? c + '22' : `color-mix(in srgb, ${c} 14%, transparent)`

export default function Notifications() {
  const toast = useToast()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('all')
  const { data: notifData, isLoading } = useNotifications(page)
  const notifications = notifData?.data || []
  const totalCount = notifData?.count || 0
  const totalPages = Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE)
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()
  const deleteNotification = useDeleteNotification()
  const [deleteId, setDeleteId] = useState(null)

  const visible = notifications.filter((n) => filter === 'all' || !n.is_read)

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync()
      toast.success('Semua notifikasi ditandai telah dibaca')
    } catch {
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

  const handleOpenNotification = (n) => {
    if (!n.is_read) {
      try {
        markAsRead.mutate(n.id)
      } catch {
        toast.error('Gagal menandai notifikasi')
      }
    }
    const target = getTypeConfig(n.type).to
    if (target) navigate(target)
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedControl
          size="sm"
          value={filter}
          options={[
            { id: 'all', label: 'Semua' },
            { id: 'unread', label: `Belum dibaca${unreadCount ? ` · ${unreadCount}` : ''}` },
          ]}
          onChange={setFilter}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          loading={markAllAsRead.isPending}
          disabled={!unreadCount}
        >
          <Icon name="check" size={14} />
          Tandai dibaca
        </Button>
      </div>

      <Card padding={8}>
        {isLoading ? (
          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3.5 animate-pulse" style={{ padding: '14px 12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--surface-2)', flexShrink: 0 }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div style={{ height: 12, width: '55%', borderRadius: 6, background: 'var(--surface-2)' }} />
                  <div style={{ height: 10, width: '80%', borderRadius: 6, background: 'var(--surface-2)' }} />
                  <div style={{ height: 10, width: 90, borderRadius: 6, background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
            <Icon name="bell" size={36} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Tidak ada notifikasi.</div>
          </div>
        ) : (
          visible.map((n) => {
            const cfg = getTypeConfig(n.type)
            return (
              <div
                key={n.id}
                onClick={() => handleOpenNotification(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenNotification(n)
                  }
                }}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 12px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  alignItems: 'flex-start',
                  marginBottom: 2,
                  background: n.is_read ? 'transparent' : 'var(--accent-soft)',
                  transition: 'background .15s',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: tint(cfg.color),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  {cfg.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{n.title}</span>
                    {!n.is_read && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink-2)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Pill tone="neutral" size="sm">{cfg.label}</Pill>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatDistanceToNow(n.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteId(n.id)
                  }}
                  title="Hapus notifikasi"
                  aria-label="Hapus notifikasi"
                  style={{
                    flexShrink: 0,
                    padding: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink-3)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )
          })
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Halaman {page + 1} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              aria-label="Halaman sebelumnya"
              style={{
                padding: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-2)',
                borderRadius: 8,
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.3 : 1,
              }}
            >
              <Icon name="chevronL" size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              const active = pageNum === page
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--ink-2)',
                  }}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              aria-label="Halaman berikutnya"
              style={{
                padding: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-2)',
                borderRadius: 8,
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.3 : 1,
              }}
            >
              <Icon name="chevronR" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Settings link */}
      <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
        Kelola pengaturan notifikasi di{' '}
        <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Pengaturan
        </a>
      </p>

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
