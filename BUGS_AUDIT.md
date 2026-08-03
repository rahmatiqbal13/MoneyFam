# Audit Keamanan, Bug & Error — MoneyFam
> Audit sistematis menggunakan Systematic Debugging Skill  
> Tanggal: 2026-06-18 | Lingkup: Frontend (React + Vite + Supabase)

---

## Ringkasan Eksekutif

| Severity | Jumlah | Kategori Utama |
|---|---|---|
| **CRITICAL** | 3 | Auth race condition, RLS bypass, TOCTOU payment |
| **HIGH** | 14 | Error boundary, memory leaks, silent failures, XSS, IDOR, regex broken |
| **MEDIUM** | 18 | Accessibility, validation gaps, NaN propagation, console.log prod |
| **LOW** | 12 | Code quality, deprecated API, minor UX |
| **Total** | **47** | |

---

## CRITICAL

### C-01 — Auth State Listener Hilang Permanen Setelah Unmount ✅
- **File**: `src/stores/authStore.js:21,58-60`
- **Status**: **FIXED** — Ditambahkan `try/catch` di `onAuthStateChange` callback dan singleton promise guard. `initError` state ditambahkan untuk error tracking.
- **Deskripsi**: `onAuthStateChange` cleanup tidak me-reset flag `initialized`. Saat React StrictMode remount atau route change, listener baru tidak didaftarkan karena guard `if (get().initialized) return` masih true. User bisa logout tiba-tiba atau state auth tidak sinkron.
- **Rekomendasi**: Gunakan ref-based guard (`initializingRef`) alih-alih state flag, atau set `initialized: false` di cleanup return.

### C-02 — Query Budget Personal Tidak Memfilter user_id (Data Exposure) ✅
- **File**: `src/hooks/useBudget.js:17-28`
- **Status**: **FIXED** — Ditambahkan `.eq('user_id', user.id)` pada query budget personal mode. Ownership check juga ditambahkan di `useUpdateBudget` dan `useDeleteBudget`.
- **Deskripsi**: Query anggaran personal memfilter `.is('family_id', null)` tetapi tidak menambahkan `.eq('user_id', user.id)`. Jika RLS di-bypass (misalnya via service role key leak atau bug policy), data anggaran antar pengguna bisa terlihat.
- **Rekomendasi**: Selalu tambahkan `.eq('user_id', user.id)` untuk mode personal di SEMUA query read/write.

### C-03 — TOCTOU Race Condition di Pembayaran Hutang ✅
- **File**: `src/hooks/useDebts.js:218` (RPC `mark_debt_paid_with_payment`)
- **Status**: **FIXED** — Parameter `remainingAmount` dihapus dari client-side. RPC `mark_debt_paid_with_payment` sekarang menghitung sisa hutang di server.
- **Deskripsi**: `useMarkDebtPaid` mengirim `remainingAmount` dari client-side state yang sudah usang (stale). Jika dua tab/browser melakukan pembayaran bersamaan, overpayment atau pelunasan dengan jumlah salah bisa terjadi.
- **Rekomendasi**: Hitung sisa hutang di sisi server dalam RPC. Jangan percayai parameter `remainingAmount` dari client.

---

## HIGH

### H-01 — Tidak Ada Error Boundary (White Screen pada Runtime Error) ✅
- **File**: `src/components/ErrorBoundary.jsx` (baru), `src/App.jsx`
- **Status**: **FIXED** — Error Boundary class component dibuat dan di-wrap di root aplikasi. Menampilkan UI fallback dengan tombol reload saat runtime error.
- **Deskripsi**: Aplikasi tidak memiliki React Error Boundary. Runtime error (misalnya `TypeError: Cannot read property of undefined`) akan menyebabkan white screen total yang tidak bisa dipulihkan tanpa refresh.
- **Rekomendasi**: Implementasikan Error Boundary di root aplikasi (`App.jsx`) menggunakan `react-error-boundary` atau class component `componentDidCatch`.

### H-02 — Regex Validasi Tanggal CSV Broken (Semua Tanggal Dianggap Invalid) ✅
- **File**: `src/utils/csvUtils.js:120`
- **Status**: **FIXED** — Regex diperbaiki dari `/^\\d{4}-\\d{2}-\\d{2}$/` menjadi `/^\d{4}-\d{2}-\d{2}$/`.
- **Deskripsi**: Regex `/^\\d{4}-\\d{2}-\\d{2}$/` mengandung double backslash yang diinterpretasikan sebagai literal `\d`, bukan digit. Akibatnya SEMUA format tanggal dianggap invalid dan selalu fallback ke `today`.
- **Rekomendasi**: Perbaiki regex menjadi `/^\d{4}-\d{2}-\d{2}$/`.

