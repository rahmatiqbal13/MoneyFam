/**
 * Seed script: buat akun dummy + data contoh di Supabase
 *
 * Kebutuhan:
 *   - VITE_SUPABASE_URL          → di .env
 *   - SUPABASE_SERVICE_ROLE_KEY  → di .env (Settings > API > service_role)
 *
 * Jalankan:
 *   npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Parse .env ───────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '..', '.env')

function parseEnv(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
        .map((l) => {
          const [key, ...rest] = l.split('=')
          return [key.trim(), rest.join('=').trim()]
        })
    )
  } catch {
    return {}
  }
}

const env = parseEnv(envPath)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  console.error('❌ VITE_SUPABASE_URL belum diisi di file .env')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('placeholder')) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Akun dummy ───────────────────────────────────────────────────────────────
const ACCOUNTS = [
  {
    email: 'owner@moneyfam.test',
    password: 'password123',
    fullName: 'Budi Santoso',
    role: 'owner',
  },
  {
    email: 'member@moneyfam.test',
    password: 'password123',
    fullName: 'Siti Rahayu',
    role: 'member',
  },
]
const FAMILY_NAME = 'Keluarga Demo'

// ── Helper ───────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Memulai proses seed...\n')

  // 1. Buat atau ambil family yang sudah ada
  let family
  const { data: existingFamilies } = await supabase
    .from('families')
    .select('*')
    .eq('name', FAMILY_NAME)
    .limit(1)

  if (existingFamilies?.length) {
    family = existingFamilies[0]
    console.log(`♻️  Family sudah ada: "${family.name}" (id: ${family.id})`)
  } else {
    const { data, error } = await supabase
      .from('families')
      .insert({ name: FAMILY_NAME })
      .select()
      .single()
    if (error) throw new Error('Gagal buat family: ' + error.message)
    family = data
    console.log(`✅ Family baru: "${family.name}" (id: ${family.id})`)
  }

  // 2. Buat atau update user + profile
  const { data: allUsers } = await supabase.auth.admin.listUsers()
  const existingByEmail = Object.fromEntries(
    (allUsers?.users || []).map((u) => [u.email, u])
  )

  const createdUsers = []
  for (const acc of ACCOUNTS) {
    let userId

    if (existingByEmail[acc.email]) {
      // User sudah ada → update password saja (tidak hapus/recreate)
      const existing = existingByEmail[acc.email]
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: acc.password,
        email_confirm: true,
      })
      if (error)
        throw new Error(`Gagal update user ${acc.email}: ` + error.message)
      userId = existing.id
      console.log(`♻️  Update user: ${acc.email}`)
    } else {
      // User belum ada → buat baru
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName },
      })
      if (error)
        throw new Error(`Gagal buat user ${acc.email}: ` + error.message)
      userId = created.user.id
      console.log(`✅ User baru: ${acc.email}`)
    }

    // Upsert profile
    const { error: profErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        full_name: acc.fullName,
        email: acc.email,
        family_id: family.id,
        role: acc.role,
      },
      { onConflict: 'id' }
    )
    if (profErr)
      throw new Error(`Gagal upsert profile ${acc.email}: ` + profErr.message)

    createdUsers.push({ ...acc, id: userId })
  }

  const ownerId = createdUsers.find((u) => u.role === 'owner').id
  const memberId = createdUsers.find((u) => u.role === 'member').id

  // 3. Buat wallets (skip jika sudah ada untuk family ini)
  const { data: existingWallets } = await supabase
    .from('wallets')
    .select('name')
    .eq('family_id', family.id)

  const existingWalletNames = new Set((existingWallets || []).map((w) => w.name))

  const walletRows = [
    { family_id: family.id, user_id: ownerId,  name: 'Kas Budi',          type: 'cash',    icon: '💵', color: '#10b981', initial_balance: 500000,   balance: 500000 },
    { family_id: family.id, user_id: ownerId,  name: 'BCA Budi',          type: 'bank',    icon: '🏦', color: '#3b82f6', initial_balance: 8500000,  balance: 8500000 },
    { family_id: family.id, user_id: ownerId,  name: 'GoPay Budi',        type: 'ewallet', icon: '📱', color: '#06b6d4', initial_balance: 250000,   balance: 250000 },
    { family_id: family.id, user_id: memberId, name: 'Kas Siti',          type: 'cash',    icon: '💵', color: '#f59e0b', initial_balance: 300000,   balance: 300000 },
    { family_id: family.id, user_id: memberId, name: 'Mandiri Siti',      type: 'bank',    icon: '🏦', color: '#8b5cf6', initial_balance: 4200000,  balance: 4200000 },
    { family_id: family.id, user_id: null,     name: 'Tabungan Keluarga', type: 'savings', icon: '🏠', color: '#ec4899', initial_balance: 15000000, balance: 15000000 },
  ].filter((w) => !existingWalletNames.has(w.name))

  let wallets = existingWallets || []
  if (walletRows.length) {
    const { data, error } = await supabase
      .from('wallets')
      .insert(walletRows)
      .select()
    if (error) throw new Error('Gagal buat wallets: ' + error.message)
    wallets = [...wallets, ...data]
    console.log(`✅ ${data.length} wallet baru dibuat`)
  } else {
    console.log('♻️  Wallets sudah ada, dilewati')
  }

  // Ambil semua wallet keluarga ini (untuk mapping nama → id)
  const { data: allWallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('family_id', family.id)
  const wByName = Object.fromEntries((allWallets || []).map((w) => [w.name, w]))

  // 4. Ambil categories default
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, type')
    .is('family_id', null)
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c]))

  // 5. Buat transaksi (hanya jika belum ada)
  const { count: txCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', family.id)

  if (!txCount) {
    const txRows = [
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['BCA Budi'].id,     to_wallet_id: null,                          category_id: catByName['Gaji'].id,                type: 'income',   amount: 6500000, date: daysAgo(28), description: 'Gaji bulan ini' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['BCA Budi'].id,     to_wallet_id: null,                          category_id: catByName['Bonus'].id,               type: 'income',   amount: 500000,  date: daysAgo(20), description: 'Bonus project' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['Kas Budi'].id,     to_wallet_id: null,                          category_id: catByName['Makanan & Minuman'].id,   type: 'expense',  amount: 85000,   date: daysAgo(2),  description: 'Makan siang kantor' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['GoPay Budi'].id,   to_wallet_id: null,                          category_id: catByName['Transport'].id,           type: 'expense',  amount: 45000,   date: daysAgo(3),  description: 'Ojek online' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['BCA Budi'].id,     to_wallet_id: null,                          category_id: catByName['Tagihan & Utilitas'].id,  type: 'expense',  amount: 350000,  date: daysAgo(10), description: 'Listrik + internet' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['BCA Budi'].id,     to_wallet_id: null,                          category_id: catByName['Belanja'].id,             type: 'expense',  amount: 280000,  date: daysAgo(7),  description: 'Belanja bulanan Indomaret' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['GoPay Budi'].id,   to_wallet_id: null,                          category_id: catByName['Makanan & Minuman'].id,   type: 'expense',  amount: 60000,   date: daysAgo(1),  description: 'GoFood dinner' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Mandiri Siti'].id, to_wallet_id: null,                          category_id: catByName['Gaji'].id,                type: 'income',   amount: 4800000, date: daysAgo(28), description: 'Gaji bulan ini' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Mandiri Siti'].id, to_wallet_id: null,                          category_id: catByName['Freelance'].id,           type: 'income',   amount: 750000,  date: daysAgo(15), description: 'Desain logo client' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Kas Siti'].id,     to_wallet_id: null,                          category_id: catByName['Makanan & Minuman'].id,   type: 'expense',  amount: 120000,  date: daysAgo(4),  description: 'Belanja sayur dan lauk' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Mandiri Siti'].id, to_wallet_id: null,                          category_id: catByName['Pendidikan'].id,          type: 'expense',  amount: 200000,  date: daysAgo(8),  description: 'Buku pelajaran anak' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Mandiri Siti'].id, to_wallet_id: null,                          category_id: catByName['Kesehatan'].id,           type: 'expense',  amount: 150000,  date: daysAgo(12), description: 'Obat dan vitamin keluarga' },
      { family_id: family.id, user_id: memberId, wallet_id: wByName['Kas Siti'].id,     to_wallet_id: null,                          category_id: catByName['Kecantikan & Perawatan'].id, type: 'expense', amount: 75000, date: daysAgo(5),  description: 'Skincare bulanan' },
      { family_id: family.id, user_id: ownerId,  wallet_id: wByName['BCA Budi'].id,     to_wallet_id: wByName['Tabungan Keluarga'].id, category_id: null,                             type: 'transfer', amount: 1000000, date: daysAgo(25), description: 'Nabung bulanan' },
    ]
    const { data: txs, error: txErr } = await supabase
      .from('transactions')
      .insert(txRows)
      .select()
    if (txErr) throw new Error('Gagal buat transactions: ' + txErr.message)
    console.log(`✅ ${txs.length} transaksi dibuat`)
  } else {
    console.log(`♻️  ${txCount} transaksi sudah ada, dilewati`)
  }

  // 6. Buat budgets bulan ini (skip jika sudah ada)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { count: budgetCount } = await supabase
    .from('budgets')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', family.id)
    .eq('year', year)
    .eq('month', month)

  if (!budgetCount) {
    const budgetRows = [
      { family_id: family.id, category_id: catByName['Makanan & Minuman'].id, amount: 1500000, year, month },
      { family_id: family.id, category_id: catByName['Transport'].id,         amount: 500000,  year, month },
      { family_id: family.id, category_id: catByName['Belanja'].id,           amount: 800000,  year, month },
      { family_id: family.id, category_id: catByName['Tagihan & Utilitas'].id, amount: 600000, year, month },
      { family_id: family.id, category_id: catByName['Kesehatan'].id,         amount: 300000,  year, month },
      { family_id: family.id, category_id: catByName['Pendidikan'].id,        amount: 400000,  year, month },
    ]
    const { data: budgets, error: budErr } = await supabase
      .from('budgets')
      .insert(budgetRows)
      .select()
    if (budErr) throw new Error('Gagal buat budgets: ' + budErr.message)
    console.log(`✅ ${budgets.length} budget dibuat`)
  } else {
    console.log('♻️  Budget sudah ada, dilewati')
  }

  // ── Ringkasan ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50))
  console.log('🎉 Seed selesai! Akun dummy siap dipakai:\n')
  console.log('  👑 Owner  → owner@moneyfam.test  | password123')
  console.log('  👤 Member → member@moneyfam.test | password123')
  console.log('═'.repeat(50))
}

seed().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
