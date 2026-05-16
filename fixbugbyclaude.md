# Bug Report & Fix Log — MoneyFam
> Ditulis oleh Claude Sonnet 4.6 | 2026-05-14  
> Tujuan: dokumentasi teknis untuk referensi AI lain dalam mendeteksi pola bug serupa.

---

## Konteks Proyek

**Stack**: React 18 + Vite, Zustand (state management), Supabase (auth + database), TanStack Query (data fetching), Tailwind CSS.

**Pola umum di proyek ini**:
- Modal selalu di-mount (tidak conditional render) → harus reset form via `useEffect`
- Auth diinisialisasi lewat `authStore.initialize()` yang dipanggil di `AppInitializer` (useEffect)
- Semua query ke Supabase dijaga dengan `enabled: !!family?.id`

---

## Bug #1 — `useState` Dipakai Sebagai `useEffect`

### File
`src/pages/Categories.jsx` — `CategoryModal` component, baris 31

### Deskripsi
`useState` dengan argumen fungsi (lazy initializer) **hanya berjalan sekali saat mount**, bukan setiap kali props berubah. Developer salah menggunakannya untuk me-reset form ketika modal dibuka, seharusnya menggunakan `useEffect`.

### Kode Buggy
```jsx
// ❌ SALAH: lazy initializer useState hanya jalan sekali saat mount
useState(() => {
  if (isOpen) {
    if (category) {
      setForm({ name: category.name, icon: category.icon || '📦', ... })
    } else {
      setForm({ ...defaultForm, type: activeTab })
    }
    setErrors({})
  }
})
```

### Dampak
1. Saat mount, `isOpen` = `false` → blok `if (isOpen)` tidak pernah dieksekusi.
2. Form **tidak pernah di-reset** saat modal dibuka.
3. Edit Kategori A → tutup → edit Kategori B → form masih menampilkan data Kategori A.
4. Tambah kategori baru setelah edit → form menampilkan sisa data edit sebelumnya.

### Kode Fix
```jsx
// ✅ BENAR: useEffect jalan setiap kali isOpen atau category berubah
useEffect(() => {
  if (isOpen) {
    if (category) {
      setForm({ name: category.name, icon: category.icon || '📦', ... })
    } else {
      setForm({ ...defaultForm, type: activeTab })
    }
    setErrors({})
  }
}, [isOpen, category, activeTab])
```

### Pelajaran untuk AI
- Jika melihat `useState(() => { setState(...) })` tanpa `return`, ini hampir pasti salah — developer bermaksud menulis `useEffect`.
- Lazy initializer `useState` harus **mengembalikan nilai** (initial state), bukan memanggil setter lain.
- Modal yang selalu di-mount (bukan conditional render) **wajib** menggunakan `useEffect` untuk reset form.
- Pattern yang benar untuk reset form modal: `useEffect(() => { if (isOpen) resetForm() }, [isOpen, data])`

---

## Bug #2 — `onAuthStateChange` Terdaftar Dua Kali (React StrictMode)

### File
`src/stores/authStore.js` — fungsi `initialize`, baris 18

### Deskripsi
Fungsi `initialize()` mendaftarkan listener `supabase.auth.onAuthStateChange` setiap kali dipanggil. Di React 18 StrictMode (development), `useEffect` dipanggil **dua kali** secara berurutan. Karena `initialize()` adalah fungsi async, kedua pemanggilan melihat `initialized: false` (state belum diupdate) dan keduanya mendaftarkan listener.

### Kode Buggy
```js
// ❌ SALAH: tidak ada guard, listener terdaftar setiap initialize() dipanggil
initialize: async () => {
  set({ loading: true })
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }
  } catch (err) {
    console.error('Auth init error:', err)
  } finally {
    set({ loading: false, initialized: true })  // ← terlambat, async sudah jalan 2x
  }

  // ← dipanggil 2x di StrictMode
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)  // ← fetchProfile dipanggil 2x tiap sign-in
    }
    ...
  })
},
```

