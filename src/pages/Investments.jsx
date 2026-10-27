import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { HeroCard } from '@/components/ui/HeroCard'
import { Pill } from '@/components/ui/Pill'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Icon } from '@/components/ui/Icon'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useViewport } from '@/hooks/useViewport'
import { formatCurrency, formatDate, idrShort } from '@/lib/utils'
import {
  useInvestments,
  useCreateInvestment,
  useUpdateInvestment,
  useDeleteInvestment,
  useRefreshCryptoPrices,
} from '@/hooks/useInvestments'
import { useWallets } from '@/hooks/useWallets'

// ── Constants ─────────────────────────────────────────────────────────────────

const INVESTMENT_TYPES = [
  { value: 'saham', label: 'Saham IDX', icon: '📈', codePlaceholder: 'BBCA.JK' },
  { value: 'reksadana', label: 'Reksa Dana', icon: '📊', codePlaceholder: 'Nama reksa dana' },
  { value: 'emas', label: 'Emas', icon: '🥇', codePlaceholder: 'Antam 1gr' },
  { value: 'kripto', label: 'Kripto', icon: '🪙', codePlaceholder: 'BTC / ETH / SOL' },
  { value: 'deposito', label: 'Deposito', icon: '🏦', codePlaceholder: 'BCA / BRI' },
  { value: 'obligasi', label: 'Obligasi', icon: '📄', codePlaceholder: 'ORI024 / SBR013' },
]

// type → short label (Bahasa Indonesia)
const TYPE_LABEL = {
  saham: 'Saham',
  reksadana: 'Reksa Dana',
  emas: 'Emas',
  kripto: 'Kripto',
  deposito: 'Deposito',
  obligasi: 'Obligasi',
}

// type → fixed colour map (always guard: TYPE_COLOR[t] || '#6b7280')
const TYPE_COLOR = {
  saham: '#F472B6',
  reksadana: '#0EA5A4',
  emas: '#F59E0B',
  kripto: '#8B5CF6',
  deposito: '#16A34A',
  obligasi: '#6366F1',
}

const TYPE_EMOJI = {
  saham: '📈',
  reksadana: '📊',
  emas: '🥇',
  kripto: '🪙',
  deposito: '🏦',
  obligasi: '📄',
}

function getTypeInfo(type) {
  return INVESTMENT_TYPES.find((t) => t.value === type) || INVESTMENT_TYPES[0]
}

function calc(inv) {
  const qty = Number(inv.quantity) || 0
  const buy = Number(inv.buy_price) || 0
  const cur = Number(inv.current_price || inv.buy_price) || 0
  const value = qty * cur
  const cost = qty * buy
  const gain = value - cost
  const changePct = cost ? gain / cost : 0
  return { value, cost, gain, changePct }
}

function timeSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return formatDate(dateStr)
}

// ── Investment Modal ──────────────────────────────────────────────────────────