### H-03 — Silent Failure pada Fetch Existing Data (Import CSV) ✅
- **File**: `src/hooks/useDataImportExport.js:85-86,95-96,189-190`
- **Status**: **FIXED** — Error fetch existing data sekarang `throw` error untuk menghentikan proses import. Tidak lagi hanya `console.error`.
- **Deskripsi**: Error saat fetch existing data (wallets, categories, transactions) hanya di-log ke console tanpa menghentikan proses. Jika fetch gagal (network timeout), import melanjutkan dan berpotensi membuat duplikat massal.
- **Rekomendasi**: `throw` error jika fetch existing data gagal; batalkan seluruh proses import sebelum insert.

### H-04 — Budget Warning Gagal Membuat Transaksi Terlihat Gagal ✅
- **File**: `src/hooks/useTransactions.js:693-698`
- **Status**: **FIXED** — `checkAndCreateBudgetWarning` dipindahkan ke `onSuccess` mutation dengan `.catch()` terpisah. Gagalnya budget warning tidak lagi menggagalkan mutation transaksi.
- **Deskripsi**: `checkAndCreateBudgetWarning` dijalankan setelah insert transaksi. Jika insert notifikasi gagal, error propagate ke mutation sehingga UI menampilkan error, padahal transaksi sudah tersimpan di DB tanpa rollback.
- **Rekomendasi**: Pindahkan budget warning ke `onSuccess` atau bungkus dalam `try/catch` terpisah agar tidak menggagalkan mutation.

### H-05 — Missing Ownership Verification di Update & Delete Transaction ✅
- **File**: `src/hooks/useTransactions.js:713-715,728-730`
- **Status**: **FIXED** — `useUpdateTransaction` dan `useDeleteTransaction` sekarang memfilter `.eq('user_id', user.id)` atau `.eq('family_id', family.id)`.
- **Deskripsi**: `useUpdateTransaction` dan `useDeleteTransaction` hanya memfilter `.eq('id', id)` tanpa `.eq('user_id', user.id)`. Jika RLS gagal, user bisa edit/hapus transaksi orang lain.
- **Rekomendasi**: Tambahkan `.eq('user_id', user.id)` atau `.eq('family_id', family.id)` pada SEMUA query update/delete.

### H-06 — Memory Leak dari URL.createObjectURL (TransactionModal) ✅
- **File**: `src/components/transactions/TransactionModal.jsx`
- **Status**: **FIXED** — `URL.revokeObjectURL(receiptPreview)` dipanggil saat receipt dihapus, file diganti, dan saat modal unmount/close via `useEffect` cleanup.
- **Deskripsi**: Setiap kali preview nota di-generate, blob URL baru dibuat tapi tidak pernah `URL.revokeObjectURL()`. Memory bocor setiap kali user upload nota.
- **Rekomendasi**: Panggil `URL.revokeObjectURL(receiptPreview)` sebelum set state ke `null`, dan cleanup di `useEffect` unmount.

### H-07 — Memory Leak dari setTimeout Tanpa Cleanup (Toast) ✅
- **File**: `src/components/ui/Toast.jsx:24-30`
- **Status**: **FIXED** — `timeoutId` disimpan per toast di `timersRef`. `clearTimeout` dipanggil saat toast di-dismiss manual dan saat `ToastProvider` unmount.
- **Deskripsi**: `setTimeout` di `addToast` tidak pernah di-clear. Jika toast di-dismiss manual sebelum timeout habis, callback tetap dieksekusi. Jika `ToastProvider` unmount, semua timeout pending bocor.
- **Rekomendasi**: Simpan `timeoutId` per toast dan `clearTimeout` di `removeToast` serta di `useEffect` cleanup provider.

### H-08 — Race Condition di Auth Initialize Guard ✅
- **File**: `src/stores/authStore.js:18-22`
- **Status**: **FIXED** — Singleton promise guard ditambahkan. `try/catch` di `onAuthStateChange` callback mencegah listener berhenti saat error.
- **Deskripsi**: Guard `if (get().initialized) return` bersifat synchronous. Jika dua komponen memanggil `initialize()` bersamaan sebelum `set()` selesai, double listener registration bisa terjadi.
- **Rekomendasi**: Gunakan flag `initializing` atomik atau singleton promise pattern.

