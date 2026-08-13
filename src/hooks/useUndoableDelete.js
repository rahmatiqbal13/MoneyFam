import { useRef, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'

/**
 * Hook untuk menghapus data dengan pola undo.
 * Hapus di DB baru dieksekusi setelah delay (default 5 detik).
 * Jika user menekan "Batalkan" dalam jendela waktu tersebut,
 * penghapusan dibatalkan.
 *
 * Jika komponen unmount saat masih ada pending delete,
 * delete akan dieksekusi segera (safety measure).
 */
export function useUndoableDelete(deleteFn, options = {}) {
  const toast = useToast()
  const timersRef = useRef(new Map())
  const { delay = 5000, itemName = 'Item' } = options

  const triggerDelete = useCallback(
    (id) => {
      // Jangan buat duplicate timer untuk ID yang sama
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id))
      }

      const timer = setTimeout(async () => {
        timersRef.current.delete(id)
        try {
          await deleteFn(id)
          toast.success(`${itemName} berhasil dihapus`)
        } catch (err) {
          toast.error(err.message || `Gagal menghapus ${itemName}`)
        }
      }, delay)

      timersRef.current.set(id, timer)

      toast.info(`${itemName} akan dihapus dalam ${delay / 1000} detik…`, {
        duration: delay + 500,
        action: {
          label: 'Batalkan',
          onClick: () => {
            clearTimeout(timer)
            timersRef.current.delete(id)
            toast.info(`Penghapusan ${itemName} dibatalkan`)
          },
        },
      })
    },
    [deleteFn, delay, itemName, toast]
  )

  // Safety: jika komponen unmount, eksekusi semua pending delete segera
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer)
        deleteFn(id).catch(() => {})
      })
      timers.clear()
    }
  }, [deleteFn])

  return { triggerDelete }
}
