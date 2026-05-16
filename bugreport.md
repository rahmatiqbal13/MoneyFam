# Bug Report — MoneyFam QA Audit

**Tanggal audit:** 2026-05-16  
**Auditor:** Claude (QA Mode)  
**Cakupan:** Seluruh source code `src/` + `supabase/schema.sql`  
**Metode:** Static code analysis + logic tracing

---

## Ringkasan Eksekutif

| Severity | Jumlah |
|----------|--------|
| 🔴 HIGH | 6 |
| 🟡 MEDIUM | 8 |
| 🟢 LOW | 6 |
| **Total** | **20** |

---

## 🔴 HIGH — Harus diperbaiki segera

---

### BUG-001 · Fitur Solo User Tidak Berfungsi Sama Sekali

**File:** `src/hooks/useSavingsGoals.js:15`, `src/hooks/useDebts.js:15`, `src/hooks/useBudget.js:13`, `src/hooks/useInvestments.js:62`

**Deskripsi:**  
Keempat hook ini memiliki guard `if (!family?.id) return []` atau `enabled: !!family?.id`. Artinya seluruh fitur Tabungan, Hutang, Anggaran, dan Investasi **tidak berfungsi sama sekali** untuk user yang belum bergabung ke keluarga.

```js
// useSavingsGoals.js:15
if (!family?.id) return []  // ← solo user selalu dapat array kosong

// useDebts.js:15
if (!family?.id) return []  // ← sama

// useBudget.js:13
if (!family?.id || !yearMonth) return []  // ← sama
```

**Dampak:** User baru yang belum punya keluarga melihat halaman kosong di fitur-fitur utama. UX sangat buruk untuk new user.

**Cara trigger:** Daftar akun baru, belum buat/gabung keluarga, buka halaman Tabungan / Hutang / Anggaran.

---

### BUG-002 · `usePensionSettings` Tidak Bisa Digunakan Solo User + Query Salah

**File:** `src/hooks/useInvestments.js:160,170`

**Deskripsi:**  
Fungsi `usePensionSettings` memiliki dua masalah:

```js
// Line 160: early return jika tidak ada family
if (!family?.id || !user?.id) return null

// Line 170: enabled hanya jika ada family
enabled: !!family?.id && !!user?.id,
```

Solo user tidak pernah bisa membuka kalkulator pensiun. Selain itu, query memfilter dengan `.eq('family_id', family.id)` yang nilainya `undefined` untuk solo user, menyebabkan query PostgREST tidak valid.

**Dampak:** Kalkulator pensiun blank tanpa error untuk solo user.

---

### BUG-003 · Tanggal Import CSV Bergeser 1 Hari (Bug Timezone WIB)

**File:** `src/utils/csvUtils.js:107-115`

**Deskripsi:**  
`parseOlloDate` mengonversi string tanggal lokal ke UTC melalui `Date.toISOString()`:

```js
export function parseOlloDate(olloDate) {
  const date = new Date(olloDate)   // "2026-03-03 00:30:00" diparse sebagai LOKAL
  return date.toISOString()          // → "2026-03-02T17:30:00.000Z" (UTC-7 dari WIB)
}
```

Di `useDataImportExport.js:192`, hasilnya di-split: `tx.date.split('T')[0]` → menghasilkan `"2026-03-02"`, padahal transaksi aslinya di tanggal 3 Maret.

**Cara trigger:** Transaksi Ollo yang dilakukan **antara jam 00:00–06:59 WIB** akan tersimpan dengan tanggal sehari lebih awal. (UTC+7, jadi transaksi jam 00:30 WIB = jam 17:30 UTC hari sebelumnya).

**Dampak:** Laporan bulanan salah — transaksi bisa masuk ke bulan yang berbeda. Misalnya transaksi 1 Maret jam 01:00 WIB tersimpan sebagai 28 Februari.

**Fix:**
```js
export function parseOlloDate(olloDate) {
  if (!olloDate) return new Date().toISOString().split('T')[0]
  // Ambil bagian tanggal saja, tanpa konversi timezone
  return olloDate.split(' ')[0]  // "2026-03-03 11:03:50" → "2026-03-03"
}
```

---

### BUG-004 · `useAddToSavingsGoal` Tidak Atomik — Data Bisa Korup

**File:** `src/hooks/useSavingsGoals.js:84-109`

**Deskripsi:**  
Operasi terdiri dari 2 langkah sequential yang tidak berada dalam satu database transaction:

