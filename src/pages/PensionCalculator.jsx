import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { HeroCard } from '@/components/ui/HeroCard'
import { StatTile } from '@/components/ui/StatTile'
import { Pill } from '@/components/ui/Pill'
import { Progress } from '@/components/ui/Progress'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, idrShort, toDateStr } from '@/lib/utils'
import { usePensionSettings, useSavePensionSettings, useInvestments } from '@/hooks/useInvestments'
import { useSavingsGoals, useCreateSavingsGoal } from '@/hooks/useSavingsGoals'

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcPensionNeeds({
  monthlySalary,
  currentAge,
  targetAge,
  existingFund,
  inflationRate,
  returnRate,
  lifeExpectancy,
  monthlyExpensePct,
  bpjsBalance,
}) {
  const yearsToRetire = targetAge - currentAge
  const retirementYears = lifeExpectancy - targetAge
  if (yearsToRetire <= 0 || retirementYears <= 0) return null

  const inf = inflationRate / 100
  const ret = returnRate / 100
  const monthlyAtRetirement = monthlySalary * (monthlyExpensePct / 100) * Math.pow(1 + inf, yearsToRetire)
  const annualAtRetirement = monthlyAtRetirement * 12

  // Present value of annuity at retirement
  const realReturn = ((1 + ret) / (1 + inf) - 1)
  let totalNeeded
  if (Math.abs(realReturn) < 0.0001) {
    totalNeeded = annualAtRetirement * retirementYears
  } else {
    totalNeeded = annualAtRetirement * ((1 - Math.pow(1 + realReturn, -retirementYears)) / realReturn)
  }

  const adjustedNeeded = Math.max(0, totalNeeded - existingFund - bpjsBalance)

  // Future value of current saving with compound interest
  const monthlyRet = Math.pow(1 + ret, 1 / 12) - 1
  const months = yearsToRetire * 12

  const calcSaving = (monthlyContrib) => {
    const fvContrib = monthlyContrib > 0
      ? monthlyContrib * ((Math.pow(1 + monthlyRet, months) - 1) / monthlyRet)
      : 0
    return fvContrib
  }

  const scenarios = [10, 15, 20].map((pct) => {
    const monthly = monthlySalary * (pct / 100)
    const accumulated = calcSaving(monthly)
    const achieved = totalNeeded > 0 ? Math.min(100, (accumulated / totalNeeded) * 100) : 100
    return { pct, monthly, accumulated, achieved }
  })

  // Required monthly saving to hit 100%
  const requiredMonthly = months > 0 && monthlyRet > 0
    ? adjustedNeeded / ((Math.pow(1 + monthlyRet, months) - 1) / monthlyRet)
    : adjustedNeeded / Math.max(1, months)

  return {
    monthlyAtRetirement,
    totalNeeded,
    adjustedNeeded,
    yearsToRetire,
    retirementYears,
    scenarios,
    requiredMonthly,
  }
}

function calcProjectionData(monthlySalary, currentAge, targetAge, returnRate, scenarios) {
  const ret = returnRate / 100
  const monthlyRet = Math.pow(1 + ret, 1 / 12) - 1
  const years = targetAge - currentAge

  const points = []
  for (let y = 0; y <= years; y += Math.max(1, Math.floor(years / 20))) {
    const m = y * 12
    const point = { age: currentAge + y }
    scenarios.forEach((sc) => {
      const fv = sc.monthly > 0 && monthlyRet > 0
        ? sc.monthly * ((Math.pow(1 + monthlyRet, m) - 1) / monthlyRet)
        : sc.monthly * m
      point[`skenario_${sc.pct}`] = Math.round(fv)
    })
    points.push(point)
  }
  return points
}

function formatYAxis(v) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return v
}

