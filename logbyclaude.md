# Log Perubahan oleh Claude

Dokumen ini mencatat semua perubahan kode yang dilakukan Claude pada project MoneyFam.
Tujuan: agar AI lain dapat memahami konteks, alasan, dan detail teknis setiap perubahan.

---

## Sesi: Mei 2026

### Masalah yang Diselesaikan

1. **Import CSV stuck loading 5+ menit**
2. **Income & transfer tidak terekam setelah import**
3. **Tombol "Hapus Semua Data" loading sangat lama**
4. **Fitur baru: Undo import (hapus data yang baru diimport)**
5. **Fitur baru: Edit kantong + koreksi saldo**
6. **Fitur baru: Hapus semua transaksi dengan konfirmasi 2 langkah**

---

## 1. `src/utils/csvUtils.js`

### Perubahan
- `mapOlloType` sekarang mengembalikan `null` untuk tipe yang tidak dikenal (sebelumnya: `'expense'`)
- `convertOlloToMoneyFam` melewati baris jika `type === null`
- `to_wallet_id` hanya diisi untuk TRANSFER (bukan semua tipe)
- `category` dikosongkan (`null`) untuk transaksi TRANSFER
- Kategori hanya dikumpulkan untuk non-transfer

### Alasan
Format CSV Ollo memiliki tipe: `EXPENSE`, `INCOME`, `TRANSFER`, `SYSTEM`.
Tipe `SYSTEM` adalah pencatatan internal tabungan Ollo — bukan transaksi nyata, harus dilewati.
Sebelumnya `SYSTEM` dipetakan ke `'expense'` sehingga muncul sebagai pengeluaran palsu.

### Implikasi
- Jumlah transaksi yang diimport akan lebih sedikit dari total baris CSV (baris SYSTEM dilewati)
- Ini adalah perilaku yang benar, bukan bug

---

## 2. `src/hooks/useDataImportExport.js`

### Perubahan: Batch insert wallet & kategori

**Sebelum (lambat):**
```js
for (const wallet of wallets) {
  const { data } = await supabase.from('wallets').insert(wallet).select('id, name').single()
  walletIdMap.set(wallet.name, data.id)
}
```

**Sesudah (cepat):**
```js
const newWalletsList = wallets.filter(w => !existingWalletMap.has(w.name.toLowerCase()))
if (newWalletsList.length > 0) {
  const { data: insertedWallets, error: walletError } = await supabase
    .from('wallets').insert(walletInserts).select('id, name')
  if (walletError) throw walletError
  for (const w of insertedWallets) { walletIdMap.set(w.name, w.id) }
}
```

### Alasan
Sequential insert = N round-trip ke Supabase. Untuk 10 wallet = 10 HTTP requests.
Batch insert = 1 HTTP request untuk semua wallet sekaligus.

### Perubahan: Pembagian skipped count

**Sebelum:** satu counter `skipped`

**Sesudah:** tiga counter:
- `skippedDuplicate`: transaksi yang sudah ada di DB (berdasarkan composite key `date|amount|description|wallet_id`)
- `skippedInvalid`: wallet tidak ditemukan (tidak bisa diinsert)
- `systemSkipped`: baris SYSTEM dari Ollo yang sengaja dilewati

### Perubahan: Capture importedIds

```js
const { data: insertedRows, error: insertError } = await supabase
  .from('transactions')
  .insert(toInsert)
  .select('id')  // ← tambahan ini
```

Digunakan untuk fitur "Batalkan import ini".

### Perubahan: Tambah hook `useDeleteImport`

```js
export function useDeleteImport() {
  return useMutation({
    mutationFn: async (ids) => {
      const { error } = await supabase.from('transactions').delete().in('id', ids)
      if (error) throw error
      return ids.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries(...)
    }
  })
}
```

### Perubahan: Fix query kategori

**Sebelum:** `.or(`family_id.eq.${family?.id || 'null'},family_id.is.null`)`
— ketika `family?.id` undefined, menghasilkan `family_id.eq.null,family_id.is.null` (redundan tapi harmless)

**Sesudah:** `.or(`family_id.eq.${family?.id},family_id.is.null`)`
— hanya dijalankan jika `family?.id` ada

### Return value

```js
return {
  totalCsv,       // total baris di CSV
  imported,       // berhasil diimport
  skippedDuplicate,
  skippedInvalid,
  systemSkipped,
  errors,         // array string error
  importedIds,    // array UUID transaksi yang baru diimport
}
```