### Dampak
1. Di development (StrictMode): 2 listener aktif selamanya.
2. Setiap event `SIGNED_IN` memicu `fetchProfile` dua kali secara paralel → race condition pada state Zustand.
3. Setiap event `SIGNED_OUT` membersihkan state dua kali (tidak berbahaya tapi tidak efisien).
4. Seiring waktu (hot reload, navigasi), listener terus menumpuk.

### Root Cause Detail
```
Mount 1 → initialize() dipanggil → set({ loading: true }) [async, belum resolve]
Mount 2 → initialize() dipanggil → get().initialized masih false → listener #2 terdaftar
Mount 1 resolve → finally: set({ initialized: true }) → listener #1 terdaftar
```
Guard `if (get().initialized) return` di akhir tidak membantu karena `initialized` baru di-set di `finally` (setelah `await`), sedangkan pemanggilan kedua terjadi sebelum `await` pertama selesai.

### Kode Fix
```js
// ✅ BENAR: set initialized SYNCHRONOUSLY di awal, sebelum operasi async
initialize: async () => {
  // Zustand set() bersifat sinkron → pemanggilan kedua langsung melihat initialized: true
  if (get().initialized) return
  set({ loading: true, initialized: true })  // ← sinkron, atomic

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }
  } catch (err) {
    console.error('Auth init error:', err)
  } finally {
    set({ loading: false })
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    ...
  })
},
```

### Mengapa Ini Berhasil
Zustand `set()` bersifat **sinkron**. Urutan eksekusi di StrictMode:
```
Mount 1 → initialize() → get().initialized === false → set({ initialized: true }) [sync]
Mount 2 → initialize() → get().initialized === true  → return early ✓
```
Listener hanya terdaftar satu kali.

### Pelajaran untuk AI
- Di React 18 StrictMode, `useEffect` tanpa cleanup berjalan **dua kali** di development. Side-effect yang tidak idempoten (mendaftar listener, membuat koneksi) **harus dilindungi**.
- Untuk guard idempoten dengan state management (Zustand/Redux), set flag **secara sinkron sebelum operasi async** agar pemanggilan kedua langsung melihatnya.
- `supabase.auth.onAuthStateChange` mengembalikan `{ data: { subscription } }` — idealnya simpan `subscription.unsubscribe` untuk cleanup, tapi minimal harus ada guard agar tidak terdaftar dua kali.
- Jangan letakkan guard `if (initialized) return` hanya di `finally` — di akhir fungsi async terlambat untuk mencegah eksekusi paralel.

---

## Bug #3 — Label "Sisa" Tidak Berubah Saat Anggaran Terlampaui

### File
`src/pages/Budget.jsx` — Summary section, baris 112

### Deskripsi
Label kolom ketiga di ringkasan anggaran selalu menampilkan "Sisa" meskipun pengeluaran sudah melebihi total anggaran. Warnanya memang berubah merah, tapi teksnya tidak ikut berubah.

