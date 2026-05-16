import { useState, useEffect, useMemo } from 'react'
import {
  Calculator, ChevronDown, ChevronUp, Save, CheckCircle2,
  AlertCircle, Info,
} from 'lucide-react'
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
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils'
import { usePensionSettings, useSavePensionSettings, useInvestments } from '@/hooks/useInvestments'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'

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

const SCENARIO_COLORS = { 10: '#f59e0b', 15: '#3b82f6', 20: '#10b981' }

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PensionCalculator() {
  const toast = useToast()
  const { data: savedSettings, isError: settingsError } = usePensionSettings()
  const saveMutation = useSavePensionSettings()
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800 mb-2">Usia {label} tahun</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-medium text-gray-900">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kalkulator Dana Pensiun</h1>
          <p className="text-sm text-gray-400">Rencanakan masa pensiun lebih cerdas</p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleSave} loading={saveMutation.isPending}>
          <Save className="w-4 h-4" />
          Simpan
        </Button>
      </div>

      {/* Input form */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Data Kamu</p>
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
            className="flex items-center gap-1.5 text-sm text-primary font-medium mt-4 hover:underline"
          >
            {showAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Asumsi Perhitungan
          </button>

          {showAssumptions && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
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
        </CardContent>
      </Card>

      {settingsError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">
            Tabel belum tersedia. Jalankan file{' '}
            <code className="font-mono bg-red-100 px-1 rounded">supabase/migration_investments_pension.sql</code>{' '}
            di Supabase SQL Editor terlebih dahulu, lalu refresh halaman.
          </p>
        </div>
      )}

      {!result ? (
        <div className="py-12 text-center">
          <Calculator className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Isi gaji dan usia untuk melihat hasil perhitungan</p>
          {Number(form.currentAge) >= Number(form.targetAge) && form.currentAge && form.targetAge && (
            <p className="text-red-400 text-sm mt-1">Usia sekarang harus lebih muda dari target pensiun</p>
          )}
        </div>
      ) : (
        <>
          {/* Key results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Kebutuhan Bulanan saat Pensiun</p>
              <p className="text-base font-bold text-gray-900">
                {formatCurrency(Math.round(result.monthlyAtRetirement))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Setelah inflasi {form.inflationRate}% × {result.yearsToRetire} tahun
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 sm:col-span-2">
              <p className="text-xs text-gray-500 mb-1">Total Dana Pensiun yang Dibutuhkan</p>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(Math.round(result.totalNeeded))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Untuk {result.retirementYears} tahun masa pensiun (s/d usia {form.lifeExpectancy})
              </p>
            </div>
          </div>

          {/* 3 Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>3 Skenario Tabungan Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.scenarios.map((sc) => {
                  const isEnough = sc.achieved >= 100
                  const isGood = sc.achieved >= 50
                  return (
                    <div
                      key={sc.pct}
                      className={`rounded-xl border p-4 ${
                        isEnough
                          ? 'border-emerald-200 bg-emerald-50'
                          : isGood
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              sc.pct === 10
                                ? 'bg-amber-200 text-amber-800'
                                : sc.pct === 15
                                ? 'bg-blue-200 text-blue-800'
                                : 'bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {sc.pct === 10 ? 'Minimum' : sc.pct === 15 ? 'Ideal' : 'Agresif'} {sc.pct}%
                          </span>
                          {isEnough && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(Math.round(sc.monthly))} / bln
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-xs text-gray-400">Terkumpul saat pensiun</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(Math.round(sc.accumulated))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">% target tercapai</p>
                          <p className={`font-bold text-base ${isEnough ? 'text-emerald-600' : isGood ? 'text-blue-600' : 'text-amber-600'}`}>
                            {sc.achieved.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isEnough ? 'bg-emerald-500' : isGood ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, sc.achieved)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recommendation */}
              <div className="mt-4 flex items-start gap-2.5 bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">Untuk mencapai 100% target:</span>{' '}
                  Kamu perlu menabung{' '}
                  <span className="font-bold text-primary">
                    {formatCurrency(Math.round(result.requiredMonthly))}/bulan
                  </span>{' '}
                  ({result.totalNeeded > 0
                    ? ((result.requiredMonthly / Number(form.monthlySalary)) * 100).toFixed(1)
                    : 0}% dari gaji).
                  Mulai dari yang kamu mampu, dan tingkatkan setiap kali gaji naik. 💪
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projection Chart */}
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
                          <stop offset="5%" stopColor={SCENARIO_COLORS[p]} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={SCENARIO_COLORS[p]} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="age"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}thn`}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span className="text-xs text-gray-500">
                          {v.includes('10') ? 'Minimum 10%' : v.includes('15') ? 'Ideal 15%' : 'Agresif 20%'}
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
                <p className="text-xs text-gray-400 text-center mt-2">
                  Asumsi return {form.returnRate}%/tahun · Inflasi {form.inflationRate}%/tahun
                </p>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Perhitungan ini bersifat estimasi berdasarkan asumsi inflasi dan return investasi yang bisa berubah.
              Konsultasikan dengan perencana keuangan untuk perencanaan yang lebih akurat.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
