import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pill } from '@/components/ui/Pill'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { THEME_VARIANTS, ACCENT_OPTIONS } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { useFamilyMembers, useRemoveMember, useGenerateInviteCode, useJoinFamily, useCreateFamily } from '@/hooks/useFamily'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotifications'
import { ImportExportSection } from '@/components/settings/ImportExportSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'

// 10-color identity palette (mirrors the memberColor fallback palette).
const IDENTITY_COLORS = [...ACCENT_OPTIONS, '#EF4444', '#10B981', '#F97316', '#3B82F6']

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 'none', flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--accent)' : 'var(--line-2)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative', transition: 'background .2s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20,
          borderRadius: '50%', background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }}
      />
    </button>
  )
}

function SectionTitle({ icon, iconColor, children }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <Icon name={icon} size={18} style={{ color: iconColor || 'var(--accent)' }} />}
      <h3 className="m-0 text-base font-bold" style={{ color: 'var(--ink)' }}>{children}</h3>
    </div>
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
  const navigate = useNavigate()
  const { user, profile, family, fetchProfile, logout } = useAuthStore()
  const isOwner = profile?.role === 'owner'

  const { variant, dark, accent, setVariant, setDark, setAccent } = useThemeStore()

  const { data: members, isLoading: membersLoading } = useFamilyMembers()
  const removeMutation = useRemoveMember()
  const generateCode = useGenerateInviteCode()

  const [editingProfile, setEditingProfile] = useState(!profile)
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

  // ── Member identity (own row) ──
  const [colorDraft, setColorDraft] = useState(profile?.avatar_color || '')
  const [emojiDraft, setEmojiDraft] = useState(profile?.emoji || '')
  const [identityLoading, setIdentityLoading] = useState(false)

  useEffect(() => {
    setColorDraft(profile?.avatar_color || '')
    setEmojiDraft(profile?.emoji || '')
  }, [profile])

  const handleSaveIdentity = async () => {
    setIdentityLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_color: colorDraft || null, emoji: emojiDraft || null })
        .eq('id', user.id)
      if (error) throw error
      await useAuthStore.getState().fetchProfile(user.id)
      toast.success('Identitas kamu berhasil disimpan')
    } catch (err) {
      const msg = err?.message || ''
      toast.error(/column|does not exist|schema cache/i.test(msg)
        ? 'Jalankan migrasi database dulu'
        : (msg || 'Gagal menyimpan identitas'))
    } finally {
      setIdentityLoading(false)
    }
  }

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
      setEditingProfile(false)
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
      await createFamilyMutation.mutateAsync(newFamilyName)

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

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Gagal keluar')
    }
  }

  const memberToRemove = members?.find((m) => m.id === removeMemberId)
  const roleLabel = (role) => (role === 'owner' ? 'Pemilik' : 'Anggota')

  return (
    <div className="flex flex-col gap-4 mx-auto" style={{ maxWidth: 720 }}>
      {/* Zombie account warning */}
      {!profile && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'color-mix(in srgb, var(--warn) 12%, var(--surface))', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)' }}>
          <span className="text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Profil belum dibuat</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
              Isi nama lengkap di bawah lalu klik Simpan Profil, kemudian buat atau bergabung ke keluarga untuk menggunakan semua fitur.
            </p>
          </div>
        </div>
      )}

      {/* Profile */}
      <Card padding={20}>
        <div className="flex items-center gap-4">
          <Avatar member={profile || { full_name: user?.email || 'U' }} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold truncate" style={{ color: 'var(--ink)' }}>
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[13px] truncate" style={{ color: 'var(--ink-3)' }}>
              {user?.email}
              {family && <> · {isOwner ? 'Pemilik' : 'Anggota'} {family.name}</>}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingProfile((v) => !v)}>
            <Icon name="pencil" size={14} />
            {editingProfile ? 'Tutup' : 'Ubah'}
          </Button>
        </div>

        {editingProfile && (
          <form onSubmit={handleSaveProfile} className="space-y-4 mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
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
              <Icon name="check" size={16} />
              Simpan Profil
            </Button>
          </form>
        )}
      </Card>

      {/* Family Members — hanya tampil jika user sudah punya keluarga */}
      {family && (
        <Card padding={20}>
          <div className="flex items-center justify-between mb-3.5">
            <SectionTitle icon="family">Anggota Keluarga</SectionTitle>
          </div>
          {membersLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {(members || []).map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2.5 px-1.5">
                  <Avatar member={m} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{m.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Pill tone={m.role === 'owner' ? 'accent' : 'neutral'} size="sm">
                      {roleLabel(m.role)}
                    </Pill>
                    {isOwner && m.id !== user?.id && (
                      <button
                        onClick={() => setRemoveMemberId(m.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--ink-3)' }}
                        title="Keluarkan anggota"
                        aria-label="Keluarkan anggota"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Keluarga — tampil jika user belum punya keluarga */}
      {!family && (
        <Card padding={20}>
          <div className="mb-3.5">
            <SectionTitle icon="family">Bergabung / Buat Keluarga</SectionTitle>
          </div>
          <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--line)' }}>
            {[
              { key: 'create', label: 'Buat Keluarga Baru' },
              { key: 'join', label: 'Bergabung dengan Kode' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFamilyTab(key)}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={familyTab === key
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--ink-2)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {familyTab === 'create' ? (
            <form onSubmit={handleCreateFamily} className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Buat keluarga baru — Anda akan menjadi pemilik dan bisa mengundang anggota lain.</p>
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
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Masukkan kode undangan dari pemilik keluarga.</p>
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
        </Card>
      )}

      {/* Bergabung dengan kode — untuk member yang sudah punya keluarga */}
      {family && !isOwner && (
        <Card padding={20}>
          <div className="mb-3.5">
            <SectionTitle icon="family">Bergabung ke Keluarga Lain</SectionTitle>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>
            Masukkan kode undangan untuk pindah ke keluarga lain.
            <span className="block mt-1 text-xs" style={{ color: 'var(--warn)' }}>
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
        </Card>
      )}

      {/* Invite Code — owner only */}
      {isOwner && (
        <Card padding={20}>
          <div className="mb-3.5">
            <SectionTitle icon="users">Kode Undangan</SectionTitle>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-2)' }}>
            Bagikan kode ini agar anggota keluarga bisa bergabung saat mendaftar.
          </p>

          {family?.invite_code ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <span className="text-2xl font-bold tracking-[0.3em] font-mono" style={{ color: 'var(--ink)' }}>
                  {family.invite_code}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyCode}>
                <Icon name="check" size={16} />
                Salin
              </Button>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-4 text-center mb-4" style={{ background: 'var(--surface-2)', border: '1px dashed var(--line-2)' }}>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Belum ada kode undangan</p>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateCode}
            loading={generateCode.isPending}
          >
            <Icon name="sparkles" size={16} />
            {family?.invite_code ? 'Buat Kode Baru' : 'Buat Kode Undangan'}
          </Button>

          {family?.invite_code && (
            <p className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
              Membuat kode baru akan menonaktifkan kode lama.
            </p>
          )}
        </Card>
      )}

      {/* Tampilan (NEW) */}
      <Card padding={20}>
        <h3 className="m-0 mb-1.5 text-base font-bold" style={{ color: 'var(--ink)' }}>Tampilan</h3>

        <div className="flex items-center gap-3.5 py-3.5 px-1">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: '#8B5CF622', color: '#8B5CF6' }}>
            <Icon name="moon" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Mode gelap</div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Sesuaikan dengan suasana malam</div>
          </div>
          <ToggleSwitch checked={dark} onChange={setDark} />
        </div>

        <div className="py-3.5 px-1">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
              <Icon name="sparkles" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Tema</div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Pilih gaya tampilan</div>
            </div>
          </div>
          <div className="flex gap-2">
            {THEME_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                style={{
                  flex: 1, padding: 12, borderRadius: 14, cursor: 'pointer',
                  background: v.bg,
                  border: variant === v.id ? `2px solid ${v.accent}` : '1px solid var(--line)',
                }}
              >
                <div className="flex gap-1 mb-2 justify-center">
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: v.accent }} />
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: '#fff', border: '1px solid rgba(0,0,0,.1)' }} />
                </div>
                <div className="text-xs font-semibold text-center" style={{ color: '#2A2418' }}>{v.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Warna aksen</div>
            <div className="flex gap-2.5 flex-wrap">
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Warna aksen ${c}`}
                  onClick={() => setAccent(c)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: accent === c ? '3px solid var(--ink)' : '3px solid transparent',
                    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Identitas Kamu (NEW) */}
      {profile && (
        <Card padding={20}>
          <h3 className="m-0 mb-1.5 text-base font-bold" style={{ color: 'var(--ink)' }}>Identitas Kamu</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            Pilih warna dan emoji untuk avatar kamu. Anggota lain akan melihat identitas ini.
          </p>

          <div className="flex items-center gap-4 mb-5">
            <Avatar member={{ ...profile, avatar_color: colorDraft || null, emoji: emojiDraft || null }} size={48} />
            <div className="flex-1 min-w-0">
              <Input
                label="Emoji"
                maxLength={2}
                placeholder="🙂"
                value={emojiDraft}
                onChange={(e) => setEmojiDraft(e.target.value)}
              />
            </div>
          </div>

          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Warna avatar</div>
          <div className="flex gap-2.5 flex-wrap mb-5">
            {IDENTITY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Warna avatar ${c}`}
                onClick={() => setColorDraft(c)}
                style={{
                  width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: colorDraft === c ? '3px solid var(--ink)' : '3px solid transparent',
                  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
                }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveIdentity} loading={identityLoading}>
              <Icon name="check" size={16} />
              Simpan
            </Button>
            {(colorDraft || emojiDraft) && (
              <Button variant="ghost" size="sm" onClick={() => { setColorDraft(''); setEmojiDraft('') }}>
                Reset
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Data & Preferensi */}
      <ImportExportSection />

      <Card padding={20}>
        <h3 className="m-0 mb-1.5 text-base font-bold" style={{ color: 'var(--ink)' }}>Data &amp; Preferensi</h3>

        <div className="flex items-center gap-3.5 py-3 px-1" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: '#16A34A22', color: '#16A34A' }}>
            <Icon name="coin" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Mata uang</div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Rupiah (IDR)</div>
          </div>
          <span className="text-[13px] font-mono" style={{ color: 'var(--ink-3)' }}>Rp</span>
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="bell" size={16} style={{ color: '#F472B6' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Notifikasi</span>
          </div>
          <div className="space-y-3.5">
            {[
              { key: 'budget_warning', label: 'Peringatan Anggaran', desc: 'Notifikasi saat anggaran hampir habis (80%)' },
              { key: 'monthly_report', label: 'Laporan Bulanan', desc: 'Ringkasan keuangan di akhir bulan' },
              { key: 'transaction_alert', label: 'Alert Transaksi Besar', desc: 'Notifikasi untuk transaksi di atas batas tertentu' },
              { key: 'reminder_daily', label: 'Pengingat Harian', desc: 'Pengingat untuk mencatat transaksi hari ini' },
              { key: 'goal_achieved', label: 'Target Tercapai', desc: 'Notifikasi saat target tabungan tercapai' },
              { key: 'debt_due', label: 'Jatuh Tempo Hutang', desc: 'Peringatan hutang yang akan jatuh tempo' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{item.desc}</p>
                </div>
                <ToggleSwitch
                  checked={notifications[item.key]}
                  onChange={(val) => handleNotificationChange(item.key, val)}
                  disabled={settingsLoading || updateSettingsMutation.isPending}
                />
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 pt-4" style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>
            Notifikasi akan muncul di dalam aplikasi. Push notification akan segera hadir.
          </p>
        </div>
      </Card>

      {/* Keamanan */}
      <Card padding={20}>
        <div className="mb-1.5">
          <SectionTitle icon="settings">Keamanan</SectionTitle>
        </div>
        <div className="flex flex-col">
          <button
            className="flex items-center justify-between w-full py-3 px-1 rounded-lg transition-colors text-left"
            onClick={() => setChangePasswordOpen(true)}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Ubah Password</p>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Ganti password akun kamu</p>
            </div>
            <Icon name="chevronR" size={16} style={{ color: 'var(--ink-3)' }} />
          </button>
          {[
            { label: 'Autentikasi 2 Faktor', desc: 'Tambah lapisan keamanan ekstra' },
            { label: 'Sesi Aktif', desc: 'Kelola perangkat yang login' },
          ].map((item) => (
            <button
              key={item.label}
              className="flex items-center justify-between w-full py-3 px-1 rounded-lg transition-colors text-left"
              onClick={() => toast.info(`Fitur "${item.label}" segera hadir`)}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{item.desc}</p>
              </div>
              <Icon name="chevronR" size={16} style={{ color: 'var(--ink-3)' }} />
            </button>
          ))}
        </div>
      </Card>

      {/* Danger Zone — hanya pemilik keluarga (atau akun personal) yang boleh menghapus semua data */}
      {isOwner && <DangerZoneSection />}

      <Card padding={20}>
        <h3 className="m-0 mb-1.5 text-base font-bold" style={{ color: 'var(--ink)' }}>Akun</h3>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Keluar dari akun</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>Kamu perlu login lagi untuk mengakses data.</p>
          </div>
          <Button variant="danger" size="sm" className="flex-shrink-0" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            Keluar
          </Button>
        </div>
      </Card>

      {/* App info */}
      <div className="text-center py-2 pb-3">
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          MoneyFam v2.0 · Dibuat dengan ❤️ untuk keluarga Indonesia
        </p>
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
