// pages-meta.jsx — Notifications, Settings

const { useState: useStateMeta } = React;

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
function Notifications() {
  const { isMobile } = useViewport();
  const [items, setItems] = useStateMeta(window.MF.NOTIFICATIONS);
  const [filter, setFilter] = useStateMeta('all');

  const filtered = items.filter(n => filter === 'all' || (filter === 'unread' && n.unread));
  const unreadCount = items.filter(n => n.unread).length;

  const markAll = () => setItems(items.map(n => ({ ...n, unread: false })));

  const kindLabel = { budget: 'Anggaran', member: 'Anggota', goal: 'Tujuan', debt: 'Hutang', system: 'Sistem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id:'all', label:'Semua' },
            { id:'unread', label:`Belum dibaca${unreadCount ? ` · ${unreadCount}` : ''}` },
          ].map(o => (
            <button key={o.id} onClick={() => setFilter(o.id)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--line)',
              background: filter === o.id ? 'var(--ink)' : 'transparent',
              color: filter === o.id ? 'var(--bg)' : 'var(--ink-2)', cursor: 'pointer',
            }}>{o.label}</button>
          ))}
        </div>
        <button onClick={markAll} style={btnStyle({ tone: 'ghost', size: 'sm' })}>
          <Icon name="check" size={14} /> Tandai dibaca
        </button>
      </div>

      <Card padding={isMobile ? 8 : 12}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
            <Icon name="bell" size={36} style={{ opacity: .4 }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Tidak ada notifikasi.</div>
          </div>
        )}
        {filtered.map(n => (
          <div key={n.id} onClick={() => setItems(items.map(x => x.id === n.id ? { ...x, unread: false } : x))} style={{
            display: 'flex', gap: 14, padding: '14px 12px', borderRadius: 14, cursor: 'pointer',
            background: n.unread ? 'var(--accent-soft)' : 'transparent',
            transition: 'background .15s', alignItems: 'flex-start', marginBottom: 2,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: n.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</span>
                {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{n.body}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Pill tone="neutral" size="sm">{kindLabel[n.kind]}</Pill>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtRelative(n.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════
function Settings({ tweaks, setTweak }) {
  const { isMobile } = useViewport();
  const fam = window.MF.FAMILY;

  const Row = ({ icon, iconColor, title, sub, right, onClick }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      padding: '14px 8px', border: 'none', background: 'transparent', cursor: onClick ? 'pointer' : 'default',
      textAlign: 'left', borderRadius: 12,
    }}
      onMouseEnter={onClick ? (e) => e.currentTarget.style.background = 'var(--surface-2)' : undefined}
      onMouseLeave={onClick ? (e) => e.currentTarget.style.background = 'transparent' : undefined}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: (iconColor||'var(--accent)') + '22', color: iconColor || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      {right || (onClick && <Icon name="chevronR" size={18} style={{ color: 'var(--ink-3)' }} />)}
    </button>
  );

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
      background: on ? 'var(--accent)' : 'var(--line-2)', position: 'relative', transition: 'background .2s', flexShrink: 0,
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      {/* Profile */}
      <Card padding={isMobile ? 18 : 24}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar member={fam.members[0]} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{fam.members[0].name} Pratama</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>budi@keluarga.id · Admin keluarga</div>
          </div>
          <button style={btnStyle({ tone: 'ghost', size: 'sm' })}><Icon name="pencil" size={14} /> Ubah</button>
        </div>
      </Card>

      {/* Family members */}
      <Card padding={isMobile ? 18 : 24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="family" size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Anggota Keluarga</h3>
          </div>
          <button style={btnStyle({ tone: 'soft', size: 'sm' })}><Icon name="plus" size={14} stroke={2.2} /> Undang</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fam.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px' }}>
              <Avatar member={m} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 12 }}>· {m.age} thn</span></div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.role}</div>
              </div>
              <Pill tone={m.role === 'Ayah' || m.role === 'Ibu' ? 'accent' : 'neutral'} size="sm">
                {m.role === 'Ayah' || m.role === 'Ibu' ? 'Pengelola' : 'Anak'}
              </Pill>
            </div>
          ))}
        </div>
      </Card>

      {/* Appearance */}
      <Card padding={isMobile ? 18 : 24}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Tampilan</h3>
        <Row icon="moon" iconColor="#8B5CF6" title="Mode gelap" sub="Sesuaikan dengan suasana malam"
          right={<Toggle on={tweaks.dark} onChange={(v) => setTweak('dark', v)} />} />
        <div style={{ padding: '14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Tema</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Pilih gaya tampilan</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id:'hangat', label:'Hangat', bg:'#FAF6EF', ac:'#0EA5A4' },
              { id:'ceria',  label:'Ceria',  bg:'#FFFBF7', ac:'#8B5CF6' },
              { id:'studio', label:'Studio', bg:'#F4F4F2', ac:'#16A34A' },
            ].map(t => (
              <button key={t.id} onClick={() => setTweak('variant', t.id)} style={{
                flex: 1, padding: 12, borderRadius: 14, cursor: 'pointer',
                border: tweaks.variant === t.id ? `2px solid ${t.ac}` : '1px solid var(--line)',
                background: t.bg,
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'center' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: t.ac }} />
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: '#fff', border: '1px solid rgba(0,0,0,.1)' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#2A2418', textAlign: 'center' }}>{t.label}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontWeight: 600 }}>Warna aksen</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {ACCENT_OPTIONS.map(c => (
                <button key={c} onClick={() => setTweak('accent', c)} style={{
                  width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: tweaks.accent === c ? '3px solid var(--ink)' : '3px solid transparent',
                  boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.15)',
                }} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Data & preferences */}
      <Card padding={isMobile ? 18 : 24}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Data & Preferensi</h3>
        <Row icon="download" iconColor="#0EA5A4" title="Ekspor data" sub="Unduh transaksi sebagai CSV" onClick={() => {}} />
        <Row icon="upload" iconColor="#F59E0B" title="Impor data" sub="Tambah dari file CSV / Excel" onClick={() => {}} />
        <Row icon="coin" iconColor="#16A34A" title="Mata uang" sub="Rupiah (IDR)" right={<span style={{ fontSize: 13, color: 'var(--ink-3)', display:'flex', alignItems:'center', gap:4 }}>Rp <Icon name="chevronR" size={16} /></span>} onClick={() => {}} />
        <Row icon="bell" iconColor="#F472B6" title="Notifikasi" sub="Atur pengingat & peringatan" onClick={() => {}} />
      </Card>

      {/* Danger zone */}
      <Card padding={isMobile ? 18 : 24} style={{ border: '1px solid #FCA5A5' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--bad)' }}>Zona Berbahaya</h3>
        <Row icon="trash" iconColor="#DC2626" title="Hapus semua data" sub="Tindakan ini tidak bisa dibatalkan" onClick={() => {}} />
        <Row icon="logout" iconColor="#DC2626" title="Keluar dari akun" onClick={() => {}} />
      </Card>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: '8px 0 12px' }}>
        MoneyFam v2.0 · Dibuat dengan ❤️ untuk keluarga Indonesia
      </div>
    </div>
  );
}

Object.assign(window, { Notifications, Settings });