```js
// Step 1: Update current_amount di savings_goals
const { error: goalErr } = await supabase
  .from('savings_goals')
  .update({ current_amount: newAmount, ... })
  .eq('id', id)
if (goalErr) throw goalErr

// Step 2: Insert transaksi
const { error: txErr } = await supabase.from('transactions').insert({...})
if (txErr) throw txErr  // ← jika gagal di sini, step 1 sudah terlanjur sukses
```

**Cara trigger:** Masalah jaringan sesaat, atau constraint violation di transaksi (misalnya wallet_id tidak valid).

**Dampak:** `current_amount` pada tabungan sudah berubah, tapi tidak ada transaksi yang tercatat dan saldo wallet tidak terpotong. Data keuangan inkonsisten.

**Fix:** Gunakan RPC function PostgreSQL untuk menjalankan keduanya dalam satu transaction.

---

### BUG-005 · `useMarkDebtPaid` & `usePayDebt` Tidak Atomik

**File:** `src/hooks/useDebts.js:82-101`, `src/hooks/useDebts.js:125-147`

**Deskripsi:**  
Sama dengan BUG-004. Update status hutang (step 1) dan pencatatan transaksi (step 2) berjalan sequential:

```js
// useMarkDebtPaid — step 1
await supabase.from('debts').update({ is_paid: true, remaining_amount: 0 }).eq('id', id)

// useMarkDebtPaid — step 2 (tidak atomik dengan step 1)
await supabase.from('transactions').insert({ type: txType, amount: remainingAmount, ... })
// ↑ jika ini gagal, hutang sudah ditandai lunas tapi wallet tidak terpotong
```

**Dampak:**
- Hutang ditandai lunas tapi saldo wallet tidak berkurang
- Tidak ada bukti transaksi pembayaran
- Tidak bisa di-undo secara otomatis

---

### BUG-006 · Query Kategori Rusak Saat Import Tanpa Family

**File:** `src/hooks/useDataImportExport.js:91`

**Deskripsi:**  
```js
const { data: existingCategories } = await supabase
  .from('categories')
  .select('id, name, type')
  .or(`family_id.eq.${family?.id},family_id.is.null`)  // ← BUG
```

Jika `family?.id` adalah `undefined`, query menjadi:
```
family_id.eq.undefined,family_id.is.null
```

PostgREST akan mengembalikan error (invalid syntax) atau mengabaikan filter tersebut, sehingga semua kategori dikembalikan — termasuk milik keluarga lain.

**Dampak:** Import CSV bisa gagal dengan error tidak jelas, atau lebih buruk, import menggunakan kategori milik keluarga lain.

**Fix:**
```js
if (family?.id) {
  catQuery = catQuery.or(`family_id.eq.${family.id},family_id.is.null`)
} else {
  catQuery = catQuery.is('family_id', null)
}
```

---

## 🟡 MEDIUM — Perlu diperbaiki dalam sprint berikutnya

---

### BUG-007 · `parseOlloDate` Fallback ke Tanggal Hari Ini Jika Format Tidak Valid

**File:** `src/utils/csvUtils.js:107-115`

**Deskripsi:**  
```js
export function parseOlloDate(olloDate) {
  if (!olloDate) return new Date().toISOString()  // ← fallback ke hari ini
  const date = new Date(olloDate)
  if (isNaN(date.getTime())) {
    return new Date().toISOString()  // ← fallback ke hari ini jika format salah
  }
  return date.toISOString()
}
```

Jika CSV punya kolom Date yang kosong atau formatnya tidak dikenali, transaksi diimport dengan **tanggal hari ini** tanpa peringatan kepada user.

**Dampak:** Transaksi dari tahun lalu bisa masuk ke laporan bulan ini. User tidak tahu ada transaksi yang salah tanggal.

---

### BUG-008 · Wallet Import Selalu Diberi Tipe `'cash'` (E-Wallet Salah Tipe)

**File:** `src/hooks/useDataImportExport.js:113`

**Deskripsi:**  
```js
const walletInserts = newWalletsList.map(wallet => ({
  name: wallet.name,
  type: wallet.name.toLowerCase().includes('bank') ||
        wallet.name.toLowerCase().includes('card') ? 'bank' : 'cash',
  // ↑ Dana, OVO, GoPay, DANA → semua dapat tipe 'cash', bukan 'ewallet'
}))
```

Wallet e-wallet dari Ollo seperti "Dana", "GoPay", "OVO", "ShopeePay" semuanya akan diimport sebagai tipe `'cash'`.

**Dampak:** Tampilan ikon/warna kantong salah. Tidak ada dampak finansial, tapi membingungkan user.

---

### BUG-009 · `useCreateSavingsGoal` Tidak Menyimpan `user_id`

**File:** `src/hooks/useSavingsGoals.js:35-38`

