import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DollarSign, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { supabase, isPasswordRecovery } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
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
                style={{ background: 'var(--surface-2)', borderRadius: '50%', color: '#DC2626' }}
              >
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Link tidak valid atau kedaluwarsa
              </h2>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                Link reset password ini sudah tidak berlaku. Silakan minta link baru.
              </p>
              <Link to="/forgot-password" className="w-full">
                <Button className="w-full mt-2">Minta Link Baru</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>
                Atur Password Baru
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--ink-3)' }}>
                Masukkan password baru untuk akun Anda.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                    Password Baru <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      autoComplete="new-password"
                      autoFocus
                      className="w-full border pr-10 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{
                        borderRadius: 'var(--r-sm)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        borderColor: errors.password ? '#DC2626' : 'var(--line-2)',
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
                  {errors.password && <p className="text-xs" style={{ color: '#DC2626' }}>{errors.password}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                    Konfirmasi Password <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    className="w-full border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      borderColor: errors.confirmPassword ? '#DC2626' : 'var(--line-2)',
                    }}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs" style={{ color: '#DC2626' }}>{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" loading={loading}>
                  Simpan Password Baru
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