### Kode Buggy
```jsx
// ❌ Label statis "Sisa" tidak kontekstual
<div>
  <p className="text-xs text-gray-400">Sisa</p>
  <p className={`text-sm font-bold ${totalBudget - totalSpent < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
    {formatCurrency(Math.abs(totalBudget - totalSpent))}
  </p>
</div>
```

### Dampak
- UX membingungkan: warna merah tapi label bilang "Sisa Rp 500.000" → sisa apa?
- Seharusnya: "Lebih Rp 500.000" (over budget) vs "Sisa Rp 500.000" (under budget).

### Kode Fix
```jsx
// ✅ Label dinamis sesuai kondisi anggaran
<div>
  <p className="text-xs text-gray-400">{totalSpent > totalBudget ? 'Lebih' : 'Sisa'}</p>
  <p className={`text-sm font-bold ${totalSpent > totalBudget ? 'text-red-500' : 'text-emerald-600'}`}>
    {formatCurrency(Math.abs(totalBudget - totalSpent))}
  </p>
</div>
```

### Pelajaran untuk AI
- Setiap kali ada nilai yang ditampilkan dengan conditional color (merah/hijau), periksa apakah **label teksnya juga perlu berubah**.
- Konsistensi semantik: warna dan teks harus menyampaikan makna yang sama. Warna merah + teks "Sisa" adalah kontradiksi.
- Gunakan kondisi yang sama untuk label dan warna agar tidak bisa desync.

---

## Bug Tambahan: Error 401 saat Registrasi (Supabase)

### File
`src/stores/authStore.js` — fungsi `register`

### Deskripsi
Dua error terkait registrasi yang ditemukan di console browser:
1. `families?select=*` → 401
2. `profiles` → 401

### Root Cause
Supabase mengembalikan `data.session = null` ketika **Email Confirmation diaktifkan** di project Supabase. Tanpa sesi aktif, semua operasi database selanjutnya (insert families, insert profiles) dilakukan sebagai pengguna anonim yang tidak punya izin RLS.

Selain itu, `.insert().select().single()` pada tabel `families` memicu SELECT setelah INSERT. RLS SELECT policy untuk `families` menggunakan fungsi `get_user_family_id()` yang membaca `profiles.family_id` — tapi profil belum dibuat saat itu, sehingga hasilnya null dan SELECT ditolak (401).

### Fix yang Diterapkan
```js
// Fix 1: Cek session setelah signUp
if (!data.session) {
  throw new Error('Konfirmasi email diperlukan. Matikan "Confirm email" di Supabase Dashboard → Authentication → Providers → Email.')
}

// Fix 2: Gunakan UUID dari client, hindari .select() setelah insert
const familyId = crypto.randomUUID()
const { error: familyError } = await supabase
  .from('families')
  .insert({ id: familyId, name: familyName })  // tanpa .select()
if (familyError) throw familyError
family = { id: familyId, name: familyName }   // konstruksi manual
```

### Fix Infrastruktur (Supabase Dashboard)
Matikan "Confirm email" di:
> Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email"

### Pelajaran untuk AI
- Supabase `signUp` bisa return `{ data: { user, session: null }, error: null }` — **bukan error** tapi session null. Harus selalu cek `data.session` sebelum operasi DB.
- `.insert().select().single()` = INSERT + SELECT dalam satu request. Jika RLS SELECT punya dependensi data yang belum ada, gunakan UUID dari client dan hindari `.select()`.
- Pattern aman untuk insert dengan UUID:
  ```js
  const id = crypto.randomUUID()
  await supabase.from('table').insert({ id, ...data })
  const result = { id, ...data }  // bukan dari DB
  ```

---

## Bug #4 — `useState` untuk Inisialisasi Form dari Props Async (Settings)

### File
`src/pages/Settings.jsx` — `Settings` component, baris 136–140

### Deskripsi
`profileForm` diinisialisasi dari `profile` melalui `useState` langsung, bukan `useEffect`. Karena `profile` berasal dari Supabase (async), nilainya bisa masih `null` saat render pertama. Akibatnya form tampil kosong dan **tidak pernah ter-isi** meski profile berhasil di-load setelahnya.

### Kode Buggy
```jsx
// ❌ SALAH: useState hanya ambil nilai saat mount pertama
// Jika profile = null saat mount, form akan tetap kosong selamanya
const [profileForm, setProfileForm] = useState({
  full_name: profile?.full_name || '',
  phone: profile?.phone || '',
})
```

### Dampak
1. Jika halaman Settings dibuka sebelum data `profile` selesai di-load dari Supabase, form "Nama Lengkap" dan "Nomor HP" tampil kosong.
2. Pengguna harus mengisi ulang nama meskipun sudah pernah disimpan sebelumnya.
3. Jika user langsung klik "Simpan Profil" tanpa sadar form kosong, nama profil bisa terhapus (di-overwrite dengan string kosong).
4. Pola ini berbeda dari modal-modal lain di project yang sudah benar menggunakan `useEffect`.

### Kode Fix
```jsx
// ✅ BENAR: inisialisasi kosong, sync via useEffect saat profile tersedia
const [profileForm, setProfileForm] = useState({
  full_name: '',
  phone: '',
})

useEffect(() => {
  if (profile) {
    setProfileForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
    })
  }
}, [profile])
```

### Mengapa `useEffect` dan Bukan `useState`
- `useState(initialValue)` hanya menggunakan `initialValue` **satu kali** saat component pertama kali mount.
- Jika `profile` masih `null` saat mount (data belum load), form akan kosong dan tidak berubah saat `profile` akhirnya tersedia.
- `useEffect` bereaksi terhadap perubahan dependency (`profile`) — ketika Supabase selesai fetch dan `profile` berubah dari `null` ke object, `useEffect` akan dipanggil dan form akan di-sync.

### Pelajaran untuk AI
- Jika `useState` diinisialisasi dari data yang mungkin belum tersedia saat mount (async: API response, Supabase query, React Query data), **selalu gunakan `useEffect` untuk sync**.
- Ini sama dengan pola Bug #1 (Categories modal), tapi tanpa kondisi `isOpen`. Pattern yang benar untuk semua form yang datanya dari async source: `useEffect(() => { if (data) setForm(mapToForm(data)) }, [data])`.
- Tanda bahaya: `useState({ field: asyncData?.field || '' })` di mana `asyncData` bisa null saat mount.

---

## Bug #5 — `now` Captured di Closure `useMemo` Tanpa Dependency

### File
`src/pages/Reports.jsx` — `Reports` component (sudah di-fix, dicatat sebagai referensi pola)

### Deskripsi
`const now = new Date()` dideklarasikan di level component. Kemudian `now` digunakan di dalam `useMemo` tapi **tidak dimasukkan ke dependency array**. Ini adalah stale closure — jika `useMemo` menggunakan cache (deps tidak berubah), `now` yang dipakai adalah nilai dari render sebelumnya.

### Kode Buggy
```jsx
// ❌ SALAH: now digunakan di dalam useMemo tapi tidak di deps array
export default function Reports() {
  const now = new Date()  // ← dibuat saat render, tapi bisa stale di closure
  const [period, setPeriod] = useState('bulanan')
  const [year, setYear] = useState(now.getFullYear())

  const isCurrentPeriod = useMemo(() => {
    // now di sini adalah closure dari render yang membuat memo ini
    if (period === 'bulanan') return year === now.getFullYear() && month === now.getMonth() + 1
    if (period === 'harian') return currentDate.toDateString() === now.toDateString()
    ...
  }, [period, year, month, currentDate])  // ← now TIDAK ada di sini
}
```

### Dampak
1. Jika memo di-cache (deps tidak berubah), `now` yang dipakai adalah tanggal saat render terakhir, bukan tanggal/waktu sekarang.
2. Potensi "Kembali ke sekarang" tidak muncul meski pengguna sudah navigasi ke periode lain, jika render terakhir kebetulan tidak trigger re-compute memo.
3. Di development (React StrictMode + hot reload berulang), nilai `now` bisa semakin stale.

### Kode Fix yang Diterapkan
```jsx
// ✅ BENAR: Opsi 1 — pindahkan now ke dalam useMemo
const isCurrentPeriod = useMemo(() => {
  const now = new Date()  // ← selalu fresh setiap memo dijalankan
  if (period === 'bulanan') return year === now.getFullYear() && month === now.getMonth() + 1
  ...
}, [period, year, month, currentDate])