**Deskripsi:**  
```js
mutationFn: async (data) => {
  const { error } = await supabase.from('savings_goals').insert({
    ...data,
    family_id: family.id,
    // ← user_id tidak pernah di-set
  })
```

Semua savings goals disimpan dengan `user_id = null`. Artinya tidak bisa tahu siapa di dalam keluarga yang membuat tabungan tersebut.

**Dampak:** Report per anggota tidak bisa menampilkan data tabungan per individu. Jika ada fitur filter per member, tabungan tidak akan muncul.

---

### BUG-010 · `useCreateDebt` dan `useCreateBudget` Tidak Menyimpan `user_id`

**File:** `src/hooks/useDebts.js:35-40`, `src/hooks/useBudget.js:58-61`

**Deskripsi:**  
Sama seperti BUG-009. `user_id` tidak pernah di-set pada saat membuat hutang dan anggaran.

```js
// useCreateDebt
await supabase.from('debts').insert({
  ...data,
  family_id: family.id,
  remaining_amount: data.amount,
  // ← tidak ada user_id
})
```

**Dampak:** Hutang dan anggaran tidak bisa dikaitkan ke anggota keluarga tertentu.

---

### BUG-011 · Nama Wallet Tidak Di-trim Sebelum Disimpan

**File:** `src/components/wallets/WalletModal.jsx:68,84`

**Deskripsi:**  
Validasi sudah benar menggunakan `form.name.trim()`, tapi nilai yang disimpan ke database tidak di-trim:

```js
// Validasi — benar (pakai trim)
if (!form.name.trim()) errs.name = 'Nama kantong wajib diisi'

// Payload — tidak di-trim
const payload = {
  name: form.name,  // ← spasi di awal/akhir ikut tersimpan
  ...
}
```

**Cara trigger:** User mengetik `"  BCA  "` (dengan spasi) → tersimpan sebagai `"  BCA  "`.

**Dampak:** Duplikasi wallet yang tampak sama tapi berbeda secara string. Deteksi duplikat pada import CSV juga bisa gagal karena perbandingan `toLowerCase()` yang gagal match.

---

### BUG-012 · `useDeleteWallet` Menghapus Wallet Tanpa Konfirmasi + Tanpa Cek Transaksi

**File:** `src/hooks/useWallets.js:80-85`

**Deskripsi:**  
Tidak ada pemeriksaan apakah wallet memiliki transaksi sebelum dihapus. Jika wallet dihapus dan ada transaksi yang terhubung, schema DB menjalankan `ON DELETE SET NULL` — semua transaksi tersebut kehilangan referensi wallet (`wallet_id = null`).

**Dampak:**
- Riwayat transaksi kehilangan informasi wallet
- Saldo tidak berubah (karena wallet dihapus, bukan transaksinya)
- Laporan per-wallet menjadi tidak lengkap

---

### BUG-013 · Transfer Tidak Cek Saldo Mencukupi di Client-Side

**File:** `src/components/wallets/TransferModal.jsx` (UI), `src/hooks/useWallets.js:94-121`

**Deskripsi:**  
Tidak ada validasi apakah saldo wallet asal cukup sebelum melakukan transfer. DB trigger akan tetap mengurangkan saldo meski menjadi negatif karena kolom `balance` tidak memiliki constraint `CHECK (balance >= 0)`.

**Cara trigger:** Transfer Rp 500.000 dari wallet yang hanya punya saldo Rp 100.000.

**Dampak:** Saldo wallet bisa menjadi negatif tanpa peringatan.

---

### BUG-014 · `useDataExport` untuk Solo User Mengambil Semua Kategori Global

**File:** `src/hooks/useDataImportExport.js:325-333`

**Deskripsi:**  
```js
// Untuk solo user (tidak ada family):
catQuery = catQuery.or(`family_id.is.null`)
```

Ini mengambil **semua kategori default global** (25+ kategori) tanpa filter user. File CSV export akan berisi informasi kategori dari semua kategori default, bukan hanya yang digunakan user tersebut.

**Dampak:** CSV export membengkak dan berisi kategori yang tidak relevan.

---

## 🟢 LOW — Nice to have / perbaikan minor

---

### BUG-015 · `downloadCSV` di `csvUtils.js` Tidak Merevoke Blob URL

**File:** `src/utils/csvUtils.js:45-57`

**Deskripsi:**  
```js
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  link.click()
  document.body.removeChild(link)
  // ← URL.revokeObjectURL(url) tidak dipanggil → memory leak
}
```

*Catatan: Fungsi ini tidak dipakai di export utama (useDataExport sudah inline + revoke), tapi bisa dipakai di masa depan.*

---

### BUG-016 · Kata Sandi `DELETE` Bisa Dihindari dengan Copy-Paste Tersembunyi