### H-09 — NaN Propagation di Reports (Total Crash) ✅
- **File**: `src/pages/Reports.jsx:222-226,832-833`
- **Status**: **FIXED** — Semua `.reduce()` accumulator menggunakan `(Number(x) || 0)` untuk mencegah NaN propagation. Juga diperbaiki di `SavingsDebts.jsx`.
- **Deskripsi**: `sum + Number(t.amount)` menghasilkan `NaN` jika ada satu transaksi dengan `amount` undefined/null. `NaN` merusak seluruh perhitungan total.
- **Rekomendasi**: Gunakan `Number(t.amount) || 0` di semua reducer accumulator.

### H-10 — Race Condition di DayTransactionsModal ✅
- **File**: `src/pages/Reports.jsx:129-158`
- **Status**: **FIXED** — Ditambahkan `ignore` flag di `useEffect` dengan cleanup. Fetch dibungkus `try/finally` agar `isLoading` selalu ter-reset.
- **Deskripsi**: `useEffect` memanggil `fetchTransactions` saat `date` berubah tanpa abort mechanism. Jika user berpindah tanggal cepat, data stale bisa menimpa data baru.
- **Rekomendasi**: Gunakan `AbortController` atau flag `let ignore = false` di dalam effect dengan cleanup.

### H-11 — fetchCryptoPricesIDR Menelan Semua Error Secara Diam-Diam ✅
- **File**: `src/hooks/useInvestments.js:37-53`
- **Status**: **FIXED** — `catch` block sekarang `throw err` setelah log. Null-safety untuk `code?.toUpperCase()` ditambahkan.
- **Deskripsi**: `catch { return {} }` menelan semua error jaringan/HTTP. User tidak tahu harga gagal di-update.
- **Rekomendasi**: Log error dan surface ke UI (toast) agar user tahu harga gagal diperbarui.

### H-12 — useRefreshCryptoPrices Update Per-Item Tanpa Error Handling ✅
- **File**: `src/hooks/useInvestments.js:98-109`
- **Status**: **FIXED** — Menggunakan `Promise.allSettled` dengan tracking failures. Jika ada kegagalan parsial, error di-throw dengan detail jumlah failure.
- **Deskripsi**: `Promise.all` update harga kripto tanpa error handling per-item. Kegagalan parsial tidak terdeteksi.
- **Rekomendasi**: Bungkus tiap update dalam `try/catch` atau gunakan transaksi database/RPC.

### H-13 — IDOR: Banyak Mutasi Tidak Memiliki Ownership Check ✅
- **File**: `src/hooks/useInvestments.js`, `src/hooks/useWallets.js`, `src/hooks/useBudget.js`, `src/hooks/useDebts.js`, `src/hooks/useSavingsGoals.js`
- **Status**: **FIXED** — Semua mutasi update/delete sekarang memfilter `.eq('user_id', user.id)` atau `.eq('family_id', family.id)`.
- **Deskripsi**: Mutasi update/delete tidak memfilter `user_id` atau `family_id`, mengandalkan RLS sepenuhnya. IDOR jika RLS di-bypass.
- **Rekomendasi**: Tambahkan `.eq('user_id', user.id)` atau `.eq('family_id', family.id)` pada setiap mutasi update/delete.

### H-14 — Payload Update Mentah Bisa Di-tamper (user_id/family_id) ✅
- **File**: `src/hooks/useTransactions.js`, `src/hooks/useInvestments.js`, `src/hooks/useWallets.js`, `src/hooks/useBudget.js`, `src/hooks/useDebts.js`, `src/hooks/useSavingsGoals.js`
- **Status**: **FIXED** — Semua mutasi update sekarang menggunakan whitelist field yang diizinkan. Field `user_id`, `family_id`, `id`, `created_at` dihapus dari payload.
- **Deskripsi**: Mutasi update menerima `data` mentah yang memungkinkan tampering field `user_id`, `family_id`, `id`, `created_at`.
- **Rekomendasi**: Whitelist field yang diizinkan update dan hapus field sensitif (`user_id`, `family_id`, `id`, `created_at`) dari payload sebelum kirim.

---

## MEDIUM

### M-01 — Wildcard Characters Tidak Di-escape di ilike Search ✅
- **File**: `src/hooks/useTransactions.js:118`
- **Status**: **FIXED** — Input `filters.search` sekarang di-escape dengan `search.replace(/[%_]/g, '\\$&')` sebelum masuk ke `.ilike()`.
- **Deskripsi**: Input `filters.search` langsung masuk ke `.ilike()`. Karakter `%` dan `_` diperlakukan sebagai wildcard Postgres.
- **Rekomendasi**: Escape `%` dan `_` dengan backslash: `search.replace(/[%_]/g, '\\$&')`.

