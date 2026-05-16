# Penilaian Aplikasi MoneyFam
> Ditulis oleh Claude Sonnet 4.6 | 2026-05-16  
> Tujuan: dokumentasi evaluasi UI/UX/CX untuk referensi pengembangan selanjutnya.

---

## Informasi Aplikasi

| Item | Detail |
|---|---|
| Nama | MoneyFam (FamFinance) |
| Stack | React 18 + Vite, Tailwind CSS, Zustand, TanStack Query, Supabase, Recharts |
| Target pengguna | Pasangan suami-istri untuk tracking keuangan keluarga bersama |
| Jumlah modul | 10 (Dashboard, Transaksi, Anggaran, Tabungan & Target, Hutang & Cicilan, Kantong, Laporan, Investasi, Dana Pensiun, Pengaturan) |
| Tanggal penilaian | 2026-05-16 |

---

## Ringkasan Nilai

| Dimensi | Nilai | Kategori |
|---|---|---|
| **UI** (User Interface — Visual Design) | **7.5 / 10** | Baik |
| **UX** (User Experience — Interaksi & Flow) | **6.0 / 10** | Cukup |
| **CX** (Customer Experience — Perjalanan Pengguna) | **5.5 / 10** | Perlu Perbaikan |
| **Nilai Rata-rata** | **6.3 / 10** | Cukup |

---

## UI — User Interface (7.5/10)

### Kekuatan UI
- Desain Tailwind bersih dan konsisten di seluruh halaman
- Skeleton loading ada di semua halaman — tidak ada blank state saat data loading
- Warna semantik tepat: hijau=positif/pemasukan, merah=negatif/pengeluaran, amber=peringatan
- Dark sidebar + white content area — kontras visual nyaman dibaca
- Card, badge, progress bar memiliki pola yang seragam
- Empty states informatif di semua halaman

### Masalah UI yang Ditemukan

#### UI-01 — Inkonsistensi Heading Level Antar Halaman
- **Dampak**: Minor (visual hierarchy tidak seragam)
- **Detail**: `Transactions.jsx` pakai `h2 text-base`, `Investments.jsx` dan `PensionCalculator.jsx` pakai `h1 text-xl`. Pengguna merasakan "level" halaman tidak konsisten.
- **Solusi**: Standarkan semua page header ke `h1` dengan ukuran yang sama.

#### UI-02 — Sidebar 10 Item Tanpa Grouping
- **Dampak**: Sedang (navigasi overwhelming di mobile)
- **Detail**: Sidebar memiliki 10 item navigasi berurutan tanpa pemisah visual (Dashboard, Transaksi, Kantong, Anggaran, Laporan, Tabungan & Hutang, Investasi, Dana Pensiun, Kategori, Pengaturan).
- **File**: `src/components/layout/Sidebar.jsx`
- **Solusi**: Kelompokkan menjadi 3 seksi:
  - **Harian**: Dashboard, Transaksi, Kantong
  - **Perencanaan**: Anggaran, Laporan, Tabungan & Hutang, Investasi, Dana Pensiun
  - **Akun**: Kategori, Pengaturan

#### UI-03 — Alokasi Portofolio Investasi Hanya Progress Bar
- **Dampak**: Minor (informasi sulit dibaca sekilas)
- **Detail**: `PortfolioSummary` di `Investments.jsx` menampilkan alokasi per jenis aset sebagai horizontal bar. Sulit melihat perbandingan persentase sekilas.
- **Solusi**: Ganti atau tambahkan `PieChart` / `RadialBarChart` dari Recharts (sudah terinstall).

#### UI-04 — Notification Toggles Terlihat Fungsional tapi Tidak Berfungsi
- **Dampak**: Sedang (menurunkan kepercayaan pengguna)
- **Detail**: Di `Settings.jsx`, 4 toggle notifikasi bisa diklik dan berubah posisi, tapi tidak ada persistensi dan fitur belum diimplementasi. Ada asterisk kecil `*` di bawah yang bilang "belum tersedia" tapi mudah terlewat.
- **Solusi**: Disable semua toggle dengan `disabled` attribute + badge "Segera Hadir" sampai fitur push notification benar-benar siap.