---

## 3. `src/hooks/useTransactions.js`

### Perubahan: Fix `useMemberSpending` — 400 Bad Request

**Masalah:** Query dengan embedded join `profiles(id, full_name, role)` gagal karena FK `transactions.user_id` mengarah ke `auth.users.id`, bukan langsung ke `profiles.id`. PostgREST tidak bisa melakukan join melalui FK tidak langsung.

**Sebelum (error):**
```js
const { data, error } = await supabase
  .from('transactions')
  .select('amount, type, user_id, profiles(id, full_name, role)')
  ...
```

**Sesudah (benar):**
```js
const [txResult, profileResult] = await Promise.all([
  supabase.from('transactions').select('amount, type, user_id').eq('family_id', family.id)...,
  supabase.from('profiles').select('id, full_name, role').eq('family_id', family.id),
])
const profileMap = new Map((profileResult.data || []).map(p => [p.id, p]))
```

### Perubahan: Tambah `useDeleteAllTransactions`

**Versi 1 (lambat — sequential loop):**
```js
// Delete transactions
await supabase.from('transactions').delete().eq('family_id', family.id)

// Reset wallet balances — SEQUENTIAL (lambat untuk banyak wallet)
for (const w of wallets) {
  await supabase.from('wallets').update({ balance: w.initial_balance || 0 }).eq('id', w.id)
}
```

**Masalah versi 1:**
- Delete memicu trigger `trg_wallet_balance_delete` per baris (N transaksi = N UPDATE di tabel wallets)
- Loop wallet bersifat sequential: N wallet = N HTTP request
- Untuk 200 transaksi + 10 wallet = ~210 round-trip → sangat lambat

**Versi 2 (cepat — RPC server-side):**
```js
const { error } = await supabase.rpc('delete_all_family_transactions', {
  p_family_id: family.id
})
```

### Alasan versi RPC lebih cepat
Semua operasi dijalankan di sisi PostgreSQL dalam satu call:
- Trigger tetap jalan per-baris, tapi tanpa network latency antar baris
- `UPDATE wallets SET balance = initial_balance WHERE family_id = ?` dijalankan satu kali setelah delete
- Client hanya menunggu 1 HTTP response, bukan 200+

---

## 4. `supabase/schema.sql`

### Tambahan: 2 RPC function baru

```sql
-- Untuk user yang punya family
create or replace function delete_all_family_transactions(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Cek caller adalah anggota family ini
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and family_id = p_family_id
  ) then
    raise exception 'Not authorized';
  end if;

  delete from transactions where family_id = p_family_id;

  -- Reset semua wallet ke initial_balance dalam 1 statement
  update wallets
  set balance = initial_balance
  where family_id = p_family_id;
end;
$$;

-- Untuk solo user (tidak punya family)
create or replace function delete_all_user_transactions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  delete from transactions where user_id = p_user_id and family_id is null;

  update wallets
  set balance = initial_balance
  where user_id = p_user_id and family_id is null;
end;
$$;
```

**Catatan:** Kedua fungsi ini harus dijalankan manual di Supabase Dashboard → SQL Editor.

**Mengapa `security definer`?**
- Fungsi dijalankan dengan hak akses owner (bypass RLS)
- Lebih aman karena ada pengecekan manual (`auth.uid()` vs `p_family_id`)
- Memastikan semua transaksi family terhapus, bukan hanya milik caller
- `set search_path = public` mencegah search_path injection

---

## 5. `src/components/settings/ImportExportSection.jsx`

### Perubahan: Breakdown hasil import

**Sebelum:** hanya menampilkan jumlah yang berhasil diimport

**Sesudah:**
```
Total CSV: X baris
✅ Y transaksi berhasil diimport
⚠ Z duplikat (sudah ada di database)
⚫ N baris SYSTEM dilewati (bukan transaksi nyata)
🔴 M transaksi tidak valid (dompet tidak ditemukan)
```

### Perubahan: Fitur "Batalkan import ini"

Setelah import berhasil, muncul tombol kecil di bawah hasil:
- "Batalkan import ini" → konfirmasi → "Ya, Hapus"
- Menghapus semua transaksi yang baru diimport (berdasarkan `importedIds`)
- Menggunakan hook `useDeleteImport`