function InvestmentModal({ isOpen, onClose, investment }) {
  const toast = useToast()
  const createMutation = useCreateInvestment()
  const updateMutation = useUpdateInvestment()
  const { data: wallets } = useWallets()
  const isEdit = !!investment

  const [form, setForm] = useState({
    type: 'saham',
    code: '',
    name: '',
    quantity: '',
    buy_price: '',
    current_price: '',
    buy_date: '',
    wallet_id: '',
    notes: '',
    interest_rate: '',
    maturity_date: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setForm({
        type: investment?.type || 'saham',
        code: investment?.code || '',
        name: investment?.name || '',
        quantity: investment?.quantity || '',
        buy_price: investment?.buy_price || '',
        current_price: investment?.current_price || '',
        buy_date: investment?.buy_date || '',
        wallet_id: investment?.wallet_id || '',
        notes: investment?.notes || '',
        interest_rate: investment?.interest_rate || '',
        maturity_date: investment?.maturity_date || '',
      })
      setErrors({})
    }
  }, [isOpen, investment])

  const set = (k) => (e) => { const value = e.target.value; setForm((f) => ({ ...f, [k]: value })) }
  const typeInfo = getTypeInfo(form.type)
  const isDeposito = form.type === 'deposito' || form.type === 'obligasi'
  const isKripto = form.type === 'kripto'

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Nama wajib diisi'
    if (!form.quantity || Number(form.quantity) <= 0) err.quantity = 'Jumlah harus lebih dari 0'
    if (!form.buy_price || Number(form.buy_price) <= 0) err.buy_price = 'Harga beli harus lebih dari 0'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) { setErrors(err); return }
    setErrors({})

    const payload = {
      type: form.type,
      code: form.code.trim().toUpperCase() || null,
      name: form.name.trim(),
      quantity: Number(form.quantity),
      buy_price: Number(form.buy_price),
      current_price: form.current_price ? Number(form.current_price) : Number(form.buy_price),
      buy_date: form.buy_date || null,
      wallet_id: form.wallet_id || null,
      notes: form.notes.trim() || null,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
      maturity_date: form.maturity_date || null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: investment.id, ...payload })
        toast.success('Investasi diperbarui')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Investasi ditambahkan')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Investasi' : 'Tambah Investasi'}>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: 'var(--ink-2)' }}>Jenis Investasi</label>
            <div className="grid grid-cols-3 gap-2">
              {INVESTMENT_TYPES.map((t) => {
                const active = form.type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                    className="flex flex-col items-center gap-1 p-2.5 text-xs font-medium transition-all"
                    style={{
                      borderRadius: 'var(--r-sm)',
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                    }}
                  >
                    <span className="text-xl">{t.icon}</span>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            label="Nama Aset"
            placeholder={`Contoh: ${typeInfo.codePlaceholder}`}
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            required
          />

          {/* Code (for saham/kripto/obligasi) */}
          {(form.type === 'saham' || form.type === 'kripto' || form.type === 'obligasi') && (
            <Input
              label={`Kode ${form.type === 'kripto' ? 'Simbol' : 'Ticker'}`}
              placeholder={typeInfo.codePlaceholder}
              value={form.code}
              onChange={set('code')}
              helpText={isKripto ? 'Contoh: BTC, ETH, SOL — untuk update harga otomatis' : 'Contoh: BBCA.JK, TLKM.JK'}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={form.type === 'emas' ? 'Jumlah (gram)' : form.type === 'deposito' ? 'Nominal (Rp)' : 'Jumlah / Lot / Unit'}
              type="number"
              placeholder="1"
              value={form.quantity}
              onChange={set('quantity')}
              error={errors.quantity}
              required
            />
            <Input
              label="Harga Beli (Rp)"
              type="number"
              placeholder="0"
              value={form.buy_price}
              onChange={set('buy_price')}
              error={errors.buy_price}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Harga Sekarang (Rp)"
              type="number"
              placeholder="Kosong = sama dengan harga beli"
              value={form.current_price}
              onChange={set('current_price')}
              helpText={isKripto ? 'Akan diupdate otomatis' : 'Perbarui manual'}
            />
            <Input
              label="Tanggal Beli"
              type="date"
              value={form.buy_date}
              onChange={set('buy_date')}
            />
          </div>

          {isDeposito && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bunga (% / tahun)"
                type="number"
                step="0.01"
                placeholder="5.5"
                value={form.interest_rate}
                onChange={set('interest_rate')}
              />
              <Input
                label="Jatuh Tempo"
                type="date"
                value={form.maturity_date}
                onChange={set('maturity_date')}
              />
            </div>
          )}

          <Select
            label="Dompet / Sumber Dana (opsional)"
            value={form.wallet_id}
            onChange={set('wallet_id')}
            helpText="Untuk tracking total aset"
          >
            <option value="">— Tidak terhubung —</option>
            {(wallets || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
              </option>
            ))}
          </Select>

          <Input
            label="Catatan (opsional)"
            placeholder="Info tambahan..."
            value={form.notes}
            onChange={set('notes')}
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  )
}

// ── Update Price Modal ────────────────────────────────────────────────────────

function UpdatePriceModal({ isOpen, onClose, investment }) {
  const toast = useToast()
  const updateMutation = useUpdateInvestment()
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (isOpen) setPrice(investment?.current_price || '')
  }, [isOpen, investment])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!price || Number(price) <= 0) return
    try {
      await updateMutation.mutateAsync({
        id: investment.id,
        current_price: Number(price),
        price_updated_at: new Date().toISOString(),
      })
      toast.success('Harga diperbarui')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal update harga')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Harga — ${investment?.name}`} size="sm">
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            Harga terakhir:{' '}
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>
              {formatCurrency(investment?.current_price || 0)}
            </span>
          </div>
          <Input
            label="Harga Baru (Rp)"
            type="number"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
              Update
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  )
}

// ── Portfolio Hero ────────────────────────────────────────────────────────────

