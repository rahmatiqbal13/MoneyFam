// MoneyFam mock data — Keluarga Pratama
// All amounts in IDR (Rupiah). No JSX in here, but .jsx so Babel processes it.

const FAMILY = {
  name: "Keluarga Pratama",
  members: [
    { id: "budi",  name: "Budi",  role: "Ayah",  age: 38, color: "#0EA5A4", emoji: "👨🏻", initials: "BD" },
    { id: "sari",  name: "Sari",  role: "Ibu",   age: 36, color: "#F472B6", emoji: "👩🏻", initials: "SR" },
    { id: "aldi",  name: "Aldi",  role: "Anak",  age: 14, color: "#F59E0B", emoji: "🧑🏻", initials: "AL" },
    { id: "rara",  name: "Rara",  role: "Anak",  age: 10, color: "#8B5CF6", emoji: "👧🏻", initials: "RR" },
  ],
};

const WALLETS = [
  { id: "bca",       name: "BCA Bersama",      type: "Bank",      icon: "🏦", color: "#0EA5A4", balance: 18_450_000, scope: "shared",  members: ["budi","sari"], number: "•• 4421" },
  { id: "tunai",     name: "Tunai",            type: "Cash",      icon: "💵", color: "#22C55E", balance: 1_350_000,  scope: "shared",  members: ["budi","sari"] },
  { id: "ewallet",   name: "GoPay Sari",       type: "E-wallet",  icon: "📱", color: "#F472B6", balance: 875_000,    scope: "personal",members: ["sari"] },
  { id: "tab-aldi",  name: "Tabungan Aldi",    type: "Bank",      icon: "🎒", color: "#F59E0B", balance: 2_120_000,  scope: "personal",members: ["aldi"], number: "•• 8810" },
  { id: "celengan",  name: "Celengan Rara",    type: "Cash",      icon: "🐷", color: "#8B5CF6", balance: 248_000,    scope: "personal",members: ["rara"] },
  { id: "investasi", name: "Reksa Dana",       type: "Investasi", icon: "📈", color: "#10B981", balance: 12_800_000, scope: "shared",  members: ["budi","sari"] },
];

const CATEGORIES = [
  { id: "belanja",   name: "Belanja",     emoji: "🛒", color: "#F59E0B", kind: "expense" },
  { id: "makan",     name: "Makan",       emoji: "🍱", color: "#F472B6", kind: "expense" },
  { id: "transport", name: "Transportasi",emoji: "🚗", color: "#0EA5A4", kind: "expense" },
  { id: "tagihan",   name: "Tagihan",     emoji: "💡", color: "#8B5CF6", kind: "expense" },
  { id: "pendidikan",name: "Pendidikan",  emoji: "📚", color: "#3B82F6", kind: "expense" },
  { id: "kesehatan", name: "Kesehatan",   emoji: "💊", color: "#EF4444", kind: "expense" },
  { id: "hiburan",   name: "Hiburan",     emoji: "🎮", color: "#10B981", kind: "expense" },
  { id: "uangsaku",  name: "Uang Saku",   emoji: "🎒", color: "#F97316", kind: "expense" },
  { id: "gaji",      name: "Gaji",        emoji: "💼", color: "#10B981", kind: "income"  },
  { id: "freelance", name: "Freelance",   emoji: "💻", color: "#0EA5A4", kind: "income"  },
  { id: "bonus",     name: "Bonus",       emoji: "🎁", color: "#F472B6", kind: "income"  },
  { id: "transfer",  name: "Transfer",    emoji: "🔄", color: "#94A3B8", kind: "transfer"},
];

// Helpers to build dates relative to "today"
const today = new Date(2026, 4, 21); // 21 May 2026
const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() + offset); return x.toISOString(); };