const SCENARIO_COLORS = { 10: '#F59E0B', 15: '#0EA5A4', 20: '#16A34A' }
const SCENARIO_LABEL = { 10: 'Minimum', 15: 'Ideal', 20: 'Agresif' }

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PensionCalculator() {
  const toast = useToast()
  const navigate = useNavigate()
  const { data: savedSettings, isError: settingsError } = usePensionSettings()
  const saveMutation = useSavePensionSettings()
  const createGoalMutation = useCreateSavingsGoal()
  const { data: investments } = useInvestments()
  const { data: savingsGoals } = useSavingsGoals()
  const [showAssumptions, setShowAssumptions] = useState(false)

  const [form, setForm] = useState({
    monthlySalary: '',
    currentAge: '',
    targetAge: '60',
    existingFund: '0',
    inflationRate: '5',
    returnRate: '8',
    lifeExpectancy: '80',
    monthlyExpensePct: '70',
    bpjsBalance: '0',
  })

  useEffect(() => {
    if (savedSettings) {
      setForm({
        monthlySalary: savedSettings.monthly_salary || '',
        currentAge: savedSettings.current_age || '',
        targetAge: savedSettings.target_age || '60',
        existingFund: savedSettings.existing_fund || '0',
        inflationRate: savedSettings.inflation_rate || '5',
        returnRate: savedSettings.return_rate || '8',
        lifeExpectancy: savedSettings.life_expectancy || '80',
        monthlyExpensePct: savedSettings.monthly_expense_pct || '70',
        bpjsBalance: savedSettings.bpjs_balance || '0',
      })
    }
  }, [savedSettings])

  const set = (k) => (e) => { const value = e.target.value; setForm((f) => ({ ...f, [k]: value })) }

  // Calculate total wealth from investments and savings
  const totalInvestment = investments?.reduce((s, i) => {
    const price = Number(i.current_price || i.buy_price || 0)
    const qty = Number(i.quantity || 0)
    return s + (price * qty)
  }, 0) || 0
  const totalSavings = savingsGoals?.reduce((s, g) => s + Number(g.current_amount || 0), 0) || 0
  const totalExistingFund = totalInvestment + totalSavings

  const handleSyncFromData = () => {
    if (totalExistingFund > 0) {
      setForm((f) => ({ ...f, existingFund: String(Math.round(totalExistingFund)) }))
      toast.success(`Dana terkumpul diperbarui: ${formatCurrency(totalExistingFund)}`)
    } else {
      toast.info('Belum ada data investasi atau tabungan')
    }
  }

  const result = useMemo(() => {
    const salary = Number(form.monthlySalary)
    const age = Number(form.currentAge)
    const target = Number(form.targetAge)
    if (!salary || !age || !target || age >= target) return null
    return calcPensionNeeds({
      monthlySalary: salary,
      currentAge: age,
      targetAge: target,
      existingFund: Number(form.existingFund) || 0,
      inflationRate: Number(form.inflationRate) || 5,
      returnRate: Number(form.returnRate) || 8,
      lifeExpectancy: Number(form.lifeExpectancy) || 80,
      monthlyExpensePct: Number(form.monthlyExpensePct) || 70,
      bpjsBalance: Number(form.bpjsBalance) || 0,
    })
  }, [form])

  const projectionData = useMemo(() => {
    if (!result) return []
    return calcProjectionData(
      Number(form.monthlySalary),
      Number(form.currentAge),
      Number(form.targetAge),
      Number(form.returnRate) || 8,
      result.scenarios
    )
  }, [result, form.monthlySalary, form.currentAge, form.targetAge, form.returnRate])

  const handleSave = async () => {
    if (!result) { toast.error('Isi data terlebih dahulu'); return }
    try {
      await saveMutation.mutateAsync({
        monthly_salary: Number(form.monthlySalary),
        current_age: Number(form.currentAge),
        target_age: Number(form.targetAge),
        existing_fund: Number(form.existingFund) || 0,
        inflation_rate: Number(form.inflationRate) || 5,
        return_rate: Number(form.returnRate) || 8,
        life_expectancy: Number(form.lifeExpectancy) || 80,
        monthly_expense_pct: Number(form.monthlyExpensePct) || 70,
        bpjs_balance: Number(form.bpjsBalance) || 0,
      })
      toast.success('Data tersimpan')
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan')
    }
  }

  const handleCreateGoal = async () => {
    if (!result) return
    const targetDate = new Date()
    targetDate.setFullYear(targetDate.getFullYear() + result.yearsToRetire)

    try {
      await createGoalMutation.mutateAsync({
        name: `Dana Pensiun (Usia ${form.targetAge})`,
        target_amount: Math.round(result.totalNeeded),
        current_amount: Math.round(Number(form.existingFund) || 0),
        target_date: toDateStr(targetDate),
        icon: '🏖️',
        color: '#f59e0b',
      })
      toast.success('Target tabungan dana pensiun dibuat! Lihat & lacak progressnya di Tabungan & Hutang.')
      navigate('/savings')
    } catch (err) {
      toast.error(err.message || 'Gagal membuat target tabungan')
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)',
          boxShadow: 'var(--shadow-md)',
          padding: 12,
          fontSize: 13,
        }}
      >
        <p className="font-semibold" style={{ color: 'var(--ink)', marginBottom: 8 }}>Usia {label} tahun</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span style={{ color: 'var(--ink-3)' }}>
              {SCENARIO_LABEL[String(p.name).replace('skenario_', '')] || p.name}:
            </span>
            <span className="font-mono font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  const ageInvalid = Boolean(
    form.currentAge && form.targetAge && Number(form.currentAge) >= Number(form.targetAge)
  )

  // Representative projection = "Ideal" scenario (nabung 15% dari gaji)
  const ideal = result?.scenarios?.[1]
  const projectedFund = ideal?.accumulated || 0
  const gap = projectedFund - (result?.totalNeeded || 0)
  const onTrack = gap >= 0
  const totalIdealContribution = ideal ? ideal.monthly * result.yearsToRetire * 12 : 0

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--ink)' }}>
            Kalkulator Dana Pensiun
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Rencanakan masa pensiun lebih cerdas
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleSave} loading={saveMutation.isPending}>
          <Icon name="check" size={14} stroke={2.5} />
          Simpan
        </Button>
      </div>

      {settingsError && (
        <div
          className="flex items-start gap-2"
          style={{
            background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))',
            border: '1px solid color-mix(in srgb, var(--bad) 30%, var(--surface))',
            borderRadius: 'var(--r-md)',
            padding: 12,
          }}
        >
          <Icon name="info" size={16} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'var(--bad)' }}>
            Tabel belum tersedia. Jalankan file{' '}
            <code className="font-mono px-1 rounded" style={{ background: 'color-mix(in srgb, var(--bad) 16%, var(--surface))' }}>
              supabase/migration_investments_pension.sql
            </code>{' '}
            di Supabase SQL Editor terlebih dahulu, lalu refresh halaman.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4 items-start">
        {/* LEFT — inputs */}
        <Card padding={24}>
          <div className="flex items-center gap-3 mb-5">
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--accent-soft)', color: 'var(--accent-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Icon name="calc" size={22} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Simulasi Dana Pensiun
              </h3>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Isi data kamu untuk melihat estimasi
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gaji Bersih / Bulan (Rp)"
              type="number"
              placeholder="5000000"
              value={form.monthlySalary}
              onChange={set('monthlySalary')}
              helpText="Pendapatan bersih setelah pajak"
            />
            <Input
              label="Usia Sekarang (tahun)"
              type="number"
              placeholder="30"
              value={form.currentAge}
              onChange={set('currentAge')}
            />
            <Input
              label="Target Usia Pensiun"
              type="number"
              placeholder="60"
              value={form.targetAge}
              onChange={set('targetAge')}
            />
            <div className="space-y-2">
              <Input
                label="Dana Pensiun Terkumpul (Rp)"
                type="number"
                placeholder="0"
                value={form.existingFund}
                onChange={set('existingFund')}
                helpText="Tabungan & investasi yang sudah ada"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSyncFromData}
                className="w-full"
              >
                Sinkronkan dari data saya ({formatCurrency(totalExistingFund)})
              </Button>
            </div>
          </div>

          {/* Assumptions toggle */}
          <button
            type="button"
            onClick={() => setShowAssumptions((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium mt-4"
            style={{ color: 'var(--accent-ink)' }}
          >
            <Icon
              name="chevronD"
              size={16}
              style={{ transform: showAssumptions ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
            />
            Asumsi Perhitungan
          </button>

          {showAssumptions && (
            <div
              className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <Input
                label="Inflasi (% / tahun)"
                type="number"
                step="0.1"
                value={form.inflationRate}
                onChange={set('inflationRate')}
              />
              <Input
                label="Return Investasi (%/tahun)"
                type="number"
                step="0.1"
                value={form.returnRate}
                onChange={set('returnRate')}
              />
              <Input
                label="Usia Harapan Hidup"
                type="number"
                value={form.lifeExpectancy}
                onChange={set('lifeExpectancy')}
              />
              <Input
                label="Kebutuhan Saat Pensiun (%)"
                type="number"
                value={form.monthlyExpensePct}
                onChange={set('monthlyExpensePct')}
                helpText="% dari gaji sekarang"
              />
              <Input
                label="Saldo BPJS JHT (Rp)"
                type="number"
                placeholder="0"
                value={form.bpjsBalance}
                onChange={set('bpjsBalance')}
                helpText="Opsional"
              />
            </div>
          )}

          <div
            className="mt-4 flex gap-2"
            style={{
              padding: 14, background: 'var(--surface-2)',
              borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--ink-3)',
            }}
          >
            <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Simulasi memperhitungkan inflasi {form.inflationRate}%/tahun & masa pensiun{' '}
              {result ? result.retirementYears : '—'} tahun. Estimasi, bukan jaminan.
            </span>
          </div>
        </Card>

        {/* RIGHT — results */}
        <div className="space-y-4">
          {!result ? (
            <Card padding={28} className="text-center">
              <Icon
                name="calc"
                size={40}
                style={{ color: 'var(--ink-3)', display: 'block', margin: '0 auto 12px' }}
              />
              <p style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                Isi gaji dan usia untuk melihat hasil perhitungan
              </p>
              {ageInvalid && (
                <p style={{ color: 'var(--bad)', fontSize: 13, marginTop: 4 }}>
                  Usia sekarang harus lebih muda dari target pensiun
                </p>
              )}
            </Card>
          ) : (
            <>
              {/* Hero — projected fund vs needs */}
              <HeroCard
                gradientFrom={onTrack ? '#16A34A' : '#F59E0B'}
                gradientTo={onTrack ? '#0F7A37' : '#B45309'}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={onTrack ? 'check' : 'info'} size={15} stroke={2.5} />
                    {onTrack ? 'Kamu di jalur yang tepat!' : 'Perlu sedikit penyesuaian'}
                  </span>
                }
                value={formatCurrency(Math.round(projectedFund))}
                sub={`Estimasi dana saat usia ${form.targetAge} · skenario ideal (nabung 15% gaji)`}
                footer={
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 8 }}>
                    {onTrack
                      ? `Surplus ${formatCurrency(Math.round(gap))} dari kebutuhan`
                      : `Kurang ${formatCurrency(Math.round(Math.abs(gap)))} dari kebutuhan`}
                  </div>
                }
              />

              {/* Key figures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatTile
                  label="Kebutuhan / bln pensiun"
                  value={idrShort(Math.round(result.monthlyAtRetirement))}
                  sub={`Inflasi ${form.inflationRate}% × ${result.yearsToRetire} th`}
                />
                <StatTile
                  label="Total dana dibutuhkan"
                  value={idrShort(Math.round(result.totalNeeded))}
                  sub={`s/d usia ${form.lifeExpectancy}`}
                />
                <StatTile
                  label="Total setoran ideal"
                  value={idrShort(Math.round(totalIdealContribution))}
                  sub={`${result.yearsToRetire} th × 12 bln`}
                />
              </div>

              {/* Scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle>3 Skenario Tabungan Bulanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.scenarios.map((sc) => {
                      const isEnough = sc.achieved >= 100
                      const isGood = sc.achieved >= 50
                      const tone = isEnough ? 'good' : isGood ? 'accent' : 'warn'
                      const barColor = isEnough
                        ? 'var(--good)'
                        : isGood
                          ? 'var(--accent)'
                          : 'var(--warn)'
                      return (
                        <div
                          key={sc.pct}
                          style={{
                            borderRadius: 'var(--r-md)',
                            border: '1px solid var(--line)',
                            background: 'var(--surface-2)',
                            padding: 16,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <Pill tone={tone} size="sm" icon={isEnough ? <Icon name="check" size={12} stroke={2.5} /> : null}>
                              {SCENARIO_LABEL[sc.pct]} {sc.pct}%
                            </Pill>
                            <span className="font-mono text-sm font-bold" style={{ color: 'var(--ink)' }}>
                              {formatCurrency(Math.round(sc.monthly))} / bln
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>Terkumpul saat pensiun</p>
                              <p className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                                {formatCurrency(Math.round(sc.accumulated))}
                              </p>
                            </div>
                            <div>
                              <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>% target tercapai</p>
                              <p className="font-mono font-bold text-base" style={{ color: barColor }}>
                                {sc.achieved.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <Progress
                            value={Math.min(100, sc.achieved)}
                            max={100}
                            color={barColor}
                            height={8}
                            track="var(--surface)"
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Recommendation */}
                  <div
                    className="mt-4 flex items-start gap-2.5"
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--line)',
                      padding: 14,
                    }}
                  >
                    <Icon name="info" size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                    <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                      <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                        Untuk mencapai 100% target:
                      </span>{' '}
                      Kamu perlu menabung{' '}
                      <span className="font-mono font-bold" style={{ color: 'var(--accent-ink)' }}>
                        {formatCurrency(Math.round(result.requiredMonthly))}/bulan
                      </span>{' '}
                      ({result.totalNeeded > 0
                        ? ((result.requiredMonthly / Number(form.monthlySalary)) * 100).toFixed(1)
                        : 0}% dari gaji).
                      Mulai dari yang kamu mampu, dan tingkatkan setiap kali gaji naik. 💪
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full mt-3"
                    onClick={handleCreateGoal}
                    loading={createGoalMutation.isPending}
                  >
                    <Icon name="target" size={16} />
                    Jadikan Target Tabungan
                  </Button>
                </CardContent>
              </Card>

              {/* Projection chart */}
              {projectionData.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Proyeksi Pertumbuhan Dana Pensiun</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={projectionData}>
                        <defs>
                          {[10, 15, 20].map((p) => (
                            <linearGradient key={p} id={`grad${p}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SCENARIO_COLORS[p]} stopOpacity={0.22} />
                              <stop offset="95%" stopColor={SCENARIO_COLORS[p]} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis
                          dataKey="age"
                          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${v}thn`}
                        />
                        <YAxis
                          tickFormatter={formatYAxis}
                          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => (
                            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                              {SCENARIO_LABEL[String(v).replace('skenario_', '')]} {String(v).replace('skenario_', '')}%
                            </span>
                          )}
                        />
                        {[10, 15, 20].map((p) => (
                          <Area
                            key={p}
                            type="monotone"
                            dataKey={`skenario_${p}`}
                            name={`skenario_${p}`}
                            stroke={SCENARIO_COLORS[p]}
                            fill={`url(#grad${p})`}
                            strokeWidth={2}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center mt-2" style={{ color: 'var(--ink-3)' }}>
                      Asumsi return {form.returnRate}%/tahun · Inflasi {form.inflationRate}%/tahun
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <div
                className="flex items-start gap-2"
                style={{
                  background: 'color-mix(in srgb, var(--warn) 12%, var(--surface))',
                  border: '1px solid color-mix(in srgb, var(--warn) 30%, var(--surface))',
                  borderRadius: 'var(--r-md)',
                  padding: 12,
                }}
              >
                <Icon name="info" size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'var(--warn)' }}>
                  Perhitungan ini bersifat estimasi berdasarkan asumsi inflasi dan return investasi yang bisa berubah.
                  Konsultasikan dengan perencana keuangan untuk perencanaan yang lebih akurat.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