**File:** `src/components/settings/DangerZoneSection.jsx:27`

**Deskripsi:**  
```js
if (confirmText !== 'DELETE') return
```

Validasi hanya cek string, tidak cek apakah user benar-benar mengetiknya. User bisa paste teks "DELETE" dan langsung klik tanpa sadar. Bukan bug fatal, tapi mengurangi efektivitas konfirmasi.

**Saran:** Tambahkan delay kecil atau syarat tambahan (misalnya checkbox "Saya mengerti").

---

### BUG-017 · Tidak Ada Batasan Maksimum `limit(2000)` Bisa Tidak Cukup

**File:** `src/hooks/useDataImportExport.js:163`

**Deskripsi:**  
```js
.limit(2000)
```

Duplikat detection hanya mengecek 2000 transaksi terakhir. Jika user sudah punya >2000 transaksi dan mencoba import CSV lama, transaksi yang ada di luar 2000 tidak akan terdeteksi sebagai duplikat.

**Dampak:** Transaksi lama bisa diimport ganda jika sudah ada >2000 transaksi.

---

### BUG-018 · `useCopyBudgetFromLastMonth` Tidak Mengangani Error "Anggaran Sudah Ada"

**File:** `src/hooks/useBudget.js:121-124`

**Deskripsi:**  
```js
const { error: insertError } = await supabase.from('budgets').upsert(inserts, {
  onConflict: 'family_id,category_id,year,month',
})
```

Upsert digunakan dengan benar. Namun jika ada budget bulan ini yang sudah diisi manual oleh user, upsert akan **menimpa nilai yang sudah ada** tanpa konfirmasi. User tidak diperingatkan bahwa data lamanya akan ditimpa.

---

### BUG-019 · Wallet Baru dari Import Tidak Punya `initial_balance`

**File:** `src/hooks/useDataImportExport.js:111-117`

**Deskripsi:**  
```js
const walletInserts = newWalletsList.map(wallet => ({
  name: wallet.name,
  type: '...',
  balance: 0,
  // ← initial_balance tidak di-set, default schema: 0
}))
```

Wallet yang dibuat otomatis saat import memiliki `initial_balance = 0`. Jika fitur "Hapus Semua Transaksi" dijalankan, semua wallet ini akan direset ke saldo 0 — yang memang benar. Tapi jika user ingin mengedit `initial_balance` setelah import, nilainya tidak mencerminkan kondisi awal akun mereka.

**Dampak:** Minor — hanya membingungkan jika user melihat "Saldo Awal: Rp 0" pada wallet hasil import.

---

### BUG-020 · `filteredCategories` Menampilkan Semua Kategori Saat Tipe Transfer

**File:** `src/components/transactions/TransactionModal.jsx:62-64`

**Deskripsi:**  
```js
const filteredCategories = categories?.filter(
  (c) => form.type === 'transfer' ? true : c.type === form.type
) || []
```

Saat tipe "transfer", semua kategori (income + expense) ditampilkan. Namun field kategori disembunyikan untuk transfer (`{form.type !== 'transfer' && ...}`), jadi ini tidak menyebabkan bug visual. Tapi jika ada logika yang membaca `filteredCategories` untuk keperluan lain, bisa menyebabkan data yang tidak konsisten.

**Dampak:** Tidak berdampak secara langsung, tapi kode membingungkan.

---

## Matriks Risiko

```
Dampak ↑
        │  BUG-003   BUG-004
HIGH    │  BUG-006   BUG-005
        │  BUG-001
        │  BUG-002
MEDIUM  │  BUG-007  BUG-013  BUG-014
        │  BUG-008  BUG-012
LOW     │  BUG-009  BUG-011  BUG-019
        │  BUG-010  BUG-018
        └──────────────────────────→ Probabilitas
              Jarang   Kadang  Sering
```

---

## Prioritas Perbaikan yang Disarankan

| Urutan | Bug ID | Alasan |
|--------|--------|--------|
| 1 | BUG-003 | Setiap user import CSV kena dampak ini di WIB timezone |
| 2 | BUG-006 | Import bisa gagal atau menggunakan data kategori yang salah |
| 3 | BUG-004, BUG-005 | Data keuangan bisa korup; susah dideteksi |
| 4 | BUG-001 | New user mendapat UX sangat buruk |
| 5 | BUG-013 | Saldo bisa negatif tanpa warning |
| 6 | BUG-008 | Semua e-wallet terdeteksi sebagai 'cash' |
| 7 | BUG-011 | Nama wallet dengan spasi menyebabkan duplikasi |
| 8 | BUG-009, BUG-010 | Tracking per-member tidak akurat |