// ✅ BENAR: Opsi 2 — stabilkan now dengan useState lazy initializer (untuk initial state)
const [year, setYear] = useState(() => new Date().getFullYear())
const [month, setMonth] = useState(() => new Date().getMonth() + 1)
const [currentDate, setCurrentDate] = useState(() => new Date())
// Hapus const now = new Date() di level component
```

### Mengapa Ini Subtle
- Tidak seperti Bug #1 yang langsung terlihat salah, bug ini **mungkin tidak terlihat** di testing normal karena:
  1. Pengguna hampir selalu menginteraksi dengan UI sebelum bug termanifestasi, dan setiap interaksi memicu re-render + recompute `now`.
  2. Hanya muncul jika app dibuka lama tanpa interaksi, melewati pergantian hari/bulan.
- React ESLint plugin (`eslint-plugin-react-hooks`) akan mendeteksi ini dengan warning `react-hooks/exhaustive-deps`.

### Pelajaran untuk AI
- Setiap kali melihat `const now = new Date()` atau `Date.now()` di level component, periksa apakah nilainya dipakai di dalam `useMemo`, `useCallback`, atau `useEffect`. Jika iya, `now` harus masuk ke dependency array atau dicompute di dalam callback.
- Lazy initializer `useState(() => new Date())` adalah pattern yang benar untuk initial state berbasis waktu — computed sekali saat mount, stable sebagai state value.
- Untuk nilai yang harus selalu fresh (bukan initial state), compute langsung di dalam callback/memo, jangan capture dari outer scope.
- Tanda bahaya: `useMemo(() => { ... now ... }, [depA, depB])` di mana `now` tidak ada di deps.

---

## Bug #6 — Field Name Salah di Export CSV: `transaction_date` & `destination_wallet_id`

### File
`src/utils/csvUtils.js` — fungsi `convertMoneyFamToOllo`, baris 205 & 201

### Deskripsi
Dua field name yang dipakai dalam fungsi konversi export tidak sesuai dengan nama kolom aktual di tabel Supabase `transactions`. Akibatnya **seluruh fitur Export CSV tidak berfungsi** — kolom Date dan Destination Wallet selalu kosong.

### Kode Buggy
```js
// ❌ SALAH — field name tidak sesuai schema DB
return transactions.map(t => {
  const destinationWallet = t.destination_wallet_id  // ← kolom DB: to_wallet_id
    ? walletMap.get(t.destination_wallet_id) : null
  return {
    Date: t.transaction_date,  // ← kolom DB: date
    ...
  }
})
```

### Schema DB (dari schema.sql)
```sql
create table transactions (
  date date not null default current_date,    -- bukan transaction_date
  to_wallet_id uuid references wallets(id),  -- bukan destination_wallet_id
  ...
)
```

### Kode Fix
```js
// ✅ BENAR — sesuai nama kolom di schema.sql
return transactions.map(t => {
  const destinationWallet = t.to_wallet_id       // ← nama kolom benar
    ? walletMap.get(t.to_wallet_id) : null
  return {
    Date: t.date,                                 // ← nama kolom benar
    ...
  }
})
```

### Dampak
- `Date: undefined` di setiap baris → CSV punya kolom Date kosong semua
- `Destination Wallet` selalu kosong untuk semua transaksi transfer
- Data yang diekspor tidak bisa diimpor kembali ke Ollo (format salah)

### Pelajaran untuk AI
- **Sebelum menggunakan field name dari object Supabase query result, selalu cocokkan dengan nama kolom di `schema.sql`** — jangan asumsikan dari nama semantik.
- Field `date` di Supabase TIDAK secara otomatis menjadi `transaction_date` meskipun semantiknya sama.
- Pola rawan: fungsi converter yang ditulis tanpa referensi schema, atau yang ditulis di file terpisah dari hook yang menggunakan hasilnya.

---

## Bug #7 — `getCategoryIcon` Return String Lucide, Bukan Emoji

### File
`src/hooks/useDataImportExport.js` — fungsi `getCategoryIcon`, baris 6–25

### Deskripsi
Fungsi `getCategoryIcon` mengembalikan nama icon Lucide React (`'utensils'`, `'shopping-bag'`, dll) sebagai string teks biasa. Tapi seluruh aplikasi menggunakan **emoji** untuk field `icon` di tabel `categories` (contoh: `'🍔'`, `'🚗'`). Semua kategori yang dibuat via import akan menyimpan string `utensils` ke DB dan menampilkannya sebagai teks literal di seluruh UI.

### Kode Buggy
```js
// ❌ SALAH — mengembalikan nama icon Lucide, bukan emoji
const CATEGORY_ICONS = {
  'food & drink': 'utensils',    // ← string Lucide
  'shopping': 'shopping-bag',    // ← string Lucide
  'transportation': 'car',       // ← string Lucide
}
function getCategoryIcon(categoryName) {
  return CATEGORY_ICONS[normalized] || 'circle'  // ← bukan emoji
}
```

### Dampak
- Kategori hasil import menampilkan teks `utensils` / `shopping-bag` di UI (CategoryBreakdown, BudgetCard, TransactionList)
- Tidak ada error/crash, tapi tampilan rusak secara visual
- Semua kategori yang tidak match pun menampilkan `circle` sebagai teks

### Kode Fix
```js
// ✅ BENAR — gunakan emoji yang konsisten dengan seluruh app
const CATEGORY_ICON_MAP = [
  { keywords: ['makan', 'minum', 'food', 'drink', ...], icon: '🍔' },
  { keywords: ['transport', 'mobil', 'motor', ...], icon: '🚗' },
  ...
]
function getCategoryIcon(categoryName) {
  const lower = (categoryName || '').toLowerCase()
  for (const entry of CATEGORY_ICON_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.icon
  }
  return '📦'  // default fallback emoji
}
```

### Pelajaran untuk AI
- Saat membuat fungsi helper yang menghasilkan data untuk disimpan ke DB, **pastikan format output konsisten dengan format yang digunakan oleh seluruh app**, bukan asumsi dari nama field saja.
- Jika seluruh codebase menggunakan emoji untuk `icon`, fungsi helper baru harus juga return emoji.

---

## Bug #8 — Deteksi Tipe Kategori Import Tidak Mengenali Bahasa Indonesia

### File
`src/utils/csvUtils.js` — fungsi `convertOlloToMoneyFam`, baris 181

### Deskripsi
Saat mengimpor CSV, tipe kategori (income/expense) ditentukan dengan mencari kata `'income'` atau `'salary'` dalam nama kategori. Kata-kata ini tidak akan cocok dengan nama kategori bahasa Indonesia seperti "Gaji", "Pemasukan", "Bonus", "Investasi" — semuanya akan terdeteksi sebagai `expense`.

### Kode Buggy
```js
// ❌ SALAH — hanya cek English keywords
type: name.toLowerCase().includes('income') || name.toLowerCase().includes('salary')
  ? 'income' : 'expense'