```jsx
{importResult.importedIds?.length > 0 && (
  <div>
    {!confirmDelete ? (
      <button onClick={() => setConfirmDelete(true)}>
        <Trash2 /> Batalkan import ini
      </button>
    ) : (
      <div>
        <p>Hapus {importResult.importedIds.length} transaksi yang baru diimport?</p>
        <Button variant="danger" onClick={handleDeleteImport}>Ya, Hapus</Button>
        <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Batal</Button>
      </div>
    )}
  </div>
)}
```

---

## 6. `src/components/settings/DangerZoneSection.jsx` ← FILE BARU

### Fungsi
Card "Zona Berbahaya" dengan tombol "Hapus Data" untuk menghapus semua transaksi.

### Flow konfirmasi 2 langkah

**Step 1:** Modal umum
- Judul: "Konfirmasi Hapus Data"
- Pesan: penjelasan dampak
- Tombol: "Batal" | "Ya, Lanjutkan"

**Step 2:** Modal ketik konfirmasi
- User harus mengetik `DELETE` (huruf besar, exact match)
- Tombol "Hapus Semua Data" disabled sampai teks cocok
- Loading state saat sedang proses

```jsx
const handleFinalDelete = async () => {
  if (confirmText !== 'DELETE') return  // guard
  try {
    await deleteMutation.mutateAsync()
    toast.success('Semua data transaksi berhasil dihapus...')
    setStep2Open(false)
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus data')
  }
}
```

---

## 7. `src/components/wallets/WalletModal.jsx`

### Perubahan: Tambah field edit saldo

**Form state baru:**
```js
const defaultForm = {
  name: '',
  type: 'cash',
  icon: '💳',
  color: '#10b981',
  initial_balance: '0',
  balance: '',      // ← BARU
  description: '',
}
```

**Edit mode load balance:**
```js
setForm({
  ...
  initial_balance: String(wallet.initial_balance ?? 0),
  balance: String(wallet.balance ?? 0),  // ← BARU
})
```

**Payload logic:**
```js
const payload = {
  ...
  initial_balance: Number(form.initial_balance),
  ...(isEdit
    ? { balance: form.balance !== '' ? Number(form.balance) : undefined }
    : { balance: Number(form.initial_balance) }),
}
```

**UI tambahan (hanya di edit mode):**
```jsx
{isEdit && (
  <div>
    <Input
      label="Saldo Saat Ini (Rp)"
      type="number"
      value={form.balance}
      onChange={update('balance')}
      helpText="Ubah ini untuk mengoreksi saldo secara manual"
    />
    <p className="text-xs text-amber-600 mt-1">
      ⚠ Mengubah saldo saat ini tidak mempengaruhi riwayat transaksi
    </p>
  </div>
)}
```

### Alasan
User perlu bisa mengoreksi saldo wallet jika ada ketidaksesuaian (misalnya setelah import yang salah).
Perubahan saldo manual tidak mempengaruhi riwayat transaksi — hanya mengubah kolom `balance` langsung.

---

## 8. `src/pages/Settings.jsx`

### Perubahan
Tambah import dan render `DangerZoneSection`:

```jsx
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'

// Di dalam JSX, setelah ImportExportSection:
<DangerZoneSection />
```

---

## Catatan Teknis Penting

### Mengapa trigger per-row lambat untuk bulk delete?
Tabel `transactions` memiliki trigger `trg_wallet_balance_delete` yang berjalan `FOR EACH ROW`.
Artinya untuk 200 baris yang dihapus = 200 kali fungsi trigger dipanggil, masing-masing melakukan `UPDATE wallets SET balance = balance ± amount WHERE id = ?`.
Ini berjalan secara sequential di PostgreSQL dan sangat lambat jika dipanggil melalui HTTP (setiap trigger call = 1 lock acquisition pada tabel wallets).

### Solusi: RPC function
Dengan memindahkan logic ke server-side PostgreSQL function:
- Semua operasi berjalan dalam 1 transaksi database
- Tidak ada network latency antar operasi
- `UPDATE wallets SET balance = initial_balance WHERE family_id = ?` di akhir adalah single-statement yang meng-override hasil trigger

### Duplicate detection pada import
Menggunakan composite key: `date|amount|description|wallet_id`
Dibandingkan dengan transaksi yang sudah ada (diambil dengan `.limit(2000).order('date', ascending: false)`)
Jika key sudah ada → dilewati sebagai `skippedDuplicate`