---

## UX — User Experience (6.0/10)

### Kekuatan UX
- Toast notification untuk semua aksi sukses dan error
- Confirm modal sebelum semua aksi destruktif (hapus)
- Fitur "Salin Bulan Lalu" di Budget sangat membantu untuk bulan baru
- Auto-select kategori default di AddFundModal dan PayDebtModal
- Skeleton loading mencegah layout shift
- Validasi inline dengan pesan error per field

### Masalah UX yang Ditemukan

#### UX-01 — Tidak Ada Quick-Add Transaksi dari Mana Saja [PRIORITAS TINGGI]
- **Dampak**: Tinggi (pain point paling sering dirasakan)
- **Detail**: Untuk mencatat transaksi, pengguna harus: klik menu "Transaksi" di sidebar → klik "Tambah". Untuk app keuangan yang dipakai beberapa kali sehari, ini terlalu banyak langkah. Semua app keuangan populer (Money Manager, Wallet, DompetKu) punya FAB `+` yang accessible dari semua halaman.
- **Solusi**: Tambahkan Floating Action Button (FAB) `+` di layout utama yang membuka `TransactionModal` dari halaman mana pun.

#### UX-02 — List Transaksi Tidak Ada Pagination / Infinite Scroll
- **Dampak**: Tinggi (performa degradasi setelah pemakaian berbulan-bulan)
- **Detail**: `useTransactions()` mengambil semua data sekaligus ke client. Setelah 6 bulan pemakaian dengan rata-rata 5 transaksi/hari, list bisa berisi 900+ item yang semua di-render sekaligus.
- **File**: `src/hooks/useTransactions.js`, `src/pages/Transactions.jsx`
- **Solusi**: Tambahkan pagination (50 item per halaman) atau infinite scroll dengan `useInfiniteQuery` dari TanStack Query.

#### UX-03 — Onboarding Tanpa CTA Button
- **Dampak**: Sedang (pengguna baru bingung harus mulai dari mana)
- **Detail**: Warning banner di Dashboard untuk user tanpa profil/keluarga hanya menampilkan teks "di halaman Pengaturan" tanpa link/tombol. Pengguna baru (misalnya istri yang baru bergabung) tidak tahu harus klik apa.
- **File**: `src/pages/Dashboard.jsx` baris 43–54
- **Solusi**: Tambahkan `<Link to="/settings">` atau `<Button>` di dalam warning banner.

#### UX-04 — "Salin Bulan Lalu" Tidak Ada Guard Saat Budget Sudah Ada
- **Dampak**: Sedang (bisa membuat duplikat data budget)
- **Detail**: Tombol "Salin Bulan Lalu" bisa diklik kapan saja, termasuk ketika sudah ada budget di bulan yang dipilih. Hasil: duplikat budget per kategori.
- **File**: `src/pages/Budget.jsx`
- **Solusi**: Cek `budgets?.length > 0` → tampilkan ConfirmModal dengan peringatan "Sudah ada X anggaran bulan ini. Lanjutkan akan menambah anggaran baru."

#### UX-05 — Reports: Switching Period Tab Mereset Navigasi Waktu
- **Dampak**: Sedang (konteks hilang saat eksplorasi data)
- **Detail**: Jika pengguna sedang melihat laporan Maret 2024 (Bulanan) lalu switch ke tab "Tahunan", tampilan langsung loncat ke tahun sekarang. Konteks "Maret 2024" hilang.
- **File**: `src/pages/Reports.jsx`
- **Solusi**: Saat switch period, coba pertahankan tahun dari state sebelumnya.

