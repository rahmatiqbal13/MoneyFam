import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DollarSign, Eye, EyeOff, Users, Plus, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MoneyFam</h1>
          <p className="text-sm text-gray-500 mt-1">Family Finance Tracker</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buat akun baru</h2>

          {/* Mode selector */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  mode === id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Mode description */}
          {mode === 'personal' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700">
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
              <label className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={update('password')}
                  className={`w-full rounded-lg border pr-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <Input
              label="Konfirmasi Password"
              type="password"
              placeholder="Ulangi password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              error={errors.confirmPassword}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              {submitLabel}
            </Button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