### PostgREST embedded join limitation
`transactions.user_id` → `auth.users.id` → `profiles.id` adalah join 2 tingkat.
PostgREST hanya mendukung join 1 tingkat melalui FK langsung.
Solusi: 2 query parallel (`transactions` + `profiles`) lalu digabung di client dengan `Map`.

---

## File yang Diubah

| File | Status | Deskripsi |
|------|--------|-----------|
| `src/utils/csvUtils.js` | Diubah | Fix SYSTEM type, fix kategori/wallet untuk transfer |
| `src/hooks/useDataImportExport.js` | Diubah | Batch insert, breakdown count, importedIds, useDeleteImport |
| `src/hooks/useTransactions.js` | Diubah | Fix useMemberSpending, tambah useDeleteAllTransactions |
| `supabase/schema.sql` | Diubah | Tambah 2 RPC function delete_all_*_transactions |
| `src/components/settings/ImportExportSection.jsx` | Diubah | UI breakdown, fitur undo import |
| `src/components/settings/DangerZoneSection.jsx` | BARU | Zona Berbahaya, konfirmasi 2 langkah |
| `src/components/wallets/WalletModal.jsx` | Diubah | Field saldo saat ini untuk edit mode |
| `src/pages/Settings.jsx` | Diubah | Tambah DangerZoneSection |

---

## SQL yang Harus Dijalankan Manual di Supabase

Jalankan di **Supabase Dashboard → SQL Editor**:

```sql
create or replace function delete_all_family_transactions(p_family_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and family_id = p_family_id) then
    raise exception 'Not authorized';
  end if;
  delete from transactions where family_id = p_family_id;
  update wallets set balance = initial_balance where family_id = p_family_id;
end;
$$;

create or replace function delete_all_user_transactions(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> p_user_id then raise exception 'Not authorized'; end if;
  delete from transactions where user_id = p_user_id and family_id is null;
  update wallets set balance = initial_balance where user_id = p_user_id and family_id is null;
end;
$$;
```

---

## Sesi: Oktober 2026 — Audit Keamanan & Bug

### Masalah yang Diselesaikan

1. **[HIGH] Anggaran user mode personal bisa dibaca/diubah/dihapus siapa pun yang login**
2. **[HIGH] RPC pembayaran tabungan/hutang bisa mengubah saldo kantong milik orang lain**
3. **Import CSV gagal total jika ada kantong e-wallet (GoPay, OVO, DANA, …)**
4. **Foto nota tidak tampil (bucket private, tapi yang disimpan URL public)**
5. **Edit target tabungan tidak menyimpan `color` & `is_completed`**
6. **Edit hutang tidak menyimpan `description`; ubah total tidak menggeser sisa**
7. **Laporan, statistik, & export terpotong di 1000 baris (batas max-rows Supabase)**
8. **Edit jumlah pembayaran tabungan/hutang tidak ikut mengubah saldo kantong**
9. **Notifikasi budget_warning terkirim di setiap transaksi setelah lewat 80%**
10. **Bundle utama 717 KB**

---

## 1. `supabase/migration_security_hardening.sql` (BARU) + `supabase/schema.sql`

### Perubahan
- `budgets`: tambah kolom `user_id` (dipakai aplikasi tapi tidak ada di schema). Policy diganti dari `family_id is null or …` menjadi `(family_id is null and user_id = auth.uid()) or (family_id is not null and family_id = get_user_family_id())`
- Helper baru `can_access_wallet(p_wallet_id)` (security definer)
- `add_savings_payment`, `update_savings_payment`, `add_debt_payment`, `update_debt_payment`, `mark_debt_paid_with_payment` ditulis ulang:
  - validasi kantong via `can_access_wallet`, validasi `p_amount > 0` dan `p_type`
  - anggota keluarga boleh mencatat pembayaran target/hutang keluarga (sebelumnya hanya pembuatnya)
  - transaksi & payment dicatat dengan `user_id = auth.uid()` (pencatat sebenarnya)
  - `update_*_payment` ikut meng-update `transactions.amount/date` terkait
- Dihapus: `add_to_savings_goal_atomic`, `mark_debt_paid_atomic`, `pay_debt_atomic` (tidak dipakai aplikasi, tanpa cek kantong)
- Policy insert/update di wallets, transactions, transfers, savings_goals, debts, investments, savings_goal_payments, debt_payments, categories: `with check` mewajibkan family_id milik sendiri
- `search_path = public` untuk fungsi security definer lama

