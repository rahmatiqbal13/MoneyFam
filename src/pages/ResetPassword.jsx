import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { supabase, isPasswordRecovery } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/layout/Logo'
import { useToast } from '@/components/ui/Toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()

  const [checkingLink, setCheckingLink] = useState(true)
  const [linkValid, setLinkValid] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    // isPasswordRecovery hanya true jika page load ini berasal dari link
    // reset password (event PASSWORD_RECOVERY), bukan sekadar sesi login
    // biasa yang kebetulan aktif — mencegah halaman ini dianggap "valid"
    // hanya karena user sudah login dan membuka URL-nya langsung.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ignore) {
        setLinkValid(isPasswordRecovery && !!session)
        setCheckingLink(false)
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  const validate = () => {
    const errs = {}
    if (!form.password) errs.password = 'Password wajib diisi'
    else if (form.password.length < 6) errs.password = 'Password minimal 6 karakter'
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Konfirmasi password tidak cocok'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: form.password })

    if (error) {
      setLoading(false)
      toast.error(error.message || 'Gagal mengatur ulang password.')
      return
    }

    // Tutup sesi recovery — paksa login ulang dengan password baru.
    await supabase.auth.signOut()
    setLoading(false)
    toast.success('Password berhasil diubah. Silakan masuk dengan password baru.')
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <Card className="w-full max-w-[400px]" style={{ padding: 30 }}>
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Logo size={38} />
            <span className="font-display font-extrabold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>
              MoneyFam
            </span>
          </div>
          {!checkingLink && linkValid && (
            <>
              <h1 className="font-display font-extrabold text-[32px] leading-none tracking-tight" style={{ color: 'var(--ink)' }}>
                Password Baru
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
                Masukkan password baru untuk akun Anda.
              </p>
            </>
          )}
        </div>

        {checkingLink ? (
          <div className="flex justify-center py-6">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        ) : !linkValid ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div
              className="w-14 h-14 flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--bad) 15%, transparent)',
                borderRadius: '50%',
                color: 'var(--bad)',
              }}
            >
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Link tidak valid atau kedaluwarsa
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Link reset password ini sudah tidak berlaku. Silakan minta link baru.
            </p>
            <Link to="/forgot-password" className="w-full">
              <Button variant="primary" size="lg" className="w-full mt-2">Minta Link Baru</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                Password Baru <span style={{ color: 'var(--bad)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => { const value = e.target.value; setForm((f) => ({ ...f, password: value })) }}
                  autoComplete="new-password"
                  autoFocus
                  className="w-full border-[1.5px] pr-11 px-3.5 min-h-[50px] text-base placeholder:opacity-60 focus:outline-none focus:border-[var(--ink)]"
                  style={{
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    borderColor: errors.password ? 'var(--bad)' : 'var(--line-2)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: 'var(--bad)' }}>{errors.password}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                Konfirmasi Password <span style={{ color: 'var(--bad)' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ulangi password baru"
                value={form.confirmPassword}
                onChange={(e) => { const value = e.target.value; setForm((f) => ({ ...f, confirmPassword: value })) }}
                autoComplete="new-password"
                className="w-full border px-3 py-2 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2"
                style={{
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  borderColor: errors.confirmPassword ? 'var(--bad)' : 'var(--line-2)',
                }}
              />
              {errors.confirmPassword && (
                <p className="text-xs" style={{ color: 'var(--bad)' }}>{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
              Simpan Password Baru
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
