import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ArrowLeft, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

const RESEND_COOLDOWN = 60

export default function ForgotPassword() {
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN)
    intervalRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || cooldown > 0) return

    if (!email) {
      setError('Email wajib diisi')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Format email tidak valid')
      return
    }
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      // Supabase tidak membocorkan apakah email terdaftar; error di sini
      // umumnya karena rate limit atau format email tidak valid.
      toast.error(resetError.message || 'Gagal mengirim email reset password.')
      return
    }

    setSent(true)
    startCooldown()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 flex items-center justify-center mb-3"
            style={{
              background: 'var(--accent)',
              borderRadius: 18,
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
              color: '#fff',
            }}
          >
            <DollarSign className="w-8 h-8" />
          </div>
          <h1 className="font-display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
            MoneyFam
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>Keuangan Keluarga</p>
        </div>

        <div
          className="p-6"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {!sent ? (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                Lupa password?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--ink-3)' }}>
                Masukkan email akun Anda. Kami akan mengirimkan link untuk mengatur ulang password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Kirim Link Reset
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div
                className="w-14 h-14 flex items-center justify-center"
                style={{ background: 'var(--surface-2)', borderRadius: '50%', color: 'var(--accent-ink)' }}
              >
                <MailCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Periksa email Anda
              </h2>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                Jika <span className="font-medium">{email}</span> terdaftar, kami sudah mengirimkan link untuk mengatur ulang password. Link berlaku sementara — periksa juga folder spam.
              </p>
              <Button
                variant="secondary"
                className="w-full mt-2"
                disabled={cooldown > 0}
                onClick={handleSubmit}
                loading={loading}
              >
                {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang'}
              </Button>
            </div>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold mt-4 hover:underline"
            style={{ color: 'var(--accent-ink)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </div>
  )
}