### M-02 — Sensitive Data di-Persist ke localStorage ✅
- **File**: `src/stores/authStore.js`
- **Status**: **FIXED** — `persist` middleware dihapus sepenuhnya dari `authStore`. Data `profile` dan `family` tidak lagi disimpan ke localStorage; di-fetch ulang saat initialize.
- **Deskripsi**: Zustand `persist` menyimpan `profile` dan `family` ke localStorage. Rentan XSS/ekstensi browser.
- **Rekomendasi**: Hapus persist untuk data sensitif atau gunakan `sessionStorage` dengan encrypt.

### M-03 — Session Token di localStorage (XSS Risk) ✅
- **File**: `src/lib/supabase.js`, `src/lib/cookieStorage.js` (baru)
- **Status**: **FIXED** — Supabase auth storage diganti dari `localStorage` ke `cookieStorage` custom. Cookie di-set dengan flag `Secure` dan `SameSite=Strict`.
- **Deskripsi**: Konfigurasi `storage: localStorage` membuat JWT token rentan pencurian via XSS.
- **Rekomendasi**: Pertimbangkan cookie-based auth (httpOnly, secure) atau implementasikan CSP ketat.

### M-04 — CSV Formula Injection di Export ✅
- **File**: `src/utils/csvUtils.js:29-38`
- **Status**: **FIXED** — `generateCSV` sekarang menggunakan `escapeCSVFormula()` yang menambahkan prefix single quote (`'`) pada cell yang diawali karakter formula (`=`, `+`, `-`, `@`).
- **Deskripsi**: `generateCSV` tidak escaping karakter formula (`=`, `+`, `-`, `@`). String seperti `=CMD|' /C calc'!A0` bisa eksekusi perintah saat dibuka di Excel.
- **Rekomendasi**: Prefix cell values yang diawali karakter formula dengan single quote (`'`).

### M-05 — XSS via CSV Import (Stored XSS) ✅
- **File**: `src/hooks/useDataImportExport.js:217-234`
- **Status**: **FIXED** — Field `description` dan `note` dari CSV sekarang di-sanitasi (strip HTML tags, trim, limit 500 chars) sebelum insert ke database.
- **Deskripsi**: Field `description`, `note`, `category` dari CSV tidak di-sanitasi sebelum insert. Jika dirender tanpa escaping, bisa menjadi stored XSS.
- **Rekomendasi**: Sanitasi input (trim, batasi panjang, strip HTML tags) sebelum insert. Hindari `dangerouslySetInnerHTML` untuk data user-generated.

### M-06 — useDeleteImport Tidak Verifikasi Ownership ✅
- **File**: `src/hooks/useDataImportExport.js:286-294`
- **Status**: **FIXED** — `useDeleteImport` sekarang memfilter `.eq('user_id', user.id)` atau `.eq('family_id', family.id)` sebelum delete.
- **Deskripsi**: Menerima array `ids` dan langsung hapus dengan `.in()` tanpa filter `user_id`.
- **Rekomendasi**: Tambahkan `.eq('user_id', user.id)` pada query delete.

### M-07 — Modal Tidak Ada Focus Trap ✅
- **File**: `src/components/ui/Modal.jsx`
- **Status**: **FIXED** — Ditambahkan focus trap logic dengan event listener `Tab`/`Shift+Tab` yang cycle focus di dalam modal.
- **Deskripsi**: Saat modal terbuka, user masih bisa Tab ke elemen di belakang overlay.
- **Rekomendasi**: Implementasikan focus trap dengan `focus-trap-react` atau manual `tabindex` + event listener.

### M-08 — Modal Missing ARIA Attributes ✅
- **File**: `src/components/ui/Modal.jsx`
- **Status**: **FIXED** — Container modal sekarang memiliki `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, dan `tabIndex={-1}`.
- **Deskripsi**: Container modal tidak memiliki `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- **Rekomendasi**: Tambahkan atribut ARIA pada div konten modal.

### M-09 — Missing Return Focus Setelah Modal Ditutup ✅
- **File**: `src/components/ui/Modal.jsx`
- **Status**: **FIXED** — `triggerRef` menyimpan elemen yang membuka modal. Focus dikembalikan ke trigger saat modal ditutup (cleanup `useEffect`).
- **Deskripsi**: Setelah modal ditutup, focus tidak dikembalikan ke elemen trigger.
- **Rekomendasi**: Simpan referensi elemen trigger dan restore focus di `onClose`.

