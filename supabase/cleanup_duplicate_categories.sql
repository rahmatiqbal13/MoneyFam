-- ============================================================
-- CLEANUP SCRIPT: Remove Duplicate Categories
-- Jalankan ini di SQL Editor Supabase jika ada kategori duplikat
-- ============================================================

-- 1. Cek kategori duplikat untuk default categories (family_id = null)
SELECT name, COUNT(*) as count
FROM categories
WHERE family_id IS NULL AND is_default = true
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Hapus kategori duplikat untuk default categories
-- Simpan hanya yang created_at paling awal
DELETE FROM categories
WHERE id IN (
  SELECT c1.id
  FROM categories c1
  INNER JOIN categories c2 ON LOWER(c1.name) = LOWER(c2.name)
    AND c1.family_id IS NULL
    AND c2.family_id IS NULL
    AND c1.is_default = true
    AND c2.is_default = true
  WHERE c1.created_at > c2.created_at
    AND c1.id != c2.id
);

-- 3. Cek kategori duplikat per family
SELECT family_id, name, COUNT(*) as count
FROM categories
WHERE family_id IS NOT NULL
GROUP BY family_id, name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. Hapus kategori duplikat per family (satu per satu family)
-- Ganti FAMILY_ID dengan UUID keluarga yang bermasalah
-- DELETE FROM categories
-- WHERE id IN (
--   SELECT c1.id
--   FROM categories c1
--   INNER JOIN categories c2 ON LOWER(c1.name) = LOWER(c2.name)
--     AND c1.family_id = c2.family_id
--   WHERE c1.family_id = 'FAMILY_ID'  -- Ganti dengan UUID keluarga
--     AND c1.created_at > c2.created_at
--     AND c1.id != c2.id
-- );

-- 5. Alternative: Hapus semua kategori duplikat untuk semua family
DELETE FROM categories
WHERE id IN (
  SELECT c1.id
  FROM categories c1
  INNER JOIN categories c2 ON LOWER(c1.name) = LOWER(c2.name)
    AND c1.family_id = c2.family_id
  WHERE c1.created_at > c2.created_at
    AND c1.id != c2.id
);

-- 6. Verifikasi hasil
SELECT 
  CASE 
    WHEN family_id IS NULL THEN 'Default'
    ELSE 'Family: ' || family_id::text
  END as category_type,
  COUNT(*) as total_categories
FROM categories
GROUP BY family_id
ORDER BY category_type;
