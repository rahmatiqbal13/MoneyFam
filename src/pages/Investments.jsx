import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown,
  BarChart3, AlertCircle,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal, ModalBody, ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { formatCurrency, formatDate } from '@/lib/utils'
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
  { value: 'saham', label: 'Saham IDX', icon: '📈', color: '#3b82f6', codePlaceholder: 'BBCA.JK' },
  { value: 'reksadana', label: 'Reksa Dana', icon: '📊', color: '#8b5cf6', codePlaceholder: 'Nama reksa dana' },
  { value: 'emas', label: 'Emas', icon: '🥇', color: '#f59e0b', codePlaceholder: 'Antam 1gr' },
  { value: 'kripto', label: 'Kripto', icon: '🪙', color: '#ec4899', codePlaceholder: 'BTC / ETH / SOL' },
  { value: 'deposito', label: 'Deposito', icon: '🏦', color: '#10b981', codePlaceholder: 'BCA / BRI' },
  { value: 'obligasi', label: 'Obligasi', icon: '📄', color: '#6366f1', codePlaceholder: 'ORI024 / SBR013' },
]

function getTypeInfo(type) {
  return INVESTMENT_TYPES.find((t) => t.value === type) || INVESTMENT_TYPES[0]
}

function pctColor(pct) {
  if (pct > 5) return 'text-emerald-600'
  if (pct > 0) return 'text-emerald-500'
  if (pct < -5) return 'text-red-600'
  if (pct < 0) return 'text-red-500'
  return 'text-gray-500'
}

function formatPct(pct) {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
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
            <label className="text-sm font-medium text-gray-700 block mb-2">Jenis Investasi</label>
            <div className="grid grid-cols-3 gap-2">
              {INVESTMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    form.type === t.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  {t.label}
                </button>
              ))}
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

          {/* Code (for saham/kripto) */}
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
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            Harga terakhir:{' '}
            <span className="font-semibold text-gray-900">
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

// ── Investment Card ───────────────────────────────────────────────────────────