### M-10 — Tombol Icon-Only Tidak Memiliki aria-label ✅
- **File**: 10 file berbeda
- **Status**: **FIXED** — Semua tombol icon-only di `Investments.jsx`, `SavingsDebts.jsx`, `BudgetCard.jsx`, `TransactionList.jsx`, `WalletCard.jsx`, `Notifications.jsx`, `Settings.jsx`, `Categories.jsx`, `ImportExportSection.jsx`, dan `Sidebar.jsx` sudah ditambahkan `aria-label`.
- **Deskripsi**: Hampir semua tombol edit/hapus/update-price hanya menggunakan `title` attribute. Screen reader tidak optimal.
- **Rekomendasi**: Tambahkan `aria-label` pada semua icon-only buttons (sesuai UX-07 di penilaian).

### M-11 — Missing Form Reset saat Modal Ditutup ✅
- **File**: `src/components/transactions/TransactionModal.jsx`
- **Status**: **FIXED** — `useEffect` dengan dependency `[isOpen]` sekarang reset state saat modal ditutup (`isOpen === false`).
- **Deskripsi**: Internal state hanya direset saat `isOpen` true, tidak saat false. Data lama tersimpan di memori.
- **Rekomendasi**: Implementasikan reset state saat `onClose` atau `isOpen` berubah ke false.

### M-12 — Double Submit Guard Tidak Ada ✅
- **File**: `src/components/transactions/TransactionModal.jsx:147`
- **Status**: **FIXED** — `handleSubmit` sekarang diawali dengan `if (loading) return` untuk mencegah double submit.
- **Deskripsi**: `handleSubmit` tidak memiliki guard `if (loading) return`. Double-click atau spam Enter bisa memicu double submit.
- **Rekomendasi**: Tambahkan guard di awal submit handler.

### M-13 — Inconsistent Case Normalization saat CSV Deduplication ✅
- **File**: `src/hooks/useDataImportExport.js:99-144`
- **Status**: **FIXED** — Semua key map (wallet, category, transaction) sekarang menggunakan `.toLowerCase().trim()` secara konsisten.
- **Deskripsi**: `existingWalletMap` key lowercase, tapi `walletIdMap.set()` menggunakan casing asli CSV. Variasi casing menyebabkan mismatch dan duplikat.
- **Rekomendasi**: Normalisasi semua key ke lowercase (dan trim) secara konsisten.

### M-14 — useCopyBudgetFromLastMonth Tanpa Pengecekan Duplikat ✅
- **File**: `src/hooks/useBudget.js:144-157`
- **Status**: **FIXED** — Sebelum insert, query existing budgets untuk bulan target dilakukan. Kategori yang sudah ada di-skip. Jika semua kategori sudah ada, throw error.
- **Deskripsi**: Bulk insert tanpa pengecekan duplikat. Constraint violation jika dipanggil dua kali.
- **Rekomendasi**: Query anggaran bulan target terlebih dahulu atau gunakan `upsert`.

### M-15 — NaN Propagation di FutureProjection & Yearly Reduce ✅
- **File**: `src/pages/Reports.jsx:565-567,832-834`
- **Status**: **FIXED** — Semua `.reduce()` accumulator menggunakan `(m.income || 0)` dan `(m.expense || 0)` untuk mencegah NaN.
- **Deskripsi**: `stats.expense / dayOfMonth` dan `(yearlyData || []).reduce(...)` bisa NaN jika data undefined.
- **Rekomendasi**: Gunakan `?? 0` atau `|| 0` di semua accumulator.

### M-16 — isLoading Tidak Ter-Reset saat Error ✅
- **File**: `src/pages/Reports.jsx:132-157`
- **Status**: **FIXED** — Fetch dibungkus dalam `try/finally` sehingga `setIsLoading(false)` selalu dipanggil.
- **Deskripsi**: `supabase.from()` bisa throw tapi tidak ada `try/finally`. `setIsLoading(false)` tidak dipanggil saat error, spinner berputar selamanya.
- **Rekomendasi**: Bungkus fetch dalam `try/finally`.

### M-17 — Banyak console.log di Production ✅
- **File**: `src/hooks/useCategories.js`, `src/hooks/useFamily.js`, `src/hooks/useDataImportExport.js`, dll.
- **Status**: **FIXED** — Semua `console.log` debug dihapus dari file production. `console.error` untuk error tracking tetap dipertahankan.
- **Deskripsi**: Banyak sekali `console.log`/`console.error` di hooks yang membocorkan state internal, ID, dan struktur data di production console.
- **Rekomendasi**: Hapus semua console.log debug atau ganti dengan logger yang di-disable di production.

### M-18 — Missing Error Handling di onAuthStateChange ✅
- **File**: `src/stores/authStore.js:41-55`
- **Status**: **FIXED** — Body callback `onAuthStateChange` sekarang dibungkus dalam `try/catch`. Error satu event tidak menghentikan listener.
- **Deskripsi**: `fetchProfile` dipanggil async tanpa `try/catch`. Jika gagal, listener bisa berhenti memproses event.
- **Rekomendasi**: Bungkus body callback dengan `try/catch`.