const TRANSACTIONS = [
  // Today
  { id:"t1",  date:d(0),  amount:-68_000,    category:"makan",     wallet:"ewallet",  member:"sari",  note:"Makan siang keluarga di Solaria" },
  { id:"t2",  date:d(0),  amount:-15_000,    category:"transport", wallet:"tunai",    member:"budi",  note:"Parkir mall" },
  { id:"t3",  date:d(0),  amount:-25_000,    category:"uangsaku",  wallet:"tunai",    member:"aldi",  note:"Jajan sekolah" },
  // Yesterday
  { id:"t4",  date:d(-1), amount:-450_000,   category:"belanja",   wallet:"bca",      member:"sari",  note:"Belanja mingguan Superindo" },
  { id:"t5",  date:d(-1), amount:-180_000,   category:"tagihan",   wallet:"bca",      member:"budi",  note:"Pulsa & paket data" },
  { id:"t6",  date:d(-1), amount:-10_000,    category:"uangsaku",  wallet:"celengan", member:"rara",  note:"Beli stiker" },
  // 2-3 days ago
  { id:"t7",  date:d(-2), amount:-92_000,    category:"makan",     wallet:"ewallet",  member:"sari",  note:"GoFood makan malam" },
  { id:"t8",  date:d(-2), amount:-320_000,   category:"hiburan",   wallet:"bca",      member:"budi",  note:"Tiket bioskop & popcorn" },
  { id:"t9",  date:d(-3), amount:-55_000,    category:"transport", wallet:"ewallet",  member:"sari",  note:"Gojek antar Rara les" },
  { id:"t10", date:d(-3), amount:-150_000,   category:"pendidikan",wallet:"bca",      member:"budi",  note:"Bayar les piano Aldi" },
  // Income this month
  { id:"t11", date:d(-5), amount: 12_500_000,category:"gaji",      wallet:"bca",      member:"budi",  note:"Gaji Mei" },
  { id:"t12", date:d(-5), amount: 8_200_000, category:"gaji",      wallet:"bca",      member:"sari",  note:"Gaji Mei" },
  { id:"t13", date:d(-8), amount: 2_400_000, category:"freelance", wallet:"bca",      member:"sari",  note:"Proyek desain logo" },
  // Older
  { id:"t14", date:d(-10),amount:-1_200_000, category:"tagihan",   wallet:"bca",      member:"budi",  note:"Listrik & air bulan ini" },
  { id:"t15", date:d(-12),amount:-680_000,   category:"kesehatan", wallet:"bca",      member:"sari",  note:"Cek gigi Rara di Mediska" },
  { id:"t16", date:d(-14),amount:-2_100_000, category:"belanja",   wallet:"bca",      member:"sari",  note:"Belanja besar bulanan" },
  { id:"t17", date:d(-16),amount:-450_000,   category:"hiburan",   wallet:"bca",      member:"budi",  note:"Langganan Netflix + Spotify" },
  { id:"t18", date:d(-18),amount:-200_000,   category:"uangsaku",  wallet:"bca",      member:"budi",  note:"Uang jajan mingguan Aldi" },
  { id:"t19", date:d(-18),amount:-100_000,   category:"uangsaku",  wallet:"bca",      member:"budi",  note:"Uang jajan mingguan Rara" },
  { id:"t20", date:d(-20),amount:-380_000,   category:"transport", wallet:"bca",      member:"budi",  note:"Bensin & tol mingguan" },
];

const BUDGETS = [
  { id:"b1", category:"belanja",   limit: 4_000_000, spent: 2_550_000, member:"shared"  },
  { id:"b2", category:"makan",     limit: 2_500_000, spent: 1_820_000, member:"shared"  },
  { id:"b3", category:"transport", limit: 1_200_000, spent:   895_000, member:"shared"  },
  { id:"b4", category:"tagihan",   limit: 2_000_000, spent: 1_380_000, member:"shared"  },
  { id:"b5", category:"hiburan",   limit:   800_000, spent:   770_000, member:"shared"  },
  { id:"b6", category:"uangsaku",  limit: 1_200_000, spent:   335_000, member:"shared"  },
  { id:"b7", category:"pendidikan",limit: 1_500_000, spent:   150_000, member:"shared"  },
  { id:"b8", category:"kesehatan", limit:   600_000, spent:   680_000, member:"shared"  },
];

const GOALS = [
  { id:"g1", name:"Liburan Bali",       emoji:"🏝️", target: 25_000_000, saved: 14_800_000, deadline:"2026-12-20", members:["budi","sari","aldi","rara"], color:"#0EA5A4" },
  { id:"g2", name:"Sepeda Aldi",        emoji:"🚲", target:  4_500_000, saved:  2_120_000, deadline:"2026-08-15", members:["aldi"],                       color:"#F59E0B" },
  { id:"g3", name:"Renovasi Dapur",     emoji:"🍳", target: 35_000_000, saved:  8_200_000, deadline:"2027-03-01", members:["budi","sari"],                color:"#F472B6" },
  { id:"g4", name:"Mainan Rara",        emoji:"🧸", target:    500_000, saved:    248_000, deadline:"2026-07-01", members:["rara"],                       color:"#8B5CF6" },
];