```

### Dampak
- Semua transaksi pemasukan (gaji, bonus, freelance) mendapat kategori bertipe `expense`
- Transaksi income muncul di kategori pengeluaran di Reports dan Budget
- Data laporan keuangan salah secara fundamental (income bisa terhitung sebagai expense)

### Kode Fix
```js
// ✅ BENAR — cek Indonesian + English keywords
const INCOME_KEYWORDS = [
  'income', 'salary', 'wage', 'bonus', 'revenue', 'earning', ...
  'gaji', 'pemasukan', 'pendapatan', 'bonus', 'freelance', 'investasi', ...
]
function isIncomeCategory(name) {
  const lower = (name || '').toLowerCase()
  return INCOME_KEYWORDS.some((kw) => lower.includes(kw))
}
```

### Pelajaran untuk AI
- App yang ditargetkan untuk pasar Indonesia harus menangani **nama dalam Bahasa Indonesia** di semua logika klasifikasi, bukan hanya English.
- Keyword matching untuk kategori keuangan harus mencakup: gaji, pemasukan, pendapatan, bonus, tunjangan, honor, komisi, penghasilan, piutang, kiriman, investasi, bisnis.

---

## Bug #9 — Import Transaksi N+1: Satu Request per Transaksi

### File
`src/hooks/useDataImportExport.js` — loop import, baris 131–168

### Deskripsi
Import menggunakan `for...of` loop yang melakukan satu request Supabase `.insert()` per transaksi. Untuk file CSV dengan 500 transaksi, ini menghasilkan 500 HTTP requests secara serial. Supabase mendukung bulk insert — bisa kirim semua transaksi dalam satu request.

### Kode Buggy
```js
// ❌ SALAH — N+1: satu HTTP request per transaksi
for (const tx of transactions) {
  const { error } = await supabase.from('transactions').insert(transactionData)
  if (error) errors.push(...)
  else importedCount++
}
```

### Dampak
- 500 transaksi = 500 HTTP requests + 500 Supabase round-trips
- Import CSV 500 baris bisa memakan waktu 30–60 detik
- Setiap transaksi juga memicu wallet balance trigger satu per satu (lebih berat di DB)

### Kode Fix
```js
// ✅ BENAR — bulk insert dalam chunk 100
const CHUNK = 100
for (let i = 0; i < batch.length; i += CHUNK) {
  const chunk = batch.slice(i, i + CHUNK)
  const { error } = await supabase.from('transactions').insert(chunk)
  if (error) errors.push(`Batch ${i/CHUNK+1}: ${error.message}`)
  else importedCount += chunk.length
}
```

### Catatan Penting: Wallet Balance Trigger
Dengan bulk insert, trigger `update_wallet_balance_on_insert` di Supabase akan tetap berjalan per row (trigger `FOR EACH ROW`) — tidak ada yang berubah dari sisi kebenaran data, hanya jumlah HTTP request yang berkurang drastis.

### Pelajaran untuk AI
- Supabase `.insert()` menerima **array**, bukan hanya satu object. Selalu prefer bulk insert untuk data massal.
- `for await` + `.insert(single)` dalam loop adalah anti-pattern yang umum terlihat di kode yang ditulis tanpa mempertimbangkan volume data.

---

## Bug #10 — Tidak Ada Deteksi Duplikat Saat Re-Import CSV

### File
`src/hooks/useDataImportExport.js` — loop import

### Deskripsi
Tidak ada pengecekan apakah transaksi sudah ada di DB sebelum diinsert. Jika pengguna mengimpor file CSV yang sama dua kali (misalnya tidak sengaja klik dua kali, atau upload file yang sudah pernah diimpor sebelumnya), semua transaksi akan terduplikat.

### Kode Fix yang Diterapkan
Sebelum bulk insert, fetch semua transaksi keluarga yang sudah ada, buat set dari composite key `date|amount|description|wallet_id`, lalu skip row yang sudah ada:

```js
// Fetch existing transactions untuk duplicate check
const { data: existingTxs } = await supabase
  .from('transactions')
  .select('date, amount, description, wallet_id')
  .eq('family_id', family.id)

