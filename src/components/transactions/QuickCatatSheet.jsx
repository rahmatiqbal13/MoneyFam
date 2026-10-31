import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { envelopeTones } from '@/lib/theme'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useBudgets } from '@/hooks/useBudget'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { formatCurrency, idrShort, toDateStr } from '@/lib/utils'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del']

function yearMonthNow() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Fast expense entry from the Amplop design: amount via keypad, pick an
// envelope (category), see what's left in it before saving.
export function QuickCatatSheet({ open, onClose, initialCategoryId, onOpenFullForm }) {
  const toast = useToast()
  const { data: categories = [] } = useCategories('expense')
  const { data: wallets = [] } = useWallets()
  const { data: budgets = [] } = useBudgets(yearMonthNow())
  const create = useCreateTransaction()

  const [amt, setAmt] = useState('')
  const [catId, setCatId] = useState(null)
  const [walletId, setWalletId] = useState(null)
  const [note, setNote] = useState('')

  // Envelopes first (categories with a budget this month), then the rest.
  // Same-named categories (default + family copy) collapse to one chip,
  // keeping the one that has an envelope.
  const options = useMemo(() => {
    const byCat = new Map(budgets.map((b) => [b.category_id, b]))
    const byName = new Map()
    for (const c of categories) {
      const b = byCat.get(c.id)
      const opt = { ...c, limit: b ? Number(b.amount) : null, spent: b ? Number(b.spent) : 0 }
      const key = c.name.trim().toLowerCase()
      const prev = byName.get(key)
      if (!prev || (prev.limit === null && opt.limit !== null)) byName.set(key, opt)
    }
    return [...byName.values()].sort((a, b) => (b.limit !== null) - (a.limit !== null))
  }, [categories, budgets])

  useEffect(() => {
    if (!open) return
    setAmt('')
    setNote('')
    setCatId(initialCategoryId || null)
  }, [open, initialCategoryId])

  useEffect(() => {
    if (open && !catId && options.length) setCatId(options[0].id)
  }, [open, catId, options])

  useEffect(() => {
    if (open && !walletId && wallets.length) setWalletId(wallets[0].id)
  }, [open, walletId, wallets])

  const amount = parseInt(amt || '0', 10)
  const cat = options.find((o) => o.id === catId)
  const sisa = cat?.limit != null ? cat.limit - cat.spent : null

  let after = ''
  if (cat && sisa !== null) {
    if (!amount) after = `Sisa ${cat.name} sekarang ${idrShort(Math.max(0, sisa))}`
    else if (sisa - amount < 0) after = `Amplop ${cat.name} akan bocor ${idrShort(amount - sisa)}`
    else after = `Sisa ${cat.name} setelah ini ${idrShort(sisa - amount)}`
  } else if (cat) {
    after = `${cat.name} belum punya amplop bulan ini`
  }

  const press = (k) => {
    setAmt((s) => {
      if (k === 'del') return s.slice(0, -1)
      if (s.length >= 10) return s
      if (!s && (k === '0' || k === '000')) return s
      return s + k
    })
  }

  const save = async () => {
    if (!amount || !cat || !walletId) return
    try {
      await create.mutateAsync({
        type: 'expense',
        amount,
        date: toDateStr(new Date()),
        description: note.trim() || cat.name,
        category_id: cat.id,
        wallet_id: walletId,
        to_wallet_id: null,
        note: '',
        receipt_url: null,
      })
      toast.success(`Pengeluaran ${idrShort(amount)} dicatat`)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }

  const chip = (on) => ({
    flexShrink: 0, minHeight: 44, borderRadius: 999, border: 'none', cursor: 'pointer',
    padding: '0 14px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
    background: on ? 'var(--accent)' : 'var(--bg-sub)', color: on ? 'var(--on-accent)' : 'var(--ink)',
  })

  return (
    <Sheet open={open} onClose={onClose} fullHeight>
      <div style={{ display: 'flex', flexDirection: 'column', margin: '0 -20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <button onClick={onOpenFullForm} style={{ minHeight: 44, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: 'var(--ink-2)' }}>
            Form lengkap
          </button>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Catat pengeluaran</span>
          <button onClick={onClose} aria-label="Tutup" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--bg-sub)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 18px' }}>
          <span className="font-mono" aria-live="polite" style={{ fontWeight: 600, fontSize: 40, letterSpacing: '-.05em', lineHeight: 1, color: amount ? 'var(--ink)' : 'var(--ink-4)' }}>
            {formatCurrency(amount)}
          </span>
          <span style={{ fontSize: 14, color: sisa !== null && amount > sisa ? 'var(--bad-ink)' : 'var(--ink-2)', minHeight: 20, textAlign: 'center' }}>{after}</span>
        </div>

        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', padding: '0 18px 6px' }}>Ambil dari amplop</span>
        <div className="scroll-x" style={{ display: 'flex', gap: 8, padding: '2px 18px 10px' }}>
          {options.map((o) => {
            const on = o.id === catId
            const left = o.limit != null ? o.limit - o.spent : null
            return (
              <button
                key={o.id}
                onClick={() => setCatId(o.id)}
                aria-pressed={on}
                style={{
                  flexShrink: 0, minWidth: 96, minHeight: 52, padding: '6px 12px', borderRadius: 12, border: 'none',
                  cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1,
                  background: on ? envelopeTones(o.color).face : 'var(--bg-sub)',
                  color: on ? '#1D1B17' : 'var(--ink)',
                  boxShadow: on ? 'inset 0 0 0 2px #1D1B17' : 'none',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{o.name}</span>
                <span className="font-mono" style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>
                  {left === null ? 'tanpa amplop' : left < 0 ? 'bocor' : idrShort(left)}
                </span>
              </button>
            )
          })}
        </div>

        {wallets.length > 1 && (
          <div className="scroll-x" style={{ display: 'flex', gap: 6, padding: '0 18px 10px' }}>
            {wallets.map((w) => (
              <button key={w.id} onClick={() => setWalletId(w.id)} aria-pressed={w.id === walletId} style={chip(w.id === walletId)}>
                {w.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '0 18px 8px' }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan, mis. Bakso depan komplek"
            aria-label="Catatan"
            style={{ width: '100%', minHeight: 46, borderRadius: 12, border: '1.5px solid var(--rule)', background: 'var(--surface)', padding: '0 14px', fontSize: 16, color: 'var(--ink)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: '0 18px' }}>
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Hapus angka' : k}
              className="keypad-key font-mono"
              style={{ minHeight: 48, borderRadius: 12, border: 'none', background: 'transparent', fontWeight: 600, fontSize: k === '000' ? 18 : 22, cursor: 'pointer', color: 'var(--ink)' }}
            >
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 18px 6px' }}>
          <button
            onClick={save}
            disabled={!amount || !cat || !walletId || create.isPending}
            className="press"
            style={{
              width: '100%', minHeight: 54, borderRadius: 999, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)',
              fontWeight: 600, fontSize: 16, cursor: 'pointer', opacity: amount && cat && walletId ? 1 : 0.35,
            }}
          >
            {!wallets.length ? 'Tambah kantong dulu' : amount && cat ? `Simpan ${idrShort(amount)} dari ${cat.name}` : 'Ketik nominal dulu'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
