import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { Sheet } from '@/components/ui/Sheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatStrip } from '@/components/ui/StatTile'
import { Envelope, EnvelopeMark, envelopeStatus } from '@/components/ui/Envelope'
import { BudgetModal } from '@/components/budget/BudgetModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useToast } from '@/components/ui/Toast'
import { useViewport } from '@/hooks/useViewport'
import { useBudgets, useDeleteBudget, useCopyBudgetFromLastMonth } from '@/hooks/useBudget'
import { useTransactions } from '@/hooks/useTransactions'
import { useFamilyMembers } from '@/hooks/useFamily'
import { useBudgetStore } from '@/stores/budgetStore'
import { useUiStore } from '@/stores/uiStore'
import { memberColor } from '@/lib/memberColor'
import { formatCurrency, idrShort, toDateStr, fmtRelative } from '@/lib/utils'

function EnvelopeDetail({ env, yearMonth, daysLeft, onEdit, onDelete, onRecord }) {
  const [year, month] = yearMonth.split('-').map(Number)
  const { data: txPage } = useTransactions(
    {
      type: 'expense',
      category_id: env.categoryId,
      dateFrom: `${yearMonth}-01`,
      dateTo: toDateStr(new Date(year, month, 0)),
    },
    0,
    50,
  )
  const members = useFamilyMembers().data || []
  const txs = txPage?.data || []

  const byMember = (() => {
    const map = new Map()
    for (const t of txs) {
      const cur = map.get(t.user_id) || 0
      map.set(t.user_id, cur + Number(t.amount))
    }
    const rows = [...map.entries()].map(([id, amt]) => {
      const p = members.find((m) => m.id === id) || { id, full_name: txs.find((t) => t.user_id === id)?.creator_name || 'Anggota' }
      return { member: p, amt }
    })
    return rows.sort((a, b) => b.amt - a.amt)
  })()
  const maxAmt = Math.max(1, ...byMember.map((r) => r.amt))

  const pct = env.limit > 0 ? Math.min(100, (env.spent / env.limit) * 100) : 0
  const barColor = env.over ? 'var(--bad)' : env.low ? 'var(--warn)' : 'var(--ink)'
  const advice = env.over
    ? `Amplop ini kurang ${idrShort(-env.sisa)}. Tutup dari amplop yang masih longgar, atau naikkan isinya.`
    : daysLeft > 0
      ? `Aman dipakai ${idrShort(env.sisa / daysLeft)} per hari sampai akhir bulan.`
      : `Sisa ${idrShort(env.sisa)} di amplop ini.`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EnvelopeMark color={env.color} />
          <span className="font-mono" style={{ fontSize: 13, color: 'var(--ink-3)' }}>Amplop {env.no}</span>
        </div>
        <h3 className="font-display" style={{ margin: 0, fontWeight: 800, fontSize: 30, letterSpacing: '-.035em' }}>{env.name}</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span className="font-mono" style={{ fontWeight: 600, fontSize: 28, letterSpacing: '-.04em', color: env.over ? 'var(--bad)' : 'var(--ink)' }}>
            {formatCurrency(env.sisa)}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{env.over ? 'lewat dari isi' : 'sisa di amplop'}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-sub)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: barColor, width: `${pct}%`, transition: 'width .5s var(--ease-out)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
          <span>Terpakai {idrShort(env.spent)}</span>
          <span>Isi awal {idrShort(env.limit)}</span>
        </div>
        <p style={{ margin: '4px 0 0', padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', fontSize: 15, lineHeight: 1.45 }}>{advice}</p>
      </div>

      {byMember.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="eyebrow">Siapa yang mengambil</span>
          {byMember.map(({ member, amt }) => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar member={member} size={30} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{member.full_name?.split(' ')[0]}</span>
                  <span className="font-mono">{idrShort(amt)}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-sub)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: memberColor(member), width: `${(amt / maxAmt) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="eyebrow" style={{ marginBottom: 6 }}>Keluar dari amplop ini</span>
        {txs.length === 0 ? (
          <p style={{ margin: 0, padding: '8px 0', fontSize: 14, color: 'var(--ink-3)' }}>Belum ada pengeluaran bulan ini.</p>
        ) : (
          txs.slice(0, 4).map((t) => {
            const m = members.find((x) => x.id === t.user_id)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m ? memberColor(m) : 'var(--ink-4)', marginTop: 7, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{t.description || env.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {[t.creator_name?.split(' ')[0], fmtRelative(t.date)].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>−{idrShort(Number(t.amount))}</span>
              </div>
            )
          })
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button size="lg" onClick={onRecord}>Catat dari amplop ini</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" className="flex-1" onClick={onEdit}>Ubah isi</Button>
          <Button variant="danger-outline" className="flex-1" onClick={onDelete}>Hapus</Button>
        </div>
      </div>
    </div>
  )
}

export default function Budget() {
  const toast = useToast()
  const { narrow, isMobile } = useViewport()
  const [params, setParams] = useSearchParams()
  const { selectedMonth, setSelectedMonth } = useBudgetStore()
  const { openCatat, openTxModal } = useUiStore()

  const { data: budgets = [], isLoading } = useBudgets(selectedMonth)
  const deleteMutation = useDeleteBudget()
  const copyMutation = useCopyBudgetFromLastMonth()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [selCat, setSelCat] = useState(params.get('amplop'))
  const [sheetOpen, setSheetOpen] = useState(!!params.get('amplop'))

  const navigateMonth = (dir) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const d = new Date(year, month - 1 + dir, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthDate = new Date(selectedMonth + '-01')
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(monthDate)

  const now = new Date()
  const isCurrentMonth = selectedMonth === toDateStr(now).slice(0, 7)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const daysLeft = isCurrentMonth ? daysInMonth - now.getDate() : 0

  const envs = useMemo(() => budgets
    .map((b) => {
      const limit = Number(b.amount || 0)
      const spent = Number(b.spent || 0)
      return { budget: b, id: b.id, categoryId: b.category_id, name: b.categories?.name || 'Amplop', color: b.categories?.color, limit, spent, ...envelopeStatus(spent, limit) }
    })
    .sort((a, b) => b.limit - a.limit)
    .map((e, i) => ({ ...e, no: String(i + 1).padStart(2, '0') })), [budgets])

  const totalBudget = envs.reduce((s, e) => s + e.limit, 0)
  const totalSpent = envs.reduce((s, e) => s + e.spent, 0)
  const sisaTotal = envs.reduce((s, e) => s + Math.max(0, e.sisa), 0)

  const selected = envs.find((e) => e.categoryId === selCat) || (!narrow ? envs[0] : null)

  useEffect(() => {
    if (params.get('amplop')) {
      params.delete('amplop')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const pick = (e) => {
    setSelCat(e.categoryId)
    if (narrow) setSheetOpen(true)
  }

  const openNew = () => { setEditingBudget(null); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditingBudget(null) }

  const { triggerDelete } = useUndoableDelete(
    async (id) => { await deleteMutation.mutateAsync(id) },
    { itemName: 'Amplop' }
  )

  const handleDelete = () => {
    triggerDelete(deleteId)
    setDeleteId(null)
    setSheetOpen(false)
  }

  const handleCopyFromLastMonth = async () => {
    if (budgets.length > 0) {
      setCopyConfirmOpen(true)
      return
    }
    await executeCopy()
  }

  const executeCopy = async () => {
    try {
      await copyMutation.mutateAsync(selectedMonth)
      toast.success('Amplop bulan lalu disalin')
      setCopyConfirmOpen(false)
    } catch (err) {
      toast.error(err.message || 'Gagal menyalin amplop')
    }
  }

  const recordFrom = (env) => {
    setSheetOpen(false)
    if (narrow) openCatat(env.categoryId)
    else openTxModal()
  }

  const detail = selected && (
    <EnvelopeDetail
      key={selected.categoryId}
      env={selected}
      yearMonth={selectedMonth}
      daysLeft={daysLeft}
      onEdit={() => { setEditingBudget(selected.budget); setModalOpen(true) }}
      onDelete={() => setDeleteId(selected.id)}
      onRecord={() => recordFrom(selected)}
    />
  )

  const monthNav = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => navigateMonth(-1)} aria-label="Bulan sebelumnya" className="topbar-btn" style={{ width: 36, height: 36 }}>
        <Icon name="chevronL" size={18} />
      </button>
      <span className="eyebrow" style={{ fontSize: 13, color: 'var(--ink-2)', minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
      <button onClick={() => navigateMonth(1)} aria-label="Bulan berikutnya" className="topbar-btn" style={{ width: 36, height: 36 }}>
        <Icon name="chevronR" size={18} />
      </button>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Amplop"
        eyebrow={`${envs.length} amplop${isCurrentMonth && daysLeft > 0 ? ` · ${daysLeft} hari lagi akhir bulan` : ''}`}
        actions={[
          <Button key="new" onClick={openNew}>Amplop baru</Button>,
          <Button key="copy" variant="secondary" onClick={handleCopyFromLastMonth} loading={copyMutation.isPending}>Salin bulan lalu</Button>,
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: narrow ? 'center' : 'flex-start', marginTop: narrow ? -8 : -14 }}>{monthNav}</div>

        <StatStrip
          columns={isMobile ? 2 : 3}
          compact={isMobile}
          items={[
            { label: `Isi awal ${envs.length} amplop`, value: formatCurrency(totalBudget) },
            { label: 'Sudah keluar', value: formatCurrency(totalSpent) },
            ...(isMobile ? [] : [{ label: 'Masih di amplop', value: formatCurrency(sisaTotal) }]),
          ]}
        />
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: -8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Masih di {envs.length} amplop</span>
            <span className="font-mono" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-.04em' }}>{formatCurrency(sisaTotal)}</span>
          </div>
        )}

        {isLoading ? (
          <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>Memuat amplop…</p>
        ) : envs.length === 0 ? (
          <div style={{ padding: '40px 24px', borderRadius: 18, border: '1.5px dashed var(--line-2)', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', maxWidth: 640 }}>
            <h3 className="font-display" style={{ margin: 0, fontWeight: 700, fontSize: 24, letterSpacing: '-.02em' }}>Belum ada amplop di {monthLabel}</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              Bagi pemasukan ke amplop per kategori. Setiap pengeluaran mengurangi isi amplopnya, jadi semua anggota tahu berapa yang masih boleh dipakai.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={openNew}>Buat amplop pertama</Button>
              <Button variant="secondary" onClick={executeCopy} loading={copyMutation.isPending}>Salin dari bulan lalu</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: narrow ? 12 : 16 }}>
              {envs.map((e) => (
                <Envelope
                  key={e.id}
                  compact={narrow}
                  no={e.no}
                  name={e.name}
                  color={e.color}
                  spent={e.spent}
                  limit={e.limit}
                  selected={!narrow && selected?.id === e.id}
                  onClick={() => pick(e)}
                />
              ))}
            </div>
            {!narrow && selected && (
              <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 24, boxShadow: '0 0 0 1px var(--line)', position: 'sticky', top: 0 }}>
                {detail}
              </div>
            )}
          </div>
        )}
      </div>

      {narrow && (
        <Sheet open={sheetOpen && !!selected} onClose={() => setSheetOpen(false)} fullHeight>
          {detail}
        </Sheet>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={handleClose}
        budget={editingBudget}
        yearMonth={selectedMonth}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus amplop"
        message="Amplop ini akan dihapus untuk bulan ini. Transaksinya tetap tersimpan."
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
        onConfirm={executeCopy}
        title="Salin amplop bulan lalu"
        message={`Sudah ada ${budgets.length} amplop di bulan ini. Melanjutkan akan menambah amplop dari bulan lalu.`}
        confirmLabel="Salin"
        loading={copyMutation.isPending}
      />
    </div>
  )
}
