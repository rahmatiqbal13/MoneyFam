import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DollarSign, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const toast = useToast()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'Email wajib diisi'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Format email tidak valid'
    if (!form.password) errs.password = 'Password wajib diisi'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.success) {
      toast.success('Selamat datang kembali!')
      navigate('/')
    } else {
      toast.error(result.error || 'Login gagal. Cek email dan password.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
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

        {/* Form card */}
        <div
          className="p-6"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ink)' }}>
            Masuk ke akun
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              required
              autoComplete="email"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                  Password <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--accent-ink)' }}
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
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
            <Button type="submit" className="w-full" loading={loading}>
              Masuk
            </Button>
          </form>
          <p className="text-sm text-center mt-4" style={{ color: 'var(--ink-3)' }}>
            Belum punya akun?{' '}
            <Link
              to="/register"
              className="font-semibold hover:underline"
              style={{ color: 'var(--accent-ink)' }}
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
