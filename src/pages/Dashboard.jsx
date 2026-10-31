import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { StatStrip } from '@/components/ui/StatTile'
import { Envelope, EnvelopeMark, envelopeStatus } from '@/components/ui/Envelope'
import {
  useMonthlyStats,
  useActivityReminders,
  useRecentTransactions,
} from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useBudgets } from '@/hooks/useBudget'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
import { useDebts, useDebtDueReminders } from '@/hooks/useDebts'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useViewport } from '@/hooks/useViewport'
import { formatCurrency, idrShort, fmtRelative } from '@/lib/utils'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function SectionTitle({ children, action, onAction, size = 22 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <h3 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: size, letterSpacing: '-.02em' }}>{children}</h3>
      {action && (
        <button onClick={onAction} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 36, color: 'var(--ink)' }}>
          {action}
        </button>
      )}
    </div>
  )
}

function Notice({ title, body }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 14, background: 'var(--surface-2)', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--ink-2)' }}>{body}</p>
      </div>
      <Link to="/settings"><Button variant="secondary" size="sm">Buka Pengaturan</Button></Link>
    </div>
  )
}

function RecentList({ compact }) {
  const { data: txs = [], isLoading } = useRecentTransactions(5)
  if (isLoading) {
    return <p style={{ margin: 0, padding: '12px 0', fontSize: 14, color: 'var(--ink-3)' }}>Memuat…</p>
  }
  if (!txs.length) {
    return <p style={{ margin: 0, padding: '12px 0', fontSize: 14, color: 'var(--ink-3)' }}>Belum ada transaksi.</p>
  }
  return txs.map((t) => {
    const inc = t.type === 'income'
    const tr = t.type === 'transfer'
    return (
      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '10px 0' : '9px 0', borderBottom: '1px solid var(--line)' }}>
        <EnvelopeMark color={t.categories?.color} width={26} height={20} flap={false} style={{ borderRadius: 4 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: compact ? 15 : 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.description || t.categories?.name || '-'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {[t.creator_name?.split(' ')[0], tr ? 'Transfer' : t.categories?.name, fmtRelative(t.date)].filter(Boolean).join(' · ')}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: inc ? 'var(--good)' : 'var(--ink)' }}>
          {inc ? '+' : tr ? '' : '−'}{idrShort(Number(t.amount))}
        </span>
      </div>
    )
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const profile = useAuthStore((s) => s.profile)
  const family = useAuthStore((s) => s.family)
  const { narrow, isMobile } = useViewport()
  const { openTxModal, openCatat } = useUiStore()

  useDebtDueReminders()
  useActivityReminders()

  const { data: wallets = [] } = useWallets()
  const { data: stats } = useMonthlyStats(y, m)
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(`${y}-${String(m).padStart(2, '0')}`)
  const { data: goals = [] } = useSavingsGoals()
  const { data: debts = [] } = useDebts()

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance || 0), 0)
  const debtLeft = debts
    .filter((d) => d.type !== 'receivable' && !d.is_paid)
    .reduce((s, d) => s + Number(d.remaining_amount || 0), 0)

  const envs = budgets
    .map((b) => {
      const limit = Number(b.amount || 0)
      const spent = Number(b.spent || 0)
      return { id: b.id, categoryId: b.category_id, name: b.categories?.name || 'Amplop', color: b.categories?.color, limit, spent, ...envelopeStatus(spent, limit) }
    })
    .sort((a, b) => b.limit - a.limit)

  const sisaTotal = envs.reduce((s, e) => s + Math.max(0, e.sisa), 0)
  const daysLeft = new Date(y, m, 0).getDate() - now.getDate()

  const parts = []
  envs.filter((e) => e.low).forEach((e) => parts.push(`${e.name} tinggal ${idrShort(e.sisa)}.`))
  envs.filter((e) => e.over).forEach((e) => parts.push(`${e.name} bocor ${idrShort(-e.sisa)}.`))
  const callout = !envs.length
    ? 'Bagi pemasukan ke amplop supaya keluarga tahu berapa yang boleh dipakai untuk tiap kebutuhan.'
    : parts.length
      ? `${parts.join(' ')} Sisanya aman sampai akhir bulan.`
      : daysLeft > 0
        ? `Semua amplop aman. Rata-rata ${idrShort(sisaTotal / Math.max(1, daysLeft))} per hari sampai akhir bulan.`
        : 'Semua amplop aman sampai akhir bulan.'

  const familyName = family?.name || profile?.full_name?.split(' ')[0] || 'Kamu'
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  const eyebrow = `${dateLabel} · ${daysLeft > 0 ? `${daysLeft} hari lagi akhir bulan` : 'hari terakhir bulan ini'}`
  const record = narrow ? () => openCatat() : openTxModal
  const openEnvelope = (e) => navigate(`/budget?amplop=${e.categoryId}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 24 : 28 }}>
      {!profile && <Notice title="Profil belum dibuat" body="Lengkapi profil di halaman Pengaturan." />}
      {!family && profile && (
        <Notice title="Mode personal" body="Buat atau gabung keluarga di Pengaturan supaya amplop bisa dipakai bersama." />
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 28, flexWrap: narrow ? 'wrap' : 'nowrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 10 : 14, maxWidth: 660 }}>
          <span className="eyebrow" style={{ fontSize: narrow ? 12 : 13, letterSpacing: '.06em', color: 'var(--ink-3)' }}>{eyebrow}</span>
          {envs.length ? (
            <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 29 : 42, letterSpacing: '-.035em', lineHeight: 1.1 }}>
              {familyName} masih pegang{' '}
              <span className="font-mono" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '0 10px', borderRadius: 10, fontWeight: 600, fontSize: isMobile ? 25 : 36, letterSpacing: '-.04em', whiteSpace: 'nowrap' }}>
                {idrShort(sisaTotal)}
              </span>{' '}
              di {envs.length} amplop.
            </h2>
          ) : (
            <h2 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: isMobile ? 29 : 42, letterSpacing: '-.035em', lineHeight: 1.1 }}>
              {budgetsLoading ? 'Menghitung isi amplop…' : `${familyName} belum punya amplop bulan ini.`}
            </h2>
          )}
          <p style={{ margin: 0, fontSize: narrow ? 15 : 17, lineHeight: 1.5, color: 'var(--ink-2)' }}>{callout}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: narrow ? 'row' : 'column', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <Button size="lg" onClick={record}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Catat pengeluaran
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/budget')}>
            {envs.length ? 'Atur amplop' : 'Buat amplop'}
          </Button>
        </div>
      </header>

      <StatStrip
        columns={isMobile ? 2 : 4}
        compact={isMobile}
        items={[
          { label: isMobile ? 'Saldo kantong' : 'Saldo semua kantong', value: formatCurrency(totalBalance), onClick: () => navigate('/wallets') },
          { label: `Masuk ${MONTHS[m - 1]}`, value: `+${formatCurrency(stats?.income || 0)}`, tone: 'good' },
          { label: `Keluar ${MONTHS[m - 1]}`, value: `−${formatCurrency(stats?.expense || 0)}` },
          { label: 'Sisa hutang', value: formatCurrency(debtLeft), onClick: () => navigate('/savings') },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 336px', gap: narrow ? 24 : 36, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <SectionTitle
            size={narrow ? 19 : 22}
            action={narrow ? 'Semua' : null}
            onAction={() => navigate('/budget')}
          >
            Amplop {MONTHS[m - 1]}
          </SectionTitle>
          {!narrow && envs.length > 0 && (
            <span style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: -10 }}>Tinggi kertas = sisa isi amplop</span>
          )}
          {envs.length === 0 ? (
            <div style={{ padding: '28px 20px', borderRadius: 14, border: '1.5px dashed var(--line-2)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)' }}>
                Setiap kategori pengeluaran bisa punya satu amplop berisi batas bulanan.
              </p>
              <Button size="sm" onClick={() => navigate('/budget')}>Buat amplop pertama</Button>
            </div>
          ) : narrow ? (
            <div className="scroll-x" style={{ display: 'flex', gap: 12, margin: '0 -18px', padding: '2px 18px 6px' }}>
              {envs.map((e, i) => (
                <div key={e.id} style={{ width: 148, flexShrink: 0 }}>
                  <Envelope compact showSpent={false} no={String(i + 1).padStart(2, '0')} name={e.name} color={e.color} spent={e.spent} limit={e.limit} onClick={() => openEnvelope(e)} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 16 }}>
              {envs.map((e, i) => (
                <Envelope key={e.id} no={String(i + 1).padStart(2, '0')} name={e.name} color={e.color} spent={e.spent} limit={e.limit} onClick={() => openEnvelope(e)} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SectionTitle size={narrow ? 19 : 20} action="Semua" onAction={() => navigate('/transactions')}>Terakhir dicatat</SectionTitle>
            <RecentList compact={narrow} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle size={narrow ? 19 : 20} action="Semua" onAction={() => navigate('/savings')}>Tujuan keluarga</SectionTitle>
            {goals.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)' }}>Belum ada tujuan tabungan.</p>
            ) : (
              goals.slice(0, 3).map((g) => {
                const target = Number(g.target_amount || 0)
                const current = Number(g.current_amount || 0)
                const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
                const deadline = g.target_date
                return (
                  <button key={g.id} onClick={() => navigate('/savings')} style={{ display: 'flex', flexDirection: 'column', gap: 6, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                      <span className="font-mono">{pct}%</span>
                    </span>
                    <span style={{ display: 'block', width: '100%', height: 8, borderRadius: 4, background: 'var(--bg-sub)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', borderRadius: 4, width: `${pct}%`, background: g.color ? `color-mix(in srgb, ${g.color} 75%, #1D1B17)` : 'var(--ink)' }} />
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {idrShort(current)} dari {idrShort(target)}
                      {deadline ? ` · target ${new Date(deadline).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}` : ''}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
