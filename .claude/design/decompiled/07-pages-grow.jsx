// pages-grow.jsx — Savings & Debts, Investments, Reports, Pension Calculator

const { useState: useStateGrow, useMemo: useMemoGrow } = React;

// ═══════════════════════════════════════════════════════════════════
// SAVINGS & DEBTS
// ═══════════════════════════════════════════════════════════════════
function SavingsDebts({ hideBalances }) {
  const { isMobile } = useViewport();
  const { GOALS, DEBTS } = window.MF;
  const [tab, setTab] = useStateGrow('savings');

  const totalSaved = GOALS.reduce((s, g) => s + g.saved, 0);
  const totalTarget = GOALS.reduce((s, g) => s + g.target, 0);
  const totalDebt = DEBTS.reduce((s, d) => s + (d.total - d.paid), 0);
  const totalMonthly = DEBTS.reduce((s, d) => s + d.monthly, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tab switch */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 16, alignSelf: 'flex-start' }}>
        {[
          { id:'savings', label:'Tabungan & Tujuan', icon:'target' },
          { id:'debts',   label:'Hutang & Cicilan',  icon:'coin' },
        ].map(o => (
          <button key={o.id} onClick={() => setTab(o.id)} style={{
            padding: '10px 18px', border: 'none', borderRadius: 12,
            background: tab === o.id ? 'var(--surface)' : 'transparent',
            color: tab === o.id ? 'var(--ink)' : 'var(--ink-3)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: tab === o.id ? 'var(--shadow-sm)' : 'none',
          }}>
            <Icon name={o.icon} size={16} /> {o.label}
          </button>
        ))}
      </div>

      {tab === 'savings' && (
        <>
          <Card padding={isMobile ? 22 : 28} radius="xl" style={{
            background: 'linear-gradient(135deg, #0EA5A4 0%, #0A6B6A 100%)', color: '#fff', border: 'none',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
            <div style={{ fontSize: 12, fontWeight: 600, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total Terkumpul</div>
            <div className="display num" style={{ fontSize: isMobile ? 34 : 44, marginTop: 4 }}>
              {hideBalances ? '••••••' : idr(totalSaved)}
            </div>
            <div style={{ marginTop: 12, maxWidth: 360 }}>
              <Progress value={totalSaved} max={totalTarget} color="#fff" track="rgba(255,255,255,.2)" height={8} />
              <div style={{ fontSize: 12, opacity: .85, marginTop: 8 }}>
                {Math.round((totalSaved/totalTarget)*100)}% menuju total target {idrShort(totalTarget)}
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tujuan Keluarga</h3>
            <button style={btnStyle({ tone: 'soft', size: 'sm' })}><Icon name="plus" size={14} stroke={2.2} /> Tujuan Baru</button>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
            {GOALS.map(g => {
              const pct = Math.round((g.saved / g.target) * 100);
              const members = g.members.map(memberById).filter(Boolean);
              const remaining = g.target - g.saved;
              const months = Math.ceil(remaining / 1_450_000);
              return (
                <Card key={g.id} padding={20}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <Ring value={pct} size={72} stroke={7} color={g.color} track="var(--surface-2)">
                      <span style={{ fontSize: 28 }}>{g.emoji}</span>
                    </Ring>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{g.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>Target {fmtDate(g.deadline)}</div>
                        </div>
                        <span className="display num" style={{ fontSize: 18, color: g.color }}>{pct}%</span>
                      </div>
                      <div className="num" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                        {hideBalances ? '••••' : idr(g.saved)} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>/ {idrShort(g.target)}</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Progress value={g.saved} max={g.target} color={g.color} height={6} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                    <AvatarStack members={members} size={24} gap={-7} />
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>≈ {months} bln lagi · {idrShort(remaining)}</span>
                    <button style={btnStyle({ tone: 'soft', size: 'sm' })}><Icon name="plus" size={13} stroke={2.2} /> Setor</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === 'debts' && (
        <>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)' }}>
            <Card padding={20} style={{ background: 'linear-gradient(135deg, #F472B6 0%, #BE3A82 100%)', color: '#fff', border: 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: .9, textTransform: 'uppercase', letterSpacing: '.03em' }}>Sisa Hutang</div>
              <div className="display num" style={{ fontSize: isMobile ? 22 : 30, marginTop: 6 }}>
                {hideBalances ? '••••' : idrShort(totalDebt)}
              </div>
            </Card>
            <Card padding={20}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Cicilan / Bulan</div>
              <div className="display num" style={{ fontSize: isMobile ? 22 : 30, marginTop: 6 }}>
                {hideBalances ? '••••' : idrShort(totalMonthly)}
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {DEBTS.map(dbt => {
              const pct = Math.round((dbt.paid / dbt.total) * 100);
              const remaining = dbt.total - dbt.paid;
              return (
                <Card key={dbt.id} padding={20}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 14,
                        background: dbt.color + '22', color: dbt.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Icon name="coin" size={24} /></div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{dbt.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{dbt.creditor}</div>
                      </div>
                    </div>
                    <Pill tone="warn" icon={<Icon name="calendar" size={11} />}>Tgl {dbt.due}</Pill>
                  </div>
                  <Progress value={dbt.paid} max={dbt.total} color={dbt.color} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Sisa</div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{hideBalances ? '••••' : idrShort(remaining)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Terbayar</div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: dbt.color }}>{pct}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Cicilan</div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{hideBalances ? '••••' : idrShort(dbt.monthly)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INVESTMENTS
// ═══════════════════════════════════════════════════════════════════
function Investments({ hideBalances }) {
  const { isMobile } = useViewport();
  const { INVESTMENTS } = window.MF;
  const totalValue = INVESTMENTS.reduce((s, i) => s + i.value, 0);
  const totalCost = INVESTMENTS.reduce((s, i) => s + i.units * i.avg, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalGain / totalCost;

  // group by type
  const byType = {};
  INVESTMENTS.forEach(i => { byType[i.type] = (byType[i.type] || 0) + i.value; });

  // fake portfolio curve
  const curve = [100, 102, 99, 104, 108, 106, 112, 115, 113, 119, 122, 126];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card padding={isMobile ? 22 : 28} radius="xl" style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-ink) 100%)', color: '#fff', border: 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total Portofolio</div>
            <div className="display num" style={{ fontSize: isMobile ? 34 : 44, marginTop: 4 }}>
              {hideBalances ? '••••••' : idr(totalValue)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.18)', padding: '4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                <Icon name="trending" size={13} stroke={2.4} /> +{(totalGainPct*100).toFixed(1)}%
              </span>
              <span style={{ fontSize: 13, opacity: .9 }} className="num">{hideBalances ? '' : `+${idrShort(totalGain)} sepanjang waktu`}</span>
            </div>
          </div>
          <div style={{ flex: '1 1 200px', maxWidth: 280, display: 'flex', alignItems: 'flex-end' }}>
            <Sparkbar data={curve} height={70} color="rgba(255,255,255,.9)" track="rgba(255,255,255,.25)" />
          </div>
        </div>
      </Card>

      {/* Allocation */}
      <Card padding={isMobile ? 18 : 22}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Alokasi Aset</h3>
        <div style={{ display: 'flex', gap: 4, borderRadius: 999, overflow: 'hidden', height: 14, marginBottom: 14 }}>
          {Object.entries(byType).map(([type, val], i) => {
            const colors = { 'Reksa Dana':'#0EA5A4', 'Saham':'#F472B6', 'Emas':'#F59E0B' };
            return <div key={type} style={{ width: `${(val/totalValue)*100}%`, background: colors[type] || 'var(--accent)' }} />;
          })}
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([type, val]) => {
            const colors = { 'Reksa Dana':'#0EA5A4', 'Saham':'#F472B6', 'Emas':'#F59E0B' };
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[type] }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{type}</div>
                  <div className="num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{Math.round((val/totalValue)*100)}% · {idrShort(val)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Holdings */}
      <Card padding={isMobile ? 8 : 16}>
        <h3 style={{ margin: 0, padding: isMobile ? '10px 10px 6px' : '4px 6px 14px', fontSize: 16, fontWeight: 700 }}>Kepemilikan</h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {INVESTMENTS.map(inv => {
            const up = inv.change >= 0;
            return (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderTop: '1px solid var(--line)' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: inv.color + '22', color: inv.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12,
                }}>{inv.type === 'Emas' ? '🪙' : inv.type === 'Saham' ? inv.name.slice(0,4) : '📊'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{inv.broker} · {inv.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{hideBalances ? '••••' : idrShort(inv.value)}</div>
                  <div className="num" style={{ fontSize: 12, fontWeight: 600, color: up ? 'var(--good)' : 'var(--bad)' }}>
                    {up ? '+' : ''}{(inv.change*100).toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════
function Reports({ hideBalances }) {
  const { isMobile } = useViewport();
  const { TRANSACTIONS, CATEGORIES, FAMILY } = window.MF;

  // Category breakdown (expense)
  const catTotals = {};
  TRANSACTIONS.forEach(t => {
    if (t.amount >= 0) return;
    catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
  });
  const catList = Object.entries(catTotals)
    .map(([id, amt]) => ({ cat: categoryById(id), amt }))
    .sort((a, b) => b.amt - a.amt);
  const totalExpense = catList.reduce((s, c) => s + c.amt, 0);

  // 6-month trend (synthetic)
  const trend = [
    { m: 'Des', in: 19_200_000, out: 14_800_000 },
    { m: 'Jan', in: 20_700_000, out: 16_200_000 },
    { m: 'Feb', in: 21_400_000, out: 15_100_000 },
    { m: 'Mar', in: 23_100_000, out: 17_800_000 },
    { m: 'Apr', in: 20_700_000, out: 16_900_000 },
    { m: 'Mei', in: 23_100_000, out: 12_485_000 },
  ];
  const maxTrend = Math.max(...trend.flatMap(t => [t.in, t.out]));

  // member breakdown
  const memberTotals = FAMILY.members.map(m => ({
    member: m,
    amt: TRANSACTIONS.filter(t => t.member === m.id && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
  }));

  // donut for categories
  let acc = 0;
  const donutSegs = catList.map(({ cat, amt }) => {
    const start = acc / totalExpense;
    acc += amt;
    return { cat, amt, start, end: acc / totalExpense };
  });
  const R = 70, C = 2 * Math.PI * R;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Minggu', 'Bulan', 'Tahun'].map((p, i) => (
            <button key={p} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--line)',
              background: i === 1 ? 'var(--ink)' : 'transparent',
              color: i === 1 ? 'var(--bg)' : 'var(--ink-2)', cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
        <button style={btnStyle({ tone: 'ghost', size: 'sm' })}><Icon name="download" size={14} /> Ekspor</button>
      </div>

      {/* Income/Expense trend */}
      <Card padding={isMobile ? 18 : 24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Arus Kas 6 Bulan</h3>
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} /> Masuk</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ink-3)' }} /> Keluar</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 8 : 18, height: 180 }}>
          {trend.map(t => (
            <div key={t.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
                <div title={idrShort(t.in)} style={{ width: isMobile ? 10 : 18, height: `${(t.in/maxTrend)*100}%`, background: 'var(--accent)', borderRadius: '6px 6px 0 0' }} />
                <div title={idrShort(t.out)} style={{ width: isMobile ? 10 : 18, height: `${(t.out/maxTrend)*100}%`, background: 'var(--ink-3)', borderRadius: '6px 6px 0 0' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{t.m}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
        {/* Donut by category */}
        <Card padding={isMobile ? 18 : 24}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>Pengeluaran per Kategori</h3>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0, margin: '0 auto' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {donutSegs.map(({ cat, start, end }, i) => {
                  const dash = (end - start) * C;
                  const offset = start * C;
                  return (
                    <circle key={i} cx="90" cy="90" r={R} fill="none"
                      stroke={cat.color} strokeWidth="26"
                      strokeDasharray={`${dash} ${C - dash}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90 90 90)" />
                  );
                })}
                <circle cx="90" cy="90" r="44" fill="var(--surface)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>TOTAL</div>
                <div className="display num" style={{ fontSize: 18 }}>{hideBalances ? '••••' : idrShort(totalExpense)}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catList.slice(0, 6).map(({ cat, amt }) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{cat.emoji}</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{cat.name}</span>
                  <span className="num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{Math.round((amt/totalExpense)*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Member breakdown */}
        <Card padding={isMobile ? 18 : 24}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>Kontribusi per Anggota</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {memberTotals.sort((a,b)=>b.amt-a.amt).map(({ member, amt }) => {
              const max = Math.max(...memberTotals.map(x=>x.amt), 1);
              return (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={member} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{member.name} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>· {member.role}</span></span>
                      <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{hideBalances ? '••••' : idrShort(amt)}</span>
                    </div>
                    <Progress value={amt} max={max} color={member.color} height={7} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PENSION CALCULATOR
// ═══════════════════════════════════════════════════════════════════
function PensionCalculator() {
  const { isMobile } = useViewport();
  const P = window.MF.PENSION;
  const [retireAge, setRetireAge] = useStateGrow(P.retireAge);
  const [monthlyExpense, setMonthlyExpense] = useStateGrow(P.monthlyExpense);
  const [contribution, setContribution] = useStateGrow(P.monthlyContribution);
  const [returnRate, setReturnRate] = useStateGrow(P.returnRate * 100);

  const yearsToRetire = retireAge - P.currentAge;
  const yearsInRetirement = 25;
  // Future value of current savings + contributions
  const r = returnRate / 100 / 12;
  const n = yearsToRetire * 12;
  const fvSavings = P.currentSavings * Math.pow(1 + r, n);
  const fvContrib = contribution * ((Math.pow(1 + r, n) - 1) / r);
  const totalAtRetirement = fvSavings + fvContrib;
  // Needed: monthly expense inflated, x months in retirement
  const inflatedExpense = monthlyExpense * Math.pow(1 + P.inflation, yearsToRetire);
  const needed = inflatedExpense * 12 * yearsInRetirement * 0.6; // simplified w/ drawdown
  const gap = totalAtRetirement - needed;
  const onTrack = gap >= 0;

  // projection curve
  const points = [];
  for (let y = 0; y <= yearsToRetire; y++) {
    const nn = y * 12;
    const fv = P.currentSavings * Math.pow(1 + r, nn) + contribution * ((Math.pow(1 + r, nn) - 1) / (r || 1));
    points.push(fv);
  }
  const maxPoint = Math.max(...points, needed);

  const SliderRow = ({ label, value, display, min, max, step, onChange }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
        <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-ink)' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.1fr', alignItems: 'flex-start' }}>
      {/* Inputs */}
      <Card padding={isMobile ? 20 : 26}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="calc" size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Simulasi Dana Pensiun</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Budi, usia {P.currentAge} tahun</div>
          </div>
        </div>
        <SliderRow label="Usia pensiun" value={retireAge} display={`${retireAge} thn`} min={50} max={70} step={1} onChange={setRetireAge} />
        <SliderRow label="Kebutuhan bulanan saat ini" value={monthlyExpense} display={idrShort(monthlyExpense)} min={5_000_000} max={30_000_000} step={500_000} onChange={setMonthlyExpense} />
        <SliderRow label="Setoran per bulan" value={contribution} display={idrShort(contribution)} min={500_000} max={15_000_000} step={250_000} onChange={setContribution} />
        <SliderRow label="Asumsi return / tahun" value={returnRate} display={`${returnRate.toFixed(1)}%`} min={3} max={15} step={0.5} onChange={setReturnRate} />

        <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 14, fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
          <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Simulasi memperhitungkan inflasi {(P.inflation*100).toFixed(1)}% & masa pensiun {yearsInRetirement} tahun. Estimasi, bukan jaminan.</span>
        </div>
      </Card>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding={isMobile ? 22 : 28} radius="xl" style={{
          background: onTrack ? 'linear-gradient(135deg, #16A34A 0%, #0F7A37 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
          color: '#fff', border: 'none', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <Icon name={onTrack ? 'check' : 'info'} size={18} /> {onTrack ? 'Kamu di jalur yang tepat!' : 'Perlu sedikit penyesuaian'}
          </div>
          <div style={{ fontSize: 12, opacity: .85 }}>Estimasi dana saat usia {retireAge}</div>
          <div className="display num" style={{ fontSize: isMobile ? 32 : 42, marginTop: 4 }}>{idr(totalAtRetirement)}</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 8 }}>
            {onTrack ? `Surplus ${idrShort(gap)} dari kebutuhan` : `Kurang ${idrShort(Math.abs(gap))} dari kebutuhan`}
          </div>
        </Card>

        <Card padding={isMobile ? 18 : 22}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Proyeksi Pertumbuhan</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {points.map((p, i) => (
              <div key={i} style={{ flex: 1, height: `${(p/maxPoint)*100}%`, background: i === points.length-1 ? 'var(--accent)' : 'var(--accent-soft)', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--ink-3)' }}>
            <span>Sekarang</span>
            <span>{yearsToRetire} tahun lagi</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Kebutuhan</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{idrShort(needed)}</div>
            </div>
            <div style={{ flex: 1, padding: 12, background: 'var(--surface-2)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total setoran</div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{idrShort(contribution * (retireAge - P.currentAge) * 12)}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { SavingsDebts, Investments, Reports, PensionCalculator });