function InvestmentCard({ inv, onEdit, onDelete, onUpdatePrice }) {
  const typeInfo = getTypeInfo(inv.type)
  const totalBuy = Number(inv.quantity) * Number(inv.buy_price)
  const totalNow = Number(inv.quantity) * Number(inv.current_price || inv.buy_price)
  const pl = totalNow - totalBuy
  const plPct = totalBuy > 0 ? (pl / totalBuy) * 100 : 0
  const isProfit = pl >= 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${typeInfo.color}18` }}
            >
              {typeInfo.icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm">{inv.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {inv.code && (
                  <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    {inv.code}
                  </span>
                )}
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: `${typeInfo.color}18`, color: typeInfo.color }}
                >
                  {typeInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onUpdatePrice(inv)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Update harga"
              aria-label="Update harga investasi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(inv)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Edit investasi"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(inv.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Hapus investasi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-400 mb-0.5">Nilai Sekarang</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(totalNow)}</p>
          </div>
          <div className={`rounded-lg p-2.5 ${isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-400 mb-0.5">Untung / Rugi</p>
            <p className={`text-sm font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}{formatCurrency(pl)}
            </p>
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {inv.quantity} × {formatCurrency(inv.current_price || inv.buy_price)}
          </span>
          <span className={`font-semibold ${pctColor(plPct)}`}>
            {isProfit ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
            {formatPct(plPct)}
          </span>
        </div>

        {/* Price updated */}
        {inv.price_updated_at && inv.type === 'kripto' && (
          <p className="text-xs text-gray-300 mt-1.5">
            Harga diperbarui {timeSince(inv.price_updated_at)}
          </p>
        )}

        {/* Deposito: interest info */}
        {(inv.type === 'deposito' || inv.type === 'obligasi') && inv.interest_rate && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
            <span>Bunga {inv.interest_rate}%/thn</span>
            {inv.maturity_date && <span>· JT: {formatDate(inv.maturity_date)}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function PortfolioSummary({ investments }) {
  const totalModal = investments.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.buy_price),
    0
  )
  const totalNow = investments.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.current_price || i.buy_price),
    0
  )
  const pl = totalNow - totalModal
  const plPct = totalModal > 0 ? (pl / totalModal) * 100 : 0
  const isProfit = pl >= 0

  const byType = INVESTMENT_TYPES.map((t) => {
    const items = investments.filter((i) => i.type === t.value)
    const val = items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.current_price || i.buy_price),
      0
    )
    return { ...t, value: val, count: items.length }
  }).filter((t) => t.count > 0)

  const chartData = byType.map((t) => ({
    name: t.label,
    value: t.value,
    color: t.color,
  }))

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800">{d.name}</p>
        <p className="text-gray-600 mt-0.5">{formatCurrency(d.value)}</p>
        <p className="text-gray-400 text-xs">{(d.percent * 100).toFixed(1)}%</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Total Modal</p>
          <p className="text-base font-bold text-gray-900">{formatCurrency(totalModal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{investments.length} aset</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">Nilai Sekarang</p>
          <p className="text-base font-bold text-gray-900">{formatCurrency(totalNow)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-400 mb-1">Untung / Rugi</p>
          <p className={`text-base font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{formatCurrency(pl)}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${pctColor(plPct)}`}>
            {formatPct(plPct)}
          </p>
        </div>
      </div>

      {/* Type breakdown */}
      {byType.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-3">Alokasi per Jenis</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Donut chart */}
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend + bars */}
            <div className="space-y-2">
              {byType.map((t) => {
                const pct = totalNow > 0 ? (t.value / totalNow) * 100 : 0
                return (
                  <div key={t.value}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">
                        {t.icon} {t.label}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-900">{formatCurrency(t.value)}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: t.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Investments() {
  const toast = useToast()
  const { data: investments, isLoading } = useInvestments()
  const deleteMutation = useDeleteInvestment()
  const refreshMutation = useRefreshCryptoPrices()

  const [filterType, setFilterType] = useState('all')
  const [modal, setModal] = useState({ open: false, investment: null })
  const [priceModal, setPriceModal] = useState({ open: false, investment: null })
  const [deleteId, setDeleteId] = useState(null)

  const filtered = (investments || []).filter(
    (i) => filterType === 'all' || i.type === filterType
  )

  const hasCrypto = (investments || []).some((i) => i.type === 'kripto')

  const handleRefreshCrypto = async () => {
    if (!hasCrypto) {
      toast.info('Tidak ada aset kripto untuk diperbarui')
      return
    }
    try {
      const prices = await refreshMutation.mutateAsync(investments || [])
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Investasi</h1>
          <p className="text-sm text-gray-400">Portfolio & tracking aset</p>
        </div>
        <div className="flex gap-2">
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
          <Button size="sm" onClick={() => setModal({ open: true, investment: null })}>
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Portfolio summary */}
      {(investments || []).length > 0 && (
        <PortfolioSummary investments={investments} />
      )}

      {/* CoinGecko note */}
      {hasCrypto && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Harga kripto diambil dari CoinGecko. Tekan{' '}
            <span className="font-semibold">Refresh Kripto</span> untuk update harga terbaru.
            Simbol yang didukung: BTC, ETH, BNB, SOL, ADA, DOGE, XRP, dll.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            filterType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Semua ({(investments || []).length})
        </button>
        {INVESTMENT_TYPES.map((t) => {
          const count = (investments || []).filter((i) => i.type === t.value).length
          if (!count) return null
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === t.value
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Investment grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-40" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-16 text-center">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {filterType === 'all' ? 'Belum ada investasi' : `Tidak ada ${getTypeInfo(filterType).label}`}
          </p>
          {filterType === 'all' && (
            <p className="text-gray-300 text-sm mt-1">Tambah portofolio pertama kamu</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              onEdit={(inv) => setModal({ open: true, investment: inv })}
              onDelete={setDeleteId}
              onUpdatePrice={(inv) => setPriceModal({ open: true, investment: inv })}
            />
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
