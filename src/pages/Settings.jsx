import { useState, useEffect } from 'react'
import { User, Bell, Shield, ChevronRight, Save, Users, Copy, RefreshCw, Trash2, Crown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useFamilyMembers, useRemoveMember, useGenerateInviteCode, useJoinFamily, useCreateFamily } from '@/hooks/useFamily'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotifications'
import { ImportExportSection } from '@/components/settings/ImportExportSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        disabled ? 'bg-surface-2 cursor-not-allowed' : checked ? 'bg-primary' : 'bg-surface-2'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        } ${disabled ? 'bg-gray-300' : ''}`}
      />
    </button>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ isOpen, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.current) errs.current = 'Password saat ini wajib diisi'
    if (!form.next) errs.next = 'Password baru wajib diisi'
    else if (form.next.length < 6) errs.next = 'Password minimal 6 karakter'
    if (!form.confirm) errs.confirm = 'Konfirmasi password wajib diisi'
    else if (form.next !== form.confirm) errs.confirm = 'Password tidak cocok'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      // Re-authenticate dulu untuk verifikasi password lama
      const { data: { user } } = await supabase.auth.getUser()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.current,
      })
      if (signInErr) throw new Error('Password saat ini salah')

      // Update password
      const { error } = await supabase.auth.updateUser({ password: form.next })
      if (error) throw error

      toast.success('Password berhasil diubah')
      setForm({ current: '', next: '', confirm: '' })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah password')
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubah Password">
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Password Saat Ini"
            type="password"
            placeholder="Password lama"
            value={form.current}
            onChange={set('current')}
            error={errors.current}
            required
          />
          <Input
            label="Password Baru"
            type="password"
            placeholder="Minimal 6 karakter"
            value={form.next}
            onChange={set('next')}
            error={errors.next}
            required
          />
          <Input
            label="Konfirmasi Password Baru"
            type="password"
            placeholder="Ulangi password baru"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            required
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Ubah Password
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function Settings() {
  const toast = useToast()
  const { user, profile, family, fetchProfile } = useAuthStore()
  const isOwner = profile?.role === 'owner'

  const { data: members, isLoading: membersLoading } = useFamilyMembers()
  const removeMutation = useRemoveMember()
  const generateCode = useGenerateInviteCode()

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    })
  }, [profile])

  const { data: notificationSettings, isLoading: settingsLoading } = useNotificationSettings()
  const updateSettingsMutation = useUpdateNotificationSettings()
  const [notifications, setNotifications] = useState({
    budget_warning: true,
    monthly_report: true,
    transaction_alert: false,
    reminder_daily: false,
    goal_achieved: true,
    debt_due: true,
  })

  // Sync local state with database
  useEffect(() => {
    if (notificationSettings) {
      setNotifications({
        budget_warning: notificationSettings.budget_warning ?? true,
        monthly_report: notificationSettings.monthly_report ?? true,
        transaction_alert: notificationSettings.transaction_alert ?? false,
        reminder_daily: notificationSettings.reminder_daily ?? false,
        goal_achieved: notificationSettings.goal_achieved ?? true,
        debt_due: notificationSettings.debt_due ?? true,
      })
    }
  }, [notificationSettings])

  const handleNotificationChange = async (key, value) => {
    const newSettings = { ...notifications, [key]: value }
    setNotifications(newSettings)
    try {
      await updateSettingsMutation.mutateAsync(newSettings)
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan')
    }
  }

  const joinMutation = useJoinFamily()
  const createFamilyMutation = useCreateFamily()
  const [joinCode, setJoinCode] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [familyTab, setFamilyTab] = useState('create') // 'create' | 'join'

  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState(null)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileForm.full_name.trim()) {
      toast.error('Nama tidak boleh kosong')
      return
    }
    setProfileLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, full_name: profileForm.full_name, phone: profileForm.phone })
      if (error) throw error
      await fetchProfile(user.id)
      toast.success('Profil berhasil diperbarui')
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan profil')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleJoinFamily = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    try {
      await joinMutation.mutateAsync(joinCode)
      toast.success('Berhasil bergabung ke keluarga!')
      setJoinCode('')
    } catch (err) {
      toast.error(err.message || 'Gagal bergabung. Periksa kembali kode undangan.')
    }
  }
  const handleCreateFamily = async (e) => {
    e.preventDefault()
    if (!newFamilyName.trim()) return
    try {
      const result = await createFamilyMutation.mutateAsync(newFamilyName)

      toast.success('Keluarga berhasil dibuat!')
      setNewFamilyName('')
    } catch (err) {
      console.error('Error creating family:', err)
      toast.error(err.message || 'Gagal membuat keluarga')
    }
  }
  const handleCopyCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code).then(() => {
        toast.success('Kode disalin ke clipboard')
      })
    }
  }

  const handleGenerateCode = async () => {
    try {
      await generateCode.mutateAsync()
      toast.success('Kode undangan baru dibuat')
    } catch (err) {
      toast.error(err.message || 'Gagal membuat kode')
    }
  }

  const handleRemoveMember = async () => {
    try {
      await removeMutation.mutateAsync(removeMemberId)
      toast.success('Anggota berhasil dikeluarkan')
      setRemoveMemberId(null)
    } catch (err) {
      toast.error(err.message || 'Gagal mengeluarkan anggota')
    }
  }

  const memberToRemove = members?.find((m) => m.id === removeMemberId)

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Zombie account warning */}
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Profil belum dibuat</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Isi nama lengkap di bawah lalu klik Simpan Profil, kemudian buat atau bergabung ke keluarga untuk menggunakan semua fitur.
            </p>
          </div>
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-ink-2" />
            <CardTitle>Profil</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-ink">{profile?.full_name || 'User'}</p>
                <p className="text-sm text-ink-3">{user?.email}</p>
                {family && (
                  <p className="text-xs text-ink-3 mt-0.5">
                    {family.name} ·{' '}
                    <span className={isOwner ? 'text-amber-600 font-medium' : 'text-ink-3'}>
                      {isOwner ? 'Pemilik' : 'Anggota'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <Input
              label="Nama Lengkap"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              helpText="Email tidak dapat diubah"
            />
            <Input
              label="Nomor HP (opsional)"
              type="tel"
              placeholder="+62812345678"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
            <Button type="submit" loading={profileLoading} size="sm">
              <Save className="w-4 h-4" />
              Simpan Profil
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Family Members — hanya tampil jika user sudah punya keluarga */}
      {family && <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-ink-2" />
            <CardTitle>Anggota Keluarga</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-2 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(members || []).map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(m.full_name || m.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-ink truncate">{m.full_name}</p>
                      {m.role === 'owner' && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-ink-3 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.role === 'owner'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-surface-2 text-ink-2'
                    }`}>
                      {m.role === 'owner' ? 'Pemilik' : 'Anggota'}
                    </span>
                    {isOwner && m.id !== user?.id && (
                      <button
                        onClick={() => setRemoveMemberId(m.id)}
                        className="p-1.5 rounded-lg text-ink-3 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Keluarkan anggota"
                        aria-label="Keluarkan anggota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      {/* Keluarga — tampil jika user belum punya keluarga */}
      {!family && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-2" />
              <CardTitle>Bergabung / Buat Keluarga</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex rounded-lg border border-line overflow-hidden mb-4">
              {[
                { key: 'create', label: 'Buat Keluarga Baru' },
                { key: 'join', label: 'Bergabung dengan Kode' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFamilyTab(key)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    familyTab === key ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {familyTab === 'create' ? (
              <form onSubmit={handleCreateFamily} className="space-y-3">
                <p className="text-sm text-ink-2">Buat keluarga baru — Anda akan menjadi pemilik dan bisa mengundang anggota lain.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama keluarga, misal: Keluarga Budi"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                  />
                  <Button type="submit" loading={createFamilyMutation.isPending} disabled={!newFamilyName.trim()}>
                    Buat
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinFamily} className="space-y-3">
                <p className="text-sm text-ink-2">Masukkan kode undangan dari pemilik keluarga.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Contoh: AB3X7K"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <Button type="submit" loading={joinMutation.isPending} disabled={!joinCode.trim()}>
                    Gabung
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bergabung dengan kode — untuk member yang sudah punya keluarga */}
      {family && !isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-2" />
              <CardTitle>Bergabung ke Keluarga Lain</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-2 mb-3">
              Masukkan kode undangan untuk pindah ke keluarga lain.
              <span className="block mt-1 text-xs text-amber-600">
                Akun Anda akan dipindahkan dari keluarga saat ini.
              </span>
            </p>
            <form onSubmit={handleJoinFamily} className="flex gap-2">
              <Input
                placeholder="Contoh: AB3X7K"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <Button type="submit" loading={joinMutation.isPending} disabled={!joinCode.trim()}>
                Gabung
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invite Code — owner only */}
      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-ink-2" />
              <CardTitle>Kode Undangan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-2 mb-4">
              Bagikan kode ini agar anggota keluarga bisa bergabung saat mendaftar.
            </p>

            {family?.invite_code ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-surface-2 border border-line rounded-xl px-4 py-3 text-center">
                  <span className="text-2xl font-bold tracking-[0.3em] text-ink font-mono">
                    {family.invite_code}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopyCode}>
                  <Copy className="w-4 h-4" />
                  Salin
                </Button>
              </div>
            ) : (
              <div className="bg-surface-2 border border-dashed border-line-2 rounded-xl px-4 py-4 text-center mb-4">
                <p className="text-sm text-ink-3">Belum ada kode undangan</p>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateCode}
              loading={generateCode.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              {family?.invite_code ? 'Buat Kode Baru' : 'Buat Kode Undangan'}
            </Button>

            {family?.invite_code && (
              <p className="text-xs text-ink-3 mt-2">
                Membuat kode baru akan menonaktifkan kode lama.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-ink-2" />
            <CardTitle>Notifikasi</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'budget_warning', label: 'Peringatan Anggaran', desc: 'Notifikasi saat anggaran hampir habis (80%)' },
              { key: 'monthly_report', label: 'Laporan Bulanan', desc: 'Ringkasan keuangan di akhir bulan' },
              { key: 'transaction_alert', label: 'Alert Transaksi Besar', desc: 'Notifikasi untuk transaksi di atas batas tertentu' },
              { key: 'reminder_daily', label: 'Pengingat Harian', desc: 'Pengingat untuk mencatat transaksi hari ini' },
              { key: 'goal_achieved', label: 'Target Tercapai', desc: 'Notifikasi saat target tabungan tercapai' },
              { key: 'debt_due', label: 'Jatuh Tempo Hutang', desc: 'Peringatan hutang yang akan jatuh tempo' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-3">{item.desc}</p>
                </div>
                <ToggleSwitch
                  checked={notifications[item.key]}
                  onChange={(val) => handleNotificationChange(item.key, val)}
                  disabled={settingsLoading || updateSettingsMutation.isPending}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs text-ink-3">
              Notifikasi akan muncul di dalam aplikasi. Push notification akan segera hadir.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-ink-2" />
            <CardTitle>Keamanan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <button
              className="flex items-center justify-between w-full py-3 px-1 rounded-lg hover:bg-surface-2 transition-colors text-left"
              onClick={() => setChangePasswordOpen(true)}
            >
              <div>
                <p className="text-sm font-medium text-ink">Ubah Password</p>
                <p className="text-xs text-ink-3">Ganti password akun kamu</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0" />
            </button>
            {[
              { label: 'Autentikasi 2 Faktor', desc: 'Tambah lapisan keamanan ekstra' },
              { label: 'Sesi Aktif', desc: 'Kelola perangkat yang login' },
            ].map((item) => (
              <button
                key={item.label}
                className="flex items-center justify-between w-full py-3 px-1 rounded-lg hover:bg-surface-2 transition-colors text-left"
                onClick={() => toast.info(`Fitur "${item.label}" segera hadir`)}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-3">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import & Export */}
      <ImportExportSection />

      {/* Danger Zone — hanya pemilik keluarga (atau akun personal) yang boleh menghapus semua data */}
      {isOwner && <DangerZoneSection />}

      {/* App info */}
      <div className="text-center py-4">
        <p className="text-xs text-ink-3">MoneyFam v0.1.0 · Family Finance Tracker</p>
      </div>

      {/* Modals */}
      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <ConfirmModal
        isOpen={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title="Keluarkan Anggota"
        message={`Yakin ingin mengeluarkan ${memberToRemove?.full_name || 'anggota ini'} dari keluarga? Mereka tidak bisa lagi mengakses data keluarga.`}
        confirmLabel="Keluarkan"
        loading={removeMutation.isPending}
      />
    </div>
  )
}