#### UX-06 — Tidak Ada Undo Setelah Hapus
- **Dampak**: Sedang (kehilangan data tidak bisa dipulihkan)
- **Detail**: Semua aksi hapus (transaksi, budget, tabungan, investasi, dll) sudah pakai confirm modal, tapi setelah confirm data langsung permanen terhapus. Untuk app keuangan, kesalahan hapus transaksi bisa mengganggu laporan bulanan.
- **Solusi**: Implement undo pattern — tampilkan toast "Berhasil dihapus" + tombol "Batalkan" selama 5 detik. Hapus di DB baru dieksekusi setelah 5 detik jika tidak dibatalkan.

#### UX-07 — Accessibility: Icon-only Buttons Tanpa Label yang Cukup
- **Dampak**: Minor (aksesibilitas screen reader)
- **Detail**: Tombol edit/hapus/update-price di `InvestmentCard`, `SavingsGoalCard`, `DebtCard` hanya menggunakan `title` attribute. Screen reader dan keyboard navigation tidak optimal.
- **Solusi**: Tambahkan `aria-label` pada semua icon-only buttons. Contoh: `<button aria-label="Edit investasi BBCA">`.

---

## CX — Customer Experience (5.5/10)

### Kekuatan CX
- Konsep "keluarga" dengan invite code — collaborative finance yang tepat sasaran
- Data isolation per `family_id` via Supabase RLS — aman
- Semua 10 modul PRD terselesaikan
- Fitur Member Breakdown di Laporan — insight unik untuk keluarga

### Masalah CX yang Ditemukan

#### CX-01 — Dashboard Tidak Menampilkan Nilai Investasi [PRIORITAS TINGGI]
- **Dampak**: Tinggi (gambaran keuangan tidak akurat/lengkap)
- **Detail**: KPI card "Total Saldo" di Dashboard hanya menjumlahkan saldo wallet. Jika pengguna punya Rp50jt di portofolio investasi dan Rp5jt di wallet, Dashboard tetap menampilkan Rp5jt. Ini mengurangi motivasi mencatat investasi karena tidak terlihat di ringkasan utama.
- **File**: `src/pages/Dashboard.jsx`
- **Solusi**: Tambahkan KPI card "Nilai Investasi" atau gabungkan ke "Total Kekayaan Bersih" (wallet + investasi).

#### CX-02 — Modul-Modul Berdiri Sendiri, Tidak Saling Terhubung
- **Dampak**: Tinggi (kehilangan nilai produk karena fragmentasi data)
- **Detail**:
  1. Pension Calculator tidak membaca data dari Investasi dan Savings Goal nyata — field `existing_fund` harus diisi manual padahal datanya sudah ada di DB.
  2. Halaman Investasi tidak muncul di Laporan — portfolio performance tidak bisa dilihat di konteks keuangan keseluruhan.
  3. Savings Goal yang tercapai tidak tercermin di KPI Dashboard.
- **Solusi Jangka Menengah**: Di PensionCalculator, tambahkan tombol "Ambil dari data saya" yang menjumlahkan `investments.current_value + savings_goals.current_amount` sebagai prefill `existing_fund`.

#### CX-03 — Tidak Ada Onboarding Flow untuk Pengguna Baru
- **Dampak**: Tinggi (drop-off pengguna baru tinggi)
- **Detail**: Pengguna baru yang baru daftar melihat Dashboard kosong dengan warning banner. Tidak ada wizard atau step-by-step yang menuntun: 1) Buat profil → 2) Buat keluarga → 3) Tambah kantong → 4) Catat transaksi pertama.
- **Solusi**: Buat halaman/modal onboarding 4-langkah yang tampil otomatis jika `!profile || !family`.

#### CX-04 — Tidak Ada Notifikasi Real (Push/In-App)
- **Dampak**: Sedang (kehilangan fitur inti app keuangan keluarga)
- **Detail**: Untuk pasangan yang berbagi keuangan, notifikasi adalah fitur kritis: peringatan budget habis, jatuh tempo hutang, transaksi besar dari pasangan. Saat ini semua ini harus dicek manual.
- **Solusi Jangka Pendek**: In-app notification center (badge di sidebar) untuk event-event penting, tanpa perlu push notification.