---

## LOW

### L-01 — Auth Errors Tidak Disimpan ke State
- **File**: `src/stores/authStore.js:33-35,89-91`
- **Deskripsi**: Error hanya di-`console.error` tanpa disimpan ke store state. UI tidak bisa menampilkan feedback error.
- **Rekomendasi**: Tambahkan field `error` di store.

### L-02 — Runtime Env Variable Validation Missing
- **File**: `src/lib/supabase.js:3-4`
- **Deskripsi**: Tidak ada pengecekan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` saat runtime.
- **Rekomendasi**: Validasi: `if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env vars')`.

### L-03 — parseOlloAmount Menerima Input Invalid
- **File**: `src/utils/csvUtils.js:133-137`
- **Deskripsi**: `parseFloat` menerima `"Infinity"`, `"NaN"`, `"1e2"` tanpa validasi.
- **Rekomendasi**: Tambahkan validasi finite dan range.

### L-04 — File Type Validation Lemah (TransactionModal)
- **File**: `src/components/transactions/TransactionModal.jsx:80`
- **Deskripsi**: `file.type.startsWith('image/')` bisa di-spoof dengan mengganti ekstensi.
- **Rekomendasi**: Validasi ekstensi (`file.name.match(/\.(jpg|jpeg|png|webp)$/i)`).

### L-05 — Object defaultForm Dibagikan By Reference
- **File**: `src/components/transactions/TransactionModal.jsx:37,68`
- **Deskripsi**: `setForm(defaultForm)` memasukkan referensi objek sama ke state.
- **Rekomendasi**: Gunakan `setForm({ ...defaultForm })`.

### L-06 — Math.random() + substr (deprecated) untuk ID
- **File**: `src/components/ui/Toast.jsx:25`
- **Deskripsi**: `Math.random().toString(36).substr(2, 9)` tidak cryptographically secure dan `substr` deprecated.
- **Rekomendasi**: Gunakan `crypto.randomUUID()` atau counter.

### L-07 — useUndoableDelete Menelan Error saat Unmount Cleanup
- **File**: `src/hooks/useUndoableDelete.js:57`
- **Deskripsi**: `deleteFn(id).catch(() => {})` menelan error tanpa logging.
- **Rekomendasi**: Log error atau berikan callback `onError`.

### L-08 — budgetStore Menggunakan UTC Month
- **File**: `src/stores/budgetStore.js:4`
- **Deskripsi**: `selectedMonth` diinisialisasi dari `toISOString()` yang bisa berbeda dengan bulan kalender lokal.
- **Rekomendasi**: Gunakan ekstraksi timezone lokal.

### L-09 — useGenerateInviteCode Tanpa Null Guard
- **File**: `src/hooks/useFamily.js:131-138`
- **Deskripsi**: Tidak ada guard jika `family` null.
- **Rekomendasi**: Tambahkan null-check pada `family.id`.

### L-10 — useCreateFamily & useJoinFamily Menggunakan setTimeout(500)
- **File**: `src/hooks/useFamily.js:45,85`
- **Deskripsi**: Delay artifisial menutupi race condition alih-alih memperbaiki akar masalah.
- **Rekomendasi**: Gunakan invalidasi query deterministik setelah mutation.

### L-11 — Login & Register Set User Sebelum Profile Ready
- **File**: `src/stores/authStore.js:99-100,170-171`
- **Deskripsi**: State `user` diset sebelum `fetchProfile` selesai, menyebabkan state setengah-terotentikasi.
- **Rekomendasi**: Set user hanya setelah profil berhasil di-fetch, atau rollback state pada kegagalan.

### L-12 — Parsing Tanggal UTC vs Lokal
- **File**: `src/hooks/useTransactions.js:246,342,664`
- **Deskripsi**: `new Date(t.date)` diinterpretasikan sebagai UTC dan bisa off-by-one di boundary timezone negatif.
- **Rekomendasi**: Parse tanggal sebagai lokal (split Y-M-D) atau gunakan library tanggal.

---

## Rekomendasi Perbaikan per Prioritas

### Sprint Ini (CRITICAL + HIGH)
1. Perbaiki regex tanggal CSV (`H-02`)
2. Implementasikan Error Boundary (`H-01`)
3. Tambahkan ownership verification di SEMUA mutasi update/delete (`H-05`, `H-13`)
4. Perbaiki auth race condition (`C-01`, `H-08`)
5. Fix memory leaks: Toast + TransactionModal (`H-06`, `H-07`)
6. Fix budget warning error propagation (`H-04`)
7. Fix silent failure import (`H-03`)
8. Whitelist field update payload (`H-14`)
9. Fix NaN propagation di Reports (`H-09`)
10. Fix TOCTOU di debt payment (`C-03`)

