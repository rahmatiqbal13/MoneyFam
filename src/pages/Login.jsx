import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/layout/Logo'
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
          <h1 className="font-display font-extrabold text-[32px] leading-none tracking-tight" style={{ color: 'var(--ink)' }}>
            Masuk
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Masuk ke akun keluarga Anda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => { const value = e.target.value; setForm((f) => ({ ...f, email: value })) }}
            error={errors.email}
            required
            autoComplete="email"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                Password <span style={{ color: 'var(--bad)' }}>*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold hover:underline"
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
                onChange={(e) => { const value = e.target.value; setForm((f) => ({ ...f, password: value })) }}
                autoComplete="current-password"
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
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Masuk
          </Button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: 'var(--ink-3)' }}>
          Belum punya akun?{' '}
          <Link
            to="/register"
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent-ink)' }}
          >
            Daftar sekarang
          </Link>
        </p>
      </Card>
    </div>
  )
}