#### CX-05 — Pension Calculator Tidak Terintegrasi dengan Data Nyata
- **Dampak**: Sedang (nilai kalkulator tidak mencerminkan kondisi riil)
- **Detail**: Pengguna harus ingat dan ketik ulang berapa tabungan dan investasinya saat ini, padahal data tersebut sudah ada di app. Ini mengurangi akurasi perencanaan pensiun.
- **Solusi**: Auto-populate `existing_fund` dari total `investments + savings_goals` dengan tombol "Sinkronkan dari data saya".

#### CX-06 — Versi "v0.1.0" Ditampilkan di Settings Footer
- **Dampak**: Minor (persepsi produk)
- **Detail**: Teks "MoneyFam v0.1.0 · Family Finance Tracker" di bawah halaman Settings bisa menimbulkan kesan produk belum matang.
- **Solusi**: Hapus versi number atau ganti dengan tagline yang lebih inspiratif.

---

## Prioritas Perbaikan

### 🔴 Kritis — Harus Dikerjakan Segera

| ID | Masalah | File | Kesulitan |
|---|---|---|---|
| UX-01 | FAB quick-add transaksi dari semua halaman | Layout + App.jsx | Medium |
| CX-01 | Dashboard tampilkan nilai investasi | Dashboard.jsx | Kecil |
| UX-02 | Pagination / infinite scroll transaksi | Transactions.jsx + hook | Medium |
| UX-03 | CTA button di warning banner Dashboard | Dashboard.jsx | Sangat Kecil |
| **Bug** | Settings profileForm tidak sync saat profile load lambat | Settings.jsx | Sangat Kecil |

### 🟡 Penting — Kerjakan di Sprint Berikutnya

| ID | Masalah | File | Kesulitan |
|---|---|---|---|
| UI-04 | Disable notification toggles yang belum berfungsi | Settings.jsx | Sangat Kecil |
| UX-04 | Guard "Salin Bulan Lalu" saat budget sudah ada | Budget.jsx | Kecil |
| UX-06 | Undo pattern setelah hapus | Multiple | Medium |
| CX-02 | Prefill PensionCalculator dari data investasi + tabungan nyata | PensionCalculator.jsx | Medium |
| UI-03 | Pie/donut chart alokasi portofolio | Investments.jsx | Kecil |

### 🟢 Nice-to-Have — Backlog

| ID | Masalah | Kesulitan |
|---|---|---|
| UI-02 | Sidebar dengan grouping navigasi | Kecil |
| UX-05 | Reports pertahankan konteks waktu saat ganti tab | Kecil |
| CX-03 | Wizard onboarding pengguna baru | Besar |
| CX-04 | In-app notification center | Besar |
| UX-07 | aria-label pada semua icon-only buttons | Kecil |

---

## Checklist untuk AI Reviewer

Saat mereview atau mengembangkan MoneyFam, perhatikan:

- [ ] Setiap halaman baru — apakah total kekayaan (wallet + investasi) sudah tercermin di Dashboard?
- [ ] Setiap form di dalam modal — apakah reset dilakukan via `useEffect(fn, [isOpen])`, bukan `useState`?
- [ ] Setiap aksi hapus — apakah sudah ada confirm modal? Apakah ada undo?
- [ ] Setiap list data — apakah ada batasan pagination? Jangan render semua record sekaligus.
- [ ] Setiap fitur baru yang belum siap di Settings — jangan tampilkan UI yang misleading; disable atau sembunyikan.
- [ ] Setiap modul baru — apakah datanya perlu ditampilkan di Dashboard sebagai KPI?
- [ ] Setiap icon-only button — tambahkan `aria-label` yang deskriptif.
- [ ] Setiap `const now = new Date()` yang dipakai di dalam `useMemo`/`useCallback` — masukkan ke dependency array atau pindahkan ke dalam callback.