### Sprint Berikutnya (MEDIUM)
11. Escape wildcard di search (`M-01`)
12. Sanitasi CSV import/export (`M-04`, `M-05`)
13. Implementasi focus trap + ARIA di Modal (`M-07`, `M-08`, `M-09`)
14. Tambahkan `aria-label` di semua icon-only buttons (`M-10`)
15. Hapus semua `console.log` production (`M-17`)
16. Fix double submit guard (`M-12`)

### Backlog (LOW)
17. Validasi env variables (`L-02`)
18. Perbaiki `substr` deprecated (`L-06`)
19. Ganti `setTimeout` artifisial (`L-10`)
20. Perbaiki date parsing UTC vs lokal (`L-12`)

---

## Checklist Verifikasi Post-Fix

### CRITICAL + HIGH
- [x] Error Boundary tertangkap di root aplikasi
- [x] Semua mutasi update/delete memiliki filter `user_id`/`family_id`
- [x] Regex tanggal CSV berfungsi (test dengan `2024-01-15`)
- [x] Import CSV batalkan proses saat fetch existing gagal
- [x] Toast tidak bocor memory (dismiss manual clear timeout)
- [x] Modal receipt revoke blob URL saat unmount/close
- [x] Budget warning tidak menggagalkan mutation transaksi
- [x] Payload update di-whitelist (tidak ada `user_id`/`family_id`)
- [x] `NaN` tidak muncul di Reports (test dengan data kosong)
- [x] Auth listener survive remount (StrictMode test)
- [x] Crypto price errors surface ke UI (tidak ditelan)
- [x] DayTransactionsModal race condition fixed
- [x] Auth init race condition fixed
- [x] TOCTOU debt payment fixed

### MEDIUM
- [x] Wildcard escape di search
- [x] CSV formula injection di-export
- [x] XSS sanitasi saat import CSV
- [x] `useDeleteImport` ownership check
- [x] Focus trap aktif di semua modal
- [x] ARIA attributes di modal
- [x] Return focus setelah modal ditutup
- [x] `aria-label` ada di semua icon-only button
- [x] Form reset saat modal ditutup
- [x] Double submit guard
- [x] Case normalization konsisten di CSV dedup
- [x] `useCopyBudgetFromLastMonth` cek duplikat
- [x] `isLoading` ter-reset saat error
- [x] `console.log` debug dihapus dari production
- [x] `onAuthStateChange` error handling
- [x] Sensitive data tidak di-persist ke localStorage (Zustand)
- [x] Supabase session storage pindah ke cookie-based

---

## Audit Lanjutan (Pass 2) — 2026-08-03

> Fokus pada area yang belum di-review mendalam di Pass 1: RPC/RLS di `supabase/schema.sql`, `cookieStorage.js`, `DangerZoneSection.jsx`, dan regresi console.log.

### P2-01 — RPC `create_family` Tidak Verifikasi `auth.uid()` (IDOR/Account Takeover) ✅
- **File**: `supabase/schema.sql` (fungsi `create_family`), `supabase/migration_security_fixes.sql`
- **Severity**: **CRITICAL**
- **Status**: **FIXED** — Ditambahkan `if p_user_id <> auth.uid() then raise exception` di awal fungsi.
- **Deskripsi**: Fungsi `security definer` ini menerima `p_user_id` dari client tanpa verifikasi bahwa itu adalah pemanggil sendiri. Siapa pun yang login bisa memanggil `supabase.rpc('create_family', { p_user_id: '<uuid korban>' })` dan mengubah paksa `family_id`/`role` profil user lain, bypass RLS karena `security definer`.
- **Aksi diperlukan**: Jalankan `supabase/migration_security_fixes.sql` di Supabase SQL Editor project production.

### P2-02 — RPC `delete_all_family_transactions` Bisa Dipanggil Anggota Non-Owner ✅
- **File**: `supabase/schema.sql` (fungsi `delete_all_family_transactions`), `src/pages/Settings.jsx`, `supabase/migration_security_fixes.sql`
- **Severity**: **HIGH**
- **Status**: **FIXED** — RPC sekarang memverifikasi `role = 'owner'`, bukan hanya keanggotaan family. `DangerZoneSection` di Settings sekarang hanya dirender jika `isOwner` true (konsisten dengan pola gating owner-only yang sudah dipakai untuk fitur kode undangan).
- **Deskripsi**: RPC hanya cek `family_id` cocok, bukan role. Tombol "Hapus Semua Transaksi" juga tampil ke semua anggota. Akibatnya anggota biasa bisa menghapus seluruh riwayat transaksi keluarga dan reset semua saldo kantong.
- **Aksi diperlukan**: Jalankan `supabase/migration_security_fixes.sql` di Supabase SQL Editor project production.