### Alasan
Fungsi security definer berjalan sebagai owner (bypass RLS), dan trigger saldo ikut berjalan dengan hak itu. Tanpa cek `p_wallet_id`, siapa pun yang tahu UUID kantong orang lain bisa menaikkan/menurunkan saldonya.

### Implikasi
- **Harus dijalankan manual** di Supabase SQL Editor (lihat bagian bawah). Aman dijalankan ulang; tabel/fungsi yang belum ada dilewati
- Payment lama tetap tercatat atas nama pembuat target/hutang, jadi hanya dia yang bisa edit/hapus payment lama
- Diuji di PGlite (Postgres WASM) dengan stub `auth`: seluruh rantai migrasi + 14 tes RLS/RPC lulus. Belum diuji di Supabase asli

---

## 2. `src/lib/utils.js` — `fetchAllRows(buildQuery)`

### Perubahan
Helper baru yang mengambil data per 1000 baris (`.order('id').range(...)`) sampai habis. `buildQuery` harus membuat query baru setiap dipanggil.

### Dipakai di
- `src/hooks/useTransactions.js`: semua hook agregasi (monthly stats, 6 bulan, trend, kategori, member, harian, periode, tahunan), budget warning, laporan bulanan
- `src/hooks/useBudget.js`: perhitungan `spent`
- `src/hooks/useDataImportExport.js`: cek duplikat import (sebelumnya `.limit(10000)` yang tetap terpotong di 1000) dan **export** (sebelumnya backup tidak lengkap)

### Catatan
`useTopTransactions` sengaja tetap `.limit(n)`. Jika max-rows project diubah < 1000, helper berhenti di halaman pertama.

---

## 3. `src/hooks/useTransactions.js` (lainnya)

- `yearMonthOf('YYYY-MM-DD')` menggantikan `new Date(t.date).getMonth()` (string tanggal dibaca sebagai UTC → bisa geser bulan di zona UTC-x)
- Budget warning: dedupe per kategori + `period` + `level` (`near`/`over`) lewat `notifications.data`. Notifikasi lama tidak punya field ini, jadi bisa terkirim sekali lagi setelah deploy

---

## 4. Perbaikan kecil

| File | Perubahan |
|------|-----------|
| `src/hooks/useDataImportExport.js` | Tipe kantong import `'e-wallet'` → `'ewallet'` (sesuai check constraint) |
| `src/hooks/useSavingsGoals.js` | allowedFields: tambah `color`, `is_completed`; hapus kolom yang tidak ada (`is_active`, `category_id`, `note`) |
| `src/hooks/useDebts.js` | allowedFields: tambah `description`; hapus `person_name`, `note`, `category_id` |
| `src/pages/SavingsDebts.jsx` | Edit hutang: `remaining = max(0, remaining + (amountBaru - amountLama))`, `is_paid` ikut diset |
| `src/components/transactions/TransactionModal.jsx` | `getReceiptSignedUrl()`: ambil path dari URL public yang tersimpan → `createSignedUrl` (1 jam). Format `receipt_url` di DB tidak berubah |
| `src/hooks/useFamily.js` | Kode undangan 8 karakter tanpa modulo bias. Kode 6 karakter lama tetap berlaku |
| `vite.config.js` | `manualChunks`: `react-vendor`, `supabase`, `motion`. Recharts **sengaja tidak** dimasukkan ke manual chunk (jika dimasukkan, chunk chart ikut di-preload di halaman awal) |
| `package-lock.json` | `npm audit fix` (13 dari 15 advisory) |

---

## Belum Dikerjakan

- `react-router` 2 advisory moderate: butuh upgrade ke v7 (breaking)
- `get_family_by_invite_code` bisa dipanggil tanpa login (dipakai saat registrasi sebelum akun dibuat); belum ada masa berlaku kode undangan
- `Reports.jsx` (modal transaksi harian) edit/hapus langsung via supabase tanpa invalidate query `wallets`

---

## SQL yang Harus Dijalankan Manual di Supabase

Jalankan seluruh isi **`supabase/migration_security_hardening.sql`** di **Supabase Dashboard → SQL Editor** (setelah `migration_payment_history.sql`).
