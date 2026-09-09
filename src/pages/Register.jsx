import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Users, Plus, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/layout/Logo'
import { useToast } from '@/components/ui/Toast'

const MODES = [
  { id: 'create', label: 'Buat Keluarga', icon: Plus },
  { id: 'join', label: 'Gabung Keluarga', icon: Users },
  { id: 'personal', label: 'Personal', icon: User },
]

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const toast = useToast()

  const [mode, setMode] = useState('create') // 'create' | 'join' | 'personal'
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    familyName: '',
    inviteCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi'
    if (!form.email) errs.email = 'Email wajib diisi'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Format email tidak valid'
    if (!form.password) errs.password = 'Password wajib diisi'
    else if (form.password.length < 6) errs.password = 'Password minimal 6 karakter'
    if (!form.confirmPassword) errs.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Password tidak cocok'
    if (mode === 'create' && !form.familyName.trim()) errs.familyName = 'Nama keluarga wajib diisi'
    if (mode === 'join' && !form.inviteCode.trim()) errs.inviteCode = 'Kode undangan wajib diisi'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    const result = await register({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      familyName: mode === 'create' ? form.familyName : undefined,
      inviteCode: mode === 'join' ? form.inviteCode.trim().toUpperCase() : undefined,
      isPersonal: mode === 'personal',
    })
    setLoading(false)
    if (result.success) {
      toast.success('Akun berhasil dibuat! Selamat datang di MoneyFam!')
      navigate('/')
    } else {
      toast.error(result.error || 'Pendaftaran gagal. Coba lagi.')
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
  }

  const submitLabel = mode === 'create' ? 'Buat Akun & Keluarga' : mode === 'join' ? 'Gabung Keluarga' : 'Buat Akun Personal'

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <Card className="w-full max-w-[400px]" style={{ padding: 30 }}>
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Logo size={40} />
            <span className="font-display font-semibold text-2xl" style={{ color: 'var(--ink)' }}>
              MoneyFam
            </span>
          </div>
          <h1 className="font-display font-semibold text-xl" style={{ color: 'var(--ink)' }}>
            Buat Akun
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Mulai kelola keuangan bersama keluarga
          </p>
        </div>

        {/* Mode selector */}
        <div
          className="flex overflow-hidden mb-5"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
        >
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
              style={{
                background: mode === id ? 'var(--accent)' : 'transparent',
                color: mode === id ? '#fff' : 'var(--ink-2)',
              }}
              onMouseEnter={(e) => {
                if (mode !== id) e.currentTarget.style.background = 'var(--surface-2)'
              }}
              onMouseLeave={(e) => {
                if (mode !== id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Mode description */}
        {mode === 'personal' && (
          <div
            className="p-3 mb-4"
            style={{
              background: 'var(--accent-soft)',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--accent-ink)' }}>
              Mode personal cocok untuk penggunaan sendiri. Kamu bisa bergabung ke keluarga kapan saja nanti di menu Pengaturan.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            type="text"
            placeholder="Ahmad Rizki"
            value={form.fullName}
            onChange={update('fullName')}
            error={errors.fullName}
            required
          />

          {mode === 'create' && (
            <Input
              label="Nama Keluarga"
              type="text"
              placeholder="Keluarga Bapak Ahmad"
              value={form.familyName}
              onChange={update('familyName')}
              error={errors.familyName}
              required
              helpText="Nama yang akan muncul di dashboard keluarga"
            />
          )}

          {mode === 'join' && (
            <Input
              label="Kode Undangan"
              type="text"
              placeholder="contoh: AB3X7K"
              value={form.inviteCode}
              onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
              error={errors.inviteCode}
              required
              helpText="Minta kode dari pemilik keluarga di menu Pengaturan"
            />
          )}

          <Input
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            required
            autoComplete="email"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
              Password <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                className="w-full border pr-10 px-3 py-2 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2"
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

          <Input
            label="Konfirmasi Password"
            type="password"
            placeholder="Ulangi password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {submitLabel}
          </Button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: 'var(--ink-3)' }}>
          Sudah punya akun?{' '}
          <Link
            to="/login"
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent-ink)' }}
          >
            Masuk di sini
          </Link>
        </p>
      </Card>
    </div>
  )
}
