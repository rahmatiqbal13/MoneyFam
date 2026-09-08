// pages-core.jsx — Dashboard, Transactions, Wallets, Budget, Categories

const { useState: useStateCore, useMemo: useMemoCore } = React;

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ onNav, hideBalances, toggleHide }) {
  const { isMobile } = useViewport();
  const { WALLETS, TRANSACTIONS, BUDGETS, GOALS, FAMILY } = window.MF;

  // Totals
  const totalBalance = WALLETS.reduce((s, w) => s + w.balance, 0);
  const monthIncome = TRANSACTIONS.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthExpense = TRANSACTIONS.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalSpent = BUDGETS.reduce((s, b) => s + b.spent, 0);
  const leftToSpend = totalBudget - totalSpent;

  // Spend per member (this month)
  const memberSpend = FAMILY.members.map(m => {
    const sum = TRANSACTIONS
      .filter(t => t.member === m.id && t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return { member: m, amount: sum };
  });
  const maxMemberSpend = Math.max(...memberSpend.map(x => x.amount), 1);

  // Recent
  const recent = [...TRANSACTIONS].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  // 30-day expense spark
  const dayBuckets = Array.from({ length: 14 }, () => 0);
  TRANSACTIONS.forEach(t => {
    if (t.amount >= 0) return;
    const today = new Date(2026, 4, 21);
    const d = new Date(t.date);
    const offset = Math.floor((today - d) / (1000*60*60*24));
    if (offset >= 0 && offset < 14) dayBuckets[13 - offset] += Math.abs(t.amount);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero balance card */}
      <Card padding={isMobile ? 20 : 28} radius="xl" style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-ink) 100%)',
        color: '#fff', border: 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: .8, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>
              Total Saldo Keluarga
            </div>
            <div className="display num" style={{ fontSize: isMobile ? 36 : 48, lineHeight: 1.05, marginBottom: 4 }}>
              {hideBalances ? '••••••' : idr(totalBalance)}
            </div>
            <div style={{ fontSize: 13, opacity: .8 }}>{WALLETS.length} kantong aktif</div>
          </div>
          <button onClick={toggleHide} style={{
            ...btnIconStyle(), background: 'rgba(255,255,255,.15)', color: '#fff',
            backdropFilter: 'blur(8px)',
          }}>
            <Icon name={hideBalances ? 'eye' : 'eyeOff'} size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22, position: 'relative' }}>
          <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,.12)', borderRadius: 'var(--r-md)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, opacity: .8, marginBottom: 4 }}>
              <Icon name="arrowDown" size={12} stroke={2.5} /> PEMASUKAN
            </div>
            <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>
              {hideBalances ? '••••' : idrShort(monthIncome)}
            </div>
          </div>
          <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,.12)', borderRadius: 'var(--r-md)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, opacity: .8, marginBottom: 4 }}>
              <Icon name="arrowUp" size={12} stroke={2.5} /> PENGELUARAN
            </div>
            <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>
              {hideBalances ? '••••' : idrShort(Math.abs(monthExpense))}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick actions row (mobile) */}
      {isMobile && (
        <div className="scroll-x" style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
          {[
            { id:'add',      label:'Catat',      icon:'plus',     color:'var(--accent)' },
            { id:'transfer', label:'Transfer',   icon:'swap',     color:'#F472B6' },
            { id:'goal',     label:'Tabungan',   icon:'target',   color:'#F59E0B' },
            { id:'debt',     label:'Hutang',     icon:'coin',     color:'#8B5CF6' },
            { id:'budget',   label:'Anggaran',   icon:'pie',      color:'#0EA5A4' },
          ].map(a => (
            <button key={a.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              minWidth: 64,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 18,
                background: a.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
              }}><Icon name={a.icon} size={22} stroke={2.2} /></div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Money left to spend + Spark */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr' }}>
        <Card padding={20}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Sisa Bulan Ini</div>
              <div className="display num" style={{ fontSize: 30, marginTop: 4, color: leftToSpend > 0 ? 'var(--ink)' : 'var(--bad)' }}>
                {hideBalances ? '••••••' : idr(leftToSpend)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                dari anggaran {idrShort(totalBudget)} • 10 hari tersisa
              </div>
            </div>
            <Pill tone={leftToSpend > 0 ? 'good' : 'bad'} icon={<Icon name={leftToSpend > 0 ? 'arrowDown' : 'arrowUp'} size={11} stroke={2.5} />}>
              {Math.round((totalSpent / totalBudget) * 100)}%
            </Pill>
          </div>
          <Progress value={totalSpent} max={totalBudget} color="var(--accent)" height={10} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>
            <span>Terpakai {idrShort(totalSpent)}</span>
            <span>Target {idrShort(totalBudget)}</span>
          </div>
        </Card>

        <Card padding={20}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Pengeluaran 14 Hari</div>
              <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>Rata-rata {idrShort(dayBuckets.reduce((a,b)=>a+b,0)/14)}/hari</div>
            </div>
          </div>
          <Sparkbar data={dayBuckets} height={64} color="var(--accent)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--ink-3)' }}>
            <span>14 hari lalu</span>
            <span>Hari ini</span>
          </div>
        </Card>
      </div>

      {/* Family spend (the family-first centerpiece) */}
      <Card padding={isMobile ? 18 : 24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="family" size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pengeluaran per Anggota</h3>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Bulan Mei 2026</div>
          </div>
          <button onClick={() => onNav('reports')} style={{ ...btnStyle({ tone:'ghost', size:'sm' }) }}>
            Detail <Icon name="chevronR" size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
          {memberSpend.map(({ member, amount }) => (
            <div key={member.id} style={{
              background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
              padding: 14, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar member={member} size={36} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{member.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{member.role}</div>
                </div>
              </div>
              <div className="num" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {hideBalances ? '••••' : idrShort(amount)}
              </div>
              <Progress value={amount} max={maxMemberSpend} color={member.color} height={5} />
            </div>
          ))}
        </div>
      </Card>

      {/* Recent + Goals */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr' }}>
        <Card padding={isMobile ? 18 : 22}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Transaksi Terbaru</h3>
            <button onClick={() => onNav('transactions')} style={btnStyle({ tone: 'ghost', size: 'sm' })}>
              Semua <Icon name="chevronR" size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map(t => <TransactionRow key={t.id} txn={t} hideBalances={hideBalances} />)}
          </div>
        </Card>

        <Card padding={isMobile ? 18 : 22}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tujuan Keluarga</h3>
            <button onClick={() => onNav('savings')} style={btnStyle({ tone: 'ghost', size: 'sm' })}>
              Semua <Icon name="chevronR" size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {GOALS.slice(0, 3).map(g => {
              const pct = Math.round((g.saved / g.target) * 100);
              return (
                <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Ring value={pct} size={48} stroke={5} color={g.color} track="var(--surface-2)">
                    <span style={{ fontSize: 18 }}>{g.emoji}</span>
                  </Ring>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                      <div className="num" style={{ fontSize: 12, fontWeight: 700, color: g.color }}>{pct}%</div>
                    </div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {idrShort(g.saved)} / {idrShort(g.target)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Wallets row */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Kantong Keluarga</h3>
          <button onClick={() => onNav('wallets')} style={btnStyle({ tone: 'ghost', size: 'sm' })}>
            Kelola <Icon name="chevronR" size={14} />
          </button>
        </div>
        <div className="scroll-x" style={{ display: 'flex', gap: 12, paddingBottom: 4 }}>
          {WALLETS.map(w => <WalletCardMini key={w.id} wallet={w} hideBalances={hideBalances} />)}
        </div>
      </div>
    </div>
  );
}

function WalletCardMini({ wallet, hideBalances, onClick }) {
  const members = (wallet.members || []).map(memberById).filter(Boolean);
  return (
    <Card padding={16} onClick={onClick} style={{
      minWidth: 220, flexShrink: 0,
      background: wallet.color + '15',
      border: '1px solid ' + wallet.color + '30',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14,
          background: wallet.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{wallet.icon}</div>
        <Pill tone="neutral" size="sm">{wallet.scope === 'shared' ? 'Bersama' : 'Pribadi'}</Pill>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 2 }}>{wallet.type}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{wallet.name}</div>
      <div className="display num" style={{ fontSize: 20 }}>
        {hideBalances ? '••••••' : idrShort(wallet.balance)}
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <AvatarStack members={members} size={20} gap={-6} />
        {wallet.number && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{wallet.number}</span>}
      </div>
    </Card>
  );
}

function TransactionRow({ txn, hideBalances, onClick }) {
  const cat = categoryById(txn.category);
  const wallet = walletById(txn.wallet);
  const member = memberById(txn.member);
  const isIncome = txn.amount > 0;
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 8px', border: 'none', background: 'transparent',
      width: '100%', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
      transition: 'background .12s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 14, flexShrink: 0,
        background: cat.color + '22', color: cat.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>{cat.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.note}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-3)' }}>
          <Avatar member={member} size={14} style={{ fontSize: 7 }} />
          <span>{member.name}</span>
          <span>·</span>
          <span>{wallet.name}</span>
          <span>·</span>
          <span>{fmtRelative(txn.date)}</span>
        </div>
      </div>
      <div className="num" style={{
        fontSize: 14, fontWeight: 700,
        color: isIncome ? 'var(--good)' : 'var(--ink)',
        whiteSpace: 'nowrap',
      }}>
        {hideBalances ? '••••' : `${isIncome ? '+' : '−'} ${idrShort(Math.abs(txn.amount))}`}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════
function Transactions({ hideBalances, openAdd, onClearAdd }) {
  const { isMobile, narrow } = useViewport();
  const { TRANSACTIONS, FAMILY } = window.MF;
  const [filter, setFilter] = useStateCore({ kind: 'all', member: 'all' });
  const [sheetOpen, setSheetOpen] = useStateCore(!!openAdd);

  React.useEffect(() => {
    if (openAdd) { setSheetOpen(true); onClearAdd && onClearAdd(); }
  }, [openAdd]);

  const filtered = TRANSACTIONS.filter(t => {
    if (filter.kind === 'income' && t.amount <= 0) return false;
    if (filter.kind === 'expense' && t.amount >= 0) return false;
    if (filter.member !== 'all' && t.member !== filter.member) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by day
  const groups = {};
  filtered.forEach(t => {
    const key = fmtRelative(t.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)' }}>
        <Card padding={16}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Pemasukan</div>
          <div className="display num" style={{ fontSize: 22, marginTop: 6, color: 'var(--good)' }}>
            {hideBalances ? '••••' : idrShort(totalIn)}
          </div>
        </Card>
        <Card padding={16}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Pengeluaran</div>
          <div className="display num" style={{ fontSize: 22, marginTop: 6, color: 'var(--bad)' }}>
            {hideBalances ? '••••' : idrShort(Math.abs(totalOut))}
          </div>
        </Card>
        {!isMobile && (
          <Card padding={16}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Net</div>
            <div className="display num" style={{ fontSize: 22, marginTop: 6 }}>
              {hideBalances ? '••••' : idrShort(totalIn + totalOut)}
            </div>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card padding={isMobile ? 14 : 18}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id:'all',     label:'Semua' },
              { id:'income',  label:'Masuk' },
              { id:'expense', label:'Keluar' },
            ].map(o => (
              <button key={o.id} onClick={() => setFilter({ ...filter, kind: o.id })} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--line)',
                background: filter.kind === o.id ? 'var(--ink)' : 'transparent',
                color: filter.kind === o.id ? 'var(--bg)' : 'var(--ink-2)',
                cursor: 'pointer',
              }}>{o.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setFilter({ ...filter, member: 'all' })} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: filter.member === 'all' ? '1px solid var(--ink)' : '1px solid var(--line)',
              background: filter.member === 'all' ? 'var(--ink)' : 'transparent',
              color: filter.member === 'all' ? 'var(--bg)' : 'var(--ink-2)',
              cursor: 'pointer',
            }}>Semua</button>
            {FAMILY.members.map(m => (
              <button key={m.id} onClick={() => setFilter({ ...filter, member: m.id })} title={m.name} style={{
                padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%',
                outline: filter.member === m.id ? `2px solid ${m.color}` : 'none', outlineOffset: 2,
                opacity: filter.member !== 'all' && filter.member !== m.id ? .4 : 1,
              }}>
                <Avatar member={m} size={28} />
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transaction list */}
      <Card padding={isMobile ? 6 : 12}>
        {Object.entries(groups).map(([day, items]) => (
          <div key={day}>
            <div style={{
              padding: '12px 14px 8px', fontSize: 11.5, color: 'var(--ink-3)',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span>{day}</span>
              <span className="num">
                {idrShort(items.reduce((s, t) => s + (t.amount < 0 ? t.amount : 0), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map(t => <TransactionRow key={t.id} txn={t} hideBalances={hideBalances} />)}
            </div>
          </div>
        ))}
      </Card>

      <AddTransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {/* Desktop FAB */}
      {!narrow && (
        <button onClick={() => setSheetOpen(true)} style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 30,
          padding: '14px 22px', borderRadius: 999,
          background: 'var(--accent)', color: '#fff', border: 'none',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-lg)',
        }}>
          <Icon name="plus" size={18} stroke={2.4} /> Catat Transaksi
        </button>
      )}
    </div>
  );
}

function AddTransactionSheet({ open, onClose }) {
  const { CATEGORIES, WALLETS, FAMILY } = window.MF;
  const [type, setType] = useStateCore('expense');
  const [amount, setAmount] = useStateCore('');
  const [cat, setCat] = useStateCore('makan');
  const [wallet, setWallet] = useStateCore('bca');
  const [member, setMember] = useStateCore('budi');
  const [note, setNote] = useStateCore('');

  const cats = CATEGORIES.filter(c => c.kind === type || (type === 'transfer' && c.kind === 'transfer'));

  return (
    <Sheet open={open} onClose={onClose} title="Catat Transaksi" fullHeight>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 14 }}>
          {[
            { id:'expense',  label:'Pengeluaran', color:'var(--bad)' },
            { id:'income',   label:'Pemasukan',   color:'var(--good)' },
            { id:'transfer', label:'Transfer',    color:'var(--ink)' },
          ].map(o => (
            <button key={o.id} onClick={() => setType(o.id)} style={{
              flex: 1, padding: '10px 12px', border: 'none',
              background: type === o.id ? 'var(--surface)' : 'transparent',
              color: type === o.id ? o.color : 'var(--ink-3)',
              fontWeight: 600, fontSize: 13, borderRadius: 10, cursor: 'pointer',
              boxShadow: type === o.id ? 'var(--shadow-sm)' : 'none',
            }}>{o.label}</button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Jumlah</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 18, color: 'var(--ink-3)', fontWeight: 600 }}>Rp</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0" style={{
                fontSize: 40, fontWeight: 700, fontFamily: 'var(--display)',
                border: 'none', outline: 'none', background: 'transparent',
                width: '60%', textAlign: 'center', color: 'var(--ink)',
              }} />
          </div>
          {amount && <div className="num" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {Number(amount).toLocaleString('id-ID')}
          </div>}
        </div>

        {/* Category */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Kategori</div>
          <div className="scroll-x" style={{ display: 'flex', gap: 8 }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: 10, minWidth: 70, border: 'none',
                background: cat === c.id ? c.color + '22' : 'var(--surface-2)',
                borderRadius: 14, cursor: 'pointer',
                outline: cat === c.id ? `2px solid ${c.color}` : 'none',
              }}>
                <div style={{ fontSize: 24 }}>{c.emoji}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Kantong</div>
          <select value={wallet} onChange={(e) => setWallet(e.target.value)} style={{
            width: '100%', padding: '14px 16px', fontSize: 14, fontWeight: 500,
            background: 'var(--surface-2)', border: 'none', borderRadius: 14,
            color: 'var(--ink)',
          }}>
            {WALLETS.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} — {idrShort(w.balance)}</option>)}
          </select>
        </div>

        {/* Member */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Oleh</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {FAMILY.members.map(m => (
              <button key={m.id} onClick={() => setMember(m.id)} style={{
                flex: 1, padding: '10px 8px', border: 'none',
                background: member === m.id ? m.color + '22' : 'var(--surface-2)',
                outline: member === m.id ? `2px solid ${m.color}` : 'none',
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <Avatar member={m} size={32} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" style={{
          padding: '14px 16px', fontSize: 14, background: 'var(--surface-2)',
          border: 'none', borderRadius: 14, color: 'var(--ink)', outline: 'none',
        }} />

        <button onClick={onClose} style={btnStyle({ tone: 'primary', size: 'lg', full: true })}>
          Simpan Transaksi
        </button>
      </div>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WALLETS
// ═══════════════════════════════════════════════════════════════════
function Wallets({ hideBalances }) {
  const { isMobile } = useViewport();
  const { WALLETS, TRANSACTIONS } = window.MF;
  const [selected, setSelected] = useStateCore(WALLETS[0].id);

  const wallet = WALLETS.find(w => w.id === selected) || WALLETS[0];
  const txns = TRANSACTIONS.filter(t => t.wallet === selected).slice(0, 8);
  const total = WALLETS.reduce((s, w) => s + w.balance, 0);
  const shared = WALLETS.filter(w => w.scope === 'shared').reduce((s, w) => s + w.balance, 0);
  const personal = WALLETS.filter(w => w.scope === 'personal').reduce((s, w) => s + w.balance, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Totals */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        <Card padding={20} style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: .9 }}>Total Kekayaan</div>
          <div className="display num" style={{ fontSize: 30, marginTop: 6 }}>
            {hideBalances ? '••••••' : idr(total)}
          </div>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 6 }}>{WALLETS.length} kantong</div>
        </Card>
        <Card padding={20}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Bersama</div>
          <div className="display num" style={{ fontSize: 24, marginTop: 6 }}>
            {hideBalances ? '••••' : idrShort(shared)}
          </div>
          <AvatarStack members={window.MF.FAMILY.members.slice(0, 2)} size={22} gap={-6} />
        </Card>
        <Card padding={20}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Pribadi</div>
          <div className="display num" style={{ fontSize: 24, marginTop: 6 }}>
            {hideBalances ? '••••' : idrShort(personal)}
          </div>
          <AvatarStack members={window.MF.FAMILY.members} size={22} gap={-6} />
        </Card>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr' }}>
        {/* Wallet grid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Kantong Kamu</h3>
            <button style={btnStyle({ tone: 'soft', size: 'sm' })}>
              <Icon name="plus" size={14} stroke={2.2} /> Tambah
            </button>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {WALLETS.map(w => (
              <Card key={w.id} padding={16} onClick={() => setSelected(w.id)} style={{
                background: w.color + '15',
                border: selected === w.id ? `2px solid ${w.color}` : `1px solid ${w.color}30`,
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: w.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{w.icon}</div>
                  <Pill tone="neutral" size="sm">{w.scope === 'shared' ? 'Bersama' : 'Pribadi'}</Pill>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{w.type}</div>
                <div style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 8px' }}>{w.name}</div>
                <div className="display num" style={{ fontSize: 18 }}>
                  {hideBalances ? '••••••' : idrShort(w.balance)}
                </div>
                <div style={{ marginTop: 10 }}>
                  <AvatarStack members={(w.members || []).map(memberById).filter(Boolean)} size={20} gap={-6} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <Card padding={isMobile ? 18 : 22} style={{ alignSelf: 'flex-start', position: isMobile ? 'static' : 'sticky', top: 90 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: wallet.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>{wallet.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{wallet.type} {wallet.number && `• ${wallet.number}`}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{wallet.name}</div>
            </div>
          </div>
          <div className="display num" style={{ fontSize: 32, marginBottom: 14 }}>
            {hideBalances ? '••••••' : idr(wallet.balance)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button style={{ ...btnStyle({ tone: 'soft', size: 'md' }), flex: 1 }}>
              <Icon name="swap" size={16} /> Transfer
            </button>
            <button style={{ ...btnStyle({ tone: 'ghost', size: 'md' }), flex: 1 }}>
              <Icon name="pencil" size={14} /> Ubah
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Aktivitas</div>
          <div>
            {txns.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Belum ada transaksi.</div>}
            {txns.map(t => <TransactionRow key={t.id} txn={t} hideBalances={hideBalances} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET
// ═══════════════════════════════════════════════════════════════════
function Budget({ hideBalances }) {
  const { isMobile } = useViewport();
  const { BUDGETS } = window.MF;
  const totalLimit = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalSpent = BUDGETS.reduce((s, b) => s + b.spent, 0);
  const left = totalLimit - totalSpent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero */}
      <Card padding={isMobile ? 22 : 28} radius="xl" style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-ink) 100%)',
        color: '#fff', border: 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em' }}>Sisa Bulan Mei</div>
            <div className="display num" style={{ fontSize: isMobile ? 36 : 48, marginTop: 4 }}>
              {hideBalances ? '••••••' : idr(left)}
            </div>
            <div style={{ fontSize: 13, opacity: .85, marginTop: 6 }}>dari {idr(totalLimit)} • 10 hari tersisa</div>
          </div>
          <Ring value={totalSpent} max={totalLimit} size={104} stroke={10} color="#fff" track="rgba(255,255,255,.18)">
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div className="display" style={{ fontSize: 24, lineHeight: 1 }}>{Math.round((totalSpent/totalLimit)*100)}%</div>
              <div style={{ fontSize: 10, opacity: .85, marginTop: 2 }}>terpakai</div>
            </div>
          </Ring>
        </div>
      </Card>

      {/* Category budgets */}
      <Card padding={isMobile ? 14 : 22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: isMobile ? '0 6px' : 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Anggaran per Kategori</h3>
          <button style={btnStyle({ tone: 'soft', size: 'sm' })}>
            <Icon name="plus" size={14} stroke={2.2} /> Tambah
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {BUDGETS.map(b => {
            const cat = categoryById(b.category);
            const pct = Math.min(100, (b.spent / b.limit) * 100);
            const over = b.spent > b.limit;
            const color = over ? 'var(--bad)' : pct > 85 ? 'var(--warn)' : cat.color;
            return (
              <div key={b.id} style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: cat.color + '22', color: cat.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>{cat.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</span>
                      <span className="num" style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--bad)' : 'var(--ink)' }}>
                        {hideBalances ? '••••' : `${idrShort(b.spent)} / ${idrShort(b.limit)}`}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Progress value={Math.min(b.spent, b.limit)} max={b.limit} color={color} height={6} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                      <span>{Math.round(pct)}% terpakai</span>
                      <span>{over ? `Lebih ${idrShort(b.spent - b.limit)}` : `Sisa ${idrShort(b.limit - b.spent)}`}</span>
                    </div>
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
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════
function Categories() {
  const { isMobile } = useViewport();
  const { CATEGORIES, TRANSACTIONS } = window.MF;

  const used = {};
  TRANSACTIONS.forEach(t => {
    used[t.category] = (used[t.category] || 0) + Math.abs(t.amount);
  });

  const sections = [
    { kind: 'expense',  label: 'Pengeluaran' },
    { kind: 'income',   label: 'Pemasukan' },
    { kind: 'transfer', label: 'Transfer' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {sections.map(s => {
        const cats = CATEGORIES.filter(c => c.kind === s.kind);
        return (
          <Card key={s.kind} padding={isMobile ? 14 : 22}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{s.label} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>· {cats.length}</span></h3>
              <button style={btnStyle({ tone: 'soft', size: 'sm' })}>
                <Icon name="plus" size={14} stroke={2.2} /> Tambah
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {cats.map(c => (
                <div key={c.id} style={{
                  background: c.color + '15', borderRadius: 'var(--r-md)',
                  padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                  border: `1px solid ${c.color}25`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: c.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{c.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    {used[c.id] && <div className="num" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{idrShort(used[c.id])} bulan ini</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

Object.assign(window, { Dashboard, Transactions, Wallets, Budget, Categories, TransactionRow, WalletCardMini });