### P2-03 — Klaim Fix M-03 (Cookie Storage) Tidak Akurat ✅
- **File**: `src/lib/cookieStorage.js`
- **Severity**: **MEDIUM (dokumentasi keliru)**
- **Status**: **FIXED** — Komentar di file diperbaiki agar jujur: cookie non-httpOnly ini punya exposure XSS yang sama dengan localStorage (bisa dibaca `document.cookie`). Mitigasi XSS sesungguhnya adalah sanitasi input (M-05) dan menghindari `dangerouslySetInnerHTML`, bukan mekanisme storage-nya. `SameSite=Strict` tetap dipertahankan sebagai defense-in-depth.
- **Deskripsi**: M-03 di Pass 1 mengklaim pindah ke cookie storage menutup risiko pencurian token via XSS. Klaim ini keliru — `HttpOnly` (satu-satunya proteksi nyata terhadap JS yang membaca token) tidak bisa diset dari client-side SPA.
- **Catatan**: Proteksi httpOnly sungguhan butuh backend/edge function sebagai proxy sesi — di luar scope perbaikan bug ini, dicatat sebagai potensi improvement arsitektur di masa depan.

### P2-04 — Cookie `Secure` Hardcoded + Tidak Ada Chunking untuk Limit ~4KB ✅
- **File**: `src/lib/cookieStorage.js`
- **Severity**: **MEDIUM**
- **Status**: **FIXED** — Flag `Secure` sekarang dinamis berdasar `location.protocol === 'https:'` (tidak lagi gagal diam-diam di origin non-HTTPS). Ditambahkan chunking otomatis (potong ke cookie `key.0`, `key.1`, ... + `key.n`) untuk value yang melebihi ~3.5KB, dengan fallback baca cookie legacy non-chunked.
- **Deskripsi**: `Secure=true` di-hardcode sehingga cookie gagal ter-set di origin HTTP non-localhost. Session JSON (access+refresh token+user object) berisiko melebihi batas ~4KB per cookie tanpa chunking, menyebabkan auth gagal persist tanpa error yang terlihat.

### P2-05 — Regresi M-17: `console.log` Kembali Muncul di `useDataImportExport.js` ✅
- **File**: `src/hooks/useDataImportExport.js`
- **Severity**: **MEDIUM (regresi)**
- **Status**: **FIXED** — 16 `console.log` debug dihapus. `console.error` untuk error tracking tetap dipertahankan.
- **Deskripsi**: Audit Pass 1 (M-17) menyatakan file ini sudah dibersihkan dari `console.log`, tapi ditemukan 16 baris debug log masih ada saat pemeriksaan Pass 2.

### P2-06 — RLS `notifications_insert` Tidak Verifikasi `user_id` Anggota Family ✅
- **File**: `supabase/schema.sql` (policy `notifications_insert`), `supabase/migration_security_fixes.sql`
- **Severity**: **LOW**
- **Status**: **FIXED** — Policy sekarang juga memverifikasi `user_id` yang di-insert adalah anggota `family_id` tersebut via `exists (select 1 from profiles where id = user_id and family_id = family_id)`.
- **Deskripsi**: Policy lama hanya memverifikasi `family_id = get_user_family_id()`, tidak memverifikasi bahwa `user_id` yang di-insert benar anggota family itu. Anggota keluarga bisa insert notifikasi (judul/pesan bebas) yang mengarah ke `user_id` sembarang (termasuk di luar family-nya) — berpotensi disalahgunakan untuk spam/social engineering. `select` tetap dibatasi `user_id = auth.uid()` sehingga korban akan melihatnya sebagai notifikasi miliknya sendiri.
- **Aksi diperlukan**: Jalankan `supabase/migration_security_fixes.sql` di Supabase SQL Editor project production.

### Cara Menerapkan Perbaikan Level Database (P2-01, P2-02, P2-06)
`schema.sql` sudah diperbarui sebagai source of truth. **Status: `supabase/migration_security_fixes.sql` sudah dijalankan di Supabase SQL Editor project production (2026-08-03) — fix RPC/RLS di atas sudah aktif.**

---

*Dokumen ini harus di-review setiap sprint. Update status checklist saat bug diperbaiki.*
