-- ============================================================
-- CLEANUP SCRIPT: Remove Duplicate Categories
-- Script untuk membersihkan kategori duplikat
-- ============================================================

-- STEP 1: Lihat semua duplikat sebelum dihapus
SELECT 
  name, 
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM categories
WHERE family_id IS NULL AND is_default = true
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC, name;

-- STEP 2: Buat temporary table untuk menyimpan ID yang akan dihapus
CREATE TEMP TABLE IF NOT EXISTS categories_to_delete AS
SELECT c1.id
FROM categories c1
INNER JOIN categories c2 ON LOWER(c1.name) = LOWER(c2.name)
  AND c1.family_id IS NULL
  AND c2.family_id IS NULL
  AND c1.is_default = true
  AND c2.is_default = true
  AND c1.id != c2.id
WHERE c1.created_at > c2.created_at
   OR (c1.created_at = c2.created_at AND c1.id > c2.id);

-- STEP 3: Lihat yang akan dihapus
SELECT c.id, c.name, c.created_at
FROM categories c
INNER JOIN categories_to_delete d ON c.id = d.id
ORDER BY c.name, c.created_at;

-- STEP 4: Hapus duplikat (jika hasil SELECT di atas sudah benar, uncomment baris di bawah)
-- DELETE FROM categories
-- WHERE id IN (SELECT id FROM categories_to_delete);

-- STEP 5: Verifikasi hasil
SELECT 
  name, 
  COUNT(*) as count,
  MIN(created_at) as first_created
FROM categories
WHERE family_id IS NULL AND is_default = true
GROUP BY name
ORDER BY name;

-- STEP 6: Hapus temporary table
-- DROP TABLE IF EXISTS categories_to_delete;

-- ============================================================
-- ALTERNATIVE: Script lengkap yang bisa langsung dijalankan
-- Uncomment semua baris di bawah dan jalankan sekaligus
-- ============================================================

/*
-- Hapus semua kategori duplikat (simpan yang paling awal)
WITH ranked_categories AS (
  SELECT 
    id,
    name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(name) 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM categories
  WHERE family_id IS NULL AND is_default = true
)
DELETE FROM categories
WHERE id IN (
  SELECT id FROM ranked_categories WHERE rn > 1
);

-- Verifikasi tidak ada duplikat lagi
SELECT name, COUNT(*) as count
FROM categories
WHERE family_id IS NULL AND is_default = true
GROUP BY name
HAVING COUNT(*) > 1;
*/