function PortfolioHero({ investments }) {
  const { isMobile } = useViewport()

  const totalNow = investments.reduce((s, i) => s + calc(i).value, 0)
  const totalModal = investments.reduce((s, i) => s + calc(i).cost, 0)
  const gain = totalNow - totalModal
  const plPct = totalModal > 0 ? (gain / totalModal) * 100 : 0
  const up = gain >= 0

  return (
    <HeroCard
      label="Total Portofolio"
      value={formatCurrency(totalNow)}
      style={isMobile ? { padding: 20 } : undefined}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Pill
            tone={up ? 'good' : 'bad'}
            style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}
            icon={<Icon name="trending" size={12} stroke={2.4} />}
          >
            {up ? '+' : ''}{plPct.toFixed(1)}%
          </Pill>
          <span className="tabular-nums" style={{ fontSize: 13, opacity: 0.9 }}>
            {up ? '+' : ''}{idrShort(gain)} sepanjang waktu
          </span>
        </div>
      }
    />
  )
}

// ── Allocation Card ───────────────────────────────────────────────────────────

function AllocationCard({ investments }) {
  const { isMobile } = useViewport()

  const groups = {}
  investments.forEach((i) => {
    groups[i.type] = (groups[i.type] || 0) + calc(i).value
  })
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  if (!entries.length) return null

  return (
    <Card padding={isMobile ? 18 : 22}>
      <h3 className="font-bold" style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--ink)' }}>
        Alokasi Aset
      </h3>
      <div style={{ display: 'flex', gap: 4, borderRadius: 999, overflow: 'hidden', height: 14, marginBottom: 14 }}>
        {entries.map(([type, val]) => (
          <div
            key={type}
            style={{
              width: `${total > 0 ? (val / total) * 100 : 0}%`,
              background: TYPE_COLOR[type] || '#6b7280',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {entries.map(([type, val]) => {
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLOR[type] || '#6b7280' }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                  {TYPE_LABEL[type] || type}
                </div>
                <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {pct}% · {idrShort(val)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Investment Card ───────────────────────────────────────────────────────────

function InvestmentCard({ inv, onEdit, onDelete, onUpdatePrice }) {
  const { value, gain, changePct } = calc(inv)
  const up = gain >= 0
  const color = TYPE_COLOR[inv.type] || '#6b7280'
  const isSahamCode = inv.type === 'saham' && inv.code
  const badge = isSahamCode ? inv.code.slice(0, 4) : (TYPE_EMOJI[inv.type] || '📊')

  return (
    <Card padding={18}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: color + '22', color,
              fontWeight: 800, fontSize: isSahamCode ? 12 : 20,
            }}
          >
            {badge}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{inv.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
              {[TYPE_LABEL[inv.type] || inv.type, inv.code].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onUpdatePrice(inv)} aria-label="Update harga investasi">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(inv)} aria-label="Edit investasi">
            <Icon name="pencil" size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(inv.id)} aria-label="Hapus investasi">
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: 10 }}>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Nilai Sekarang</p>
          <p className="tabular-nums font-bold" style={{ fontSize: 14, color: 'var(--ink)' }}>{formatCurrency(value)}</p>
        </div>
        <div
          style={{
            background: up
              ? 'color-mix(in srgb, var(--good) 12%, var(--surface))'
              : 'color-mix(in srgb, var(--bad) 12%, var(--surface))',
            borderRadius: 'var(--r-sm)', padding: 10,
          }}
        >
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Untung / Rugi</p>
          <p className="tabular-nums font-bold" style={{ fontSize: 14, color: up ? 'var(--good)' : 'var(--bad)' }}>
            {up ? '+' : ''}{formatCurrency(gain)}
          </p>
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-3)' }}>
        <span className="tabular-nums">
          {inv.quantity} × {formatCurrency(inv.current_price || inv.buy_price)}
        </span>
        <span className="tabular-nums font-semibold" style={{ color: up ? 'var(--good)' : 'var(--bad)' }}>
          {up ? '+' : ''}{(changePct * 100).toFixed(1)}%
        </span>
      </div>

      {/* Price updated (kripto) */}
      {inv.price_updated_at && inv.type === 'kripto' && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--ink-3)' }}>
          Harga diperbarui {timeSince(inv.price_updated_at)}
        </p>
      )}

      {/* Deposito / obligasi: interest info */}
      {(inv.type === 'deposito' || inv.type === 'obligasi') && inv.interest_rate && (
        <div
          className="mt-2 flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5"
          style={{ color: 'var(--good)', background: 'color-mix(in srgb, var(--good) 12%, var(--surface))' }}
        >
          <span>Bunga {inv.interest_rate}%/thn</span>
          {inv.maturity_date && <span>· JT: {formatDate(inv.maturity_date)}</span>}
        </div>
      )}
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Investments() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const { data: investments, isLoading } = useInvestments()
  const deleteMutation = useDeleteInvestment()
  const refreshMutation = useRefreshCryptoPrices()

  const [filterType, setFilterType] = useState('all')
  const [modal, setModal] = useState({ open: false, investment: null })
  const [priceModal, setPriceModal] = useState({ open: false, investment: null })
  const [deleteId, setDeleteId] = useState(null)

  const all = investments || []
  const filtered = all.filter((i) => filterType === 'all' || i.type === filterType)
  const hasCrypto = all.some((i) => i.type === 'kripto')

  const typeOptions = [
    { id: 'all', label: `Semua (${all.length})` },
    ...INVESTMENT_TYPES.map((t) => {
      const count = all.filter((i) => i.type === t.value).length
      return count ? { id: t.value, label: `${t.icon} ${TYPE_LABEL[t.value]} (${count})` } : null
    }).filter(Boolean),
  ]

  const handleRefreshCrypto = async () => {
    if (!hasCrypto) {
      toast.info('Tidak ada aset kripto untuk diperbarui')
      return
    }
    try {
      const prices = await refreshMutation.mutateAsync(all)
      const updated = Object.keys(prices).length
      if (updated > 0) {
        toast.success(`Harga ${updated} aset kripto diperbarui dari CoinGecko`)
      } else {
        toast.error('Gagal mengambil harga kripto. Coba lagi.')
      }
    } catch {
      toast.error('Gagal refresh harga')
    }
  }

  const { triggerDelete } = useUndoableDelete(
    async (id) => {
      await deleteMutation.mutateAsync(id)
    },
    { itemName: 'Investasi' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-xl" style={{ color: 'var(--ink)' }}>Investasi</h1>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Portofolio &amp; tracking aset</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {hasCrypto && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshCrypto}
              loading={refreshMutation.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Kripto
            </Button>
          )}
          <Button size="sm" variant="soft" onClick={() => setModal({ open: true, investment: null })}>
            <Icon name="plus" size={14} stroke={2.2} />
            Tambah
          </Button>
        </div>
      </div>

      {/* Portfolio hero + allocation */}
      {all.length > 0 && (
        <>
          <PortfolioHero investments={all} />
          <AllocationCard investments={all} />
        </>
      )}

      {/* CoinGecko note */}
      {hasCrypto && (
        <div
          className="flex items-start gap-2 rounded-xl p-3"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-soft)' }}
        >
          <Icon name="info" size={16} style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--accent-ink)' }}>
            Harga kripto diambil dari CoinGecko. Tekan{' '}
            <span className="font-semibold">Refresh Kripto</span> untuk update harga terbaru.
            Simbol yang didukung: BTC, ETH, BNB, SOL, ADA, DOGE, XRP, dll.
          </p>
        </div>
      )}

      {/* Filter */}
      {all.length > 0 && (
        <SegmentedControl
          size="sm"
          value={filterType}
          onChange={setFilterType}
          options={typeOptions}
        />
      )}

      {/* Holdings */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: 160, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)' }}
            />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-16 text-center">
          <Icon name="chart" size={48} className="mx-auto mb-3" style={{ color: 'var(--ink-3)' }} />
          <p className="font-medium" style={{ color: 'var(--ink-3)' }}>
            {filterType === 'all' ? 'Belum ada investasi' : `Tidak ada ${TYPE_LABEL[filterType] || filterType}`}
          </p>
          {filterType === 'all' && (
            <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>Tambah portofolio pertama kamu</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.24), ease: 'easeOut' }}
            >
              <InvestmentCard
                inv={inv}
                onEdit={(inv) => setModal({ open: true, investment: inv })}
                onDelete={setDeleteId}
                onUpdatePrice={(inv) => setPriceModal({ open: true, investment: inv })}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <InvestmentModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, investment: null })}
        investment={modal.investment}
      />
      {priceModal.investment && (
        <UpdatePriceModal
          isOpen={priceModal.open}
          onClose={() => setPriceModal({ open: false, investment: null })}
          investment={priceModal.investment}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Investasi"
        message="Yakin ingin menghapus investasi ini?"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