const existingTxKeys = new Set(
  (existingTxs || []).map((t) => `${t.date}|${t.amount}|${t.description}|${t.wallet_id}`)
)

// Skip duplicates
const dupKey = `${dateStr}|${tx.amount}|${tx.description}|${walletId}`
if (existingTxKeys.has(dupKey)) { skippedCount++; continue }
```

### Trade-off
- Composite key `date+amount+description+wallet_id` tidak 100% sempurna (dua transaksi identik di hari yang sama akan selalu di-skip yang kedua), tapi ini adalah trade-off yang wajar vs tidak ada proteksi sama sekali.
- Untuk dataset besar (>5000 transaksi), fetch semua transaksi ke client untuk duplicate check bisa lambat — alternatif: gunakan `ON CONFLICT DO NOTHING` dengan unique constraint di DB.

### Pelajaran untuk AI
- Operasi import data **selalu** membutuhkan duplicate detection, terutama jika ada tombol import yang bisa diklik ulang.
- Untuk volume kecil-menengah: fetch existing keys ke client dan buat Set untuk O(1) lookup.
- Untuk volume besar: tambahkan unique constraint di DB dan gunakan `upsert` dengan `onConflict: 'ignore'`.

---

## Ringkasan Pola Bug yang Ditemukan

| # | Pola | Lokasi | Tingkat Keparahan |
|---|------|--------|-------------------|
| 1 | `useState` dipakai sebagai `useEffect` | `Categories.jsx` | Kritis |
| 2 | Listener async tidak idempoten (StrictMode) | `authStore.js` | Penting |
| 3 | Label UI statis tidak mencerminkan state kondisional | `Budget.jsx` | Minor |
| 4 | `signUp` tanpa cek `session` null (email confirmation) | `authStore.js` | Kritis |
| 5 | `.insert().select()` melanggar urutan dependensi RLS | `authStore.js` | Penting |
| 6 | Form state dari async data tidak di-sync via `useEffect` | `Settings.jsx` | Penting |
| 7 | `now` / `Date.now()` di-capture di `useMemo` closure tanpa dependency | `Reports.jsx` | Minor |
| 8 | Field name salah saat konversi ke format export (tidak cocok schema DB) | `csvUtils.js` | Kritis |
| 9 | Helper return format berbeda dari yang dipakai seluruh app (icon) | `useDataImportExport.js` | Penting |
| 10 | Keyword matching tidak cover Bahasa Indonesia | `csvUtils.js` | Penting |
| 11 | N+1 insert dalam loop untuk operasi massal | `useDataImportExport.js` | Sedang |
| 12 | Tidak ada duplicate detection pada import | `useDataImportExport.js` | Sedang |

---

## Checklist Deteksi Bug untuk AI

Saat menganalisis React + Supabase project, periksa:

- [ ] Setiap `useState(() => { ... })` — apakah fungsi mengembalikan nilai atau berisi side-effect? Jika side-effect → harus `useEffect`.
- [ ] Setiap `useEffect` tanpa cleanup yang mendaftarkan listener/subscription — apakah ada guard idempoten?
- [ ] Setiap `supabase.auth.signUp()` — apakah `data.session` dicek sebelum operasi DB?
- [ ] Setiap `.insert().select()` — apakah SELECT bisa gagal karena RLS bergantung data yang belum ada?
- [ ] Setiap label teks yang statik tapi nilai di sebelahnya memiliki conditional color — apakah label juga perlu dinamis?
- [ ] `initialize()` atau setup function yang dipanggil di `useEffect` — apakah aman dari double-call di StrictMode?
- [ ] Setiap `useState({ field: asyncData?.field || '' })` — apakah `asyncData` bisa null saat mount? Jika iya → butuh `useEffect` untuk sync.
- [ ] Setiap `const now = new Date()` di level component — apakah dipakai di dalam `useMemo`/`useCallback`/`useEffect`? Jika iya → harus masuk dependency array atau di-compute di dalam callback.
- [ ] Setiap fungsi konversi data (export/import) — cocokkan nama field dengan `schema.sql`, jangan asumsikan dari nama semantik.
- [ ] Setiap fungsi helper yang menghasilkan nilai untuk disimpan ke DB — pastikan format output (emoji vs string, tipe data) konsisten dengan seluruh app.
- [ ] Setiap keyword matching untuk klasifikasi — apakah sudah cover Bahasa Indonesia jika app ditargetkan untuk pengguna Indonesia?
- [ ] Setiap loop insert/update — gunakan bulk insert (array) untuk data massal, bukan satu request per item.
- [ ] Setiap operasi import data — pastikan ada duplicate detection sebelum insert.
