import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install MoneyFam</p>
          <p className="text-xs text-gray-500 mt-0.5">Tambahkan ke layar utama untuk akses lebih cepat</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-primary text-white text-xs font-medium py-1.5 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Install
            </button>
            <button
              onClick={() => setShow(false)}
              className="flex-1 text-gray-500 text-xs font-medium py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Nanti
            </button>
          </div>
        </div>
        <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