const DEBTS = [
  { id:"d1", name:"KPR Rumah",     creditor:"Bank Mandiri",   total: 850_000_000, paid: 320_000_000, monthly: 6_400_000, due: 14, color:"#0EA5A4" },
  { id:"d2", name:"Cicilan Motor", creditor:"Adira Finance",  total:  28_000_000, paid:  18_200_000, monthly: 1_250_000, due:  5, color:"#F472B6" },
  { id:"d3", name:"KTA Renovasi",  creditor:"Bank BCA",       total:  45_000_000, paid:  12_500_000, monthly: 2_100_000, due: 22, color:"#F59E0B" },
];

const INVESTMENTS = [
  { id:"i1", name:"Reksa Dana Pendapatan Tetap", broker:"Bibit",      type:"Reksa Dana", units: 12500, avg: 1024, last: 1098, value: 13_725_000, change: 0.072,  color:"#0EA5A4" },
  { id:"i2", name:"BBCA",                        broker:"Stockbit",   type:"Saham",      units: 200,   avg: 9450, last:10250, value:  2_050_000, change: 0.085,  color:"#F472B6" },
  { id:"i3", name:"TLKM",                        broker:"Stockbit",   type:"Saham",      units: 500,   avg: 3640, last: 3420, value:  1_710_000, change:-0.060,  color:"#F59E0B" },
  { id:"i4", name:"Logam Mulia 10gr",            broker:"Pegadaian",  type:"Emas",       units: 10,    avg:1_120_000,last:1_245_000,value:12_450_000,change:0.111, color:"#8B5CF6" },
  { id:"i5", name:"Reksa Dana Saham Indonesia",  broker:"Bibit",      type:"Reksa Dana", units: 4200,  avg: 2310, last: 2480, value: 10_416_000, change: 0.073,  color:"#10B981" },
];

const NOTIFICATIONS = [
  { id:"n1", kind:"budget",  unread:true,  date:d(0),  title:"Hiburan hampir habis",       body:"Anggaran Hiburan terpakai 96%. Sisa Rp 30.000 untuk 10 hari lagi.", icon:"⚠️", color:"#F59E0B" },
  { id:"n2", kind:"member",  unread:true,  date:d(0),  title:"Sari menambah transaksi",    body:"Belanja Rp 450.000 di Superindo masuk ke BCA Bersama.",         icon:"🛒", color:"#F472B6" },
  { id:"n3", kind:"goal",    unread:true,  date:d(-1), title:"Liburan Bali 59% tercapai",  body:"Target tercapai dalam 7 bulan kalau setor Rp 1.450.000/bulan.",  icon:"🏝️", color:"#0EA5A4" },
  { id:"n4", kind:"debt",    unread:false, date:d(-2), title:"KPR jatuh tempo 14 Mei",     body:"Cicilan Rp 6.400.000 — siapkan saldo di BCA Bersama.",          icon:"📅", color:"#8B5CF6" },
  { id:"n5", kind:"member",  unread:false, date:d(-3), title:"Aldi setor ke Sepeda",       body:"Rp 50.000 dari uang saku masuk ke tabungan Sepeda Aldi.",       icon:"🚲", color:"#F59E0B" },
  { id:"n6", kind:"system",  unread:false, date:d(-5), title:"Gaji Mei diterima",          body:"Rp 20.700.000 masuk ke BCA Bersama dari Budi & Sari.",          icon:"💼", color:"#10B981" },
  { id:"n7", kind:"goal",    unread:false, date:d(-7), title:"Rara hampir capai mainan",   body:"Tinggal Rp 252.000 lagi untuk target Mainan Rara.",             icon:"🧸", color:"#8B5CF6" },
];

const PENSION = {
  currentAge: 38,
  retireAge: 58,
  monthlyExpense: 12_000_000,
  inflation: 0.045,
  returnRate: 0.085,
  currentSavings: 240_000_000,
  monthlyContribution: 3_500_000,
};

// Expose
window.MF = { FAMILY, WALLETS, CATEGORIES, TRANSACTIONS, BUDGETS, GOALS, DEBTS, INVESTMENTS, NOTIFICATIONS, PENSION };
