# QA TEST PLAN - Categories CRUD Operations

## Test Environment
- **User Type:** Solo User (no family)
- **Database:** Supabase
- **Table:** categories
- **RLS Policies:** Updated for solo user support

---

## PRE-TEST SETUP

### 1. Database Migration Check
Pastikan kolom `user_id` sudah ada di tabel categories:
```sql
-- Cek struktur tabel
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categories';

-- Pastikan ada kolom user_id
-- Jika belum ada, jalankan:
ALTER TABLE categories ADD COLUMN user_id uuid references auth.users(id) on delete cascade;
```

### 2. RLS Policies Check
Pastikan policies sudah diupdate:
```sql
-- Cek policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'categories';
```

---

## TEST CASES

### ✅ TEST 1: Create Category (CREATE)

**Test Case ID:** CAT-001  
**Feature:** Create new category as solo user  
**Precondition:** User logged in, no family

#### Test Steps:
1. Navigate to Categories page
2. Click "Tambah" button
3. Fill in category form:
   - Name: "Test Kategori Baru"
   - Type: "expense"
   - Icon: 🍔
   - Color: #10b981
4. Click "Tambah" button

#### Expected Result:
- ✅ Category created successfully
- ✅ Toast success message: "Kategori berhasil ditambahkan"
- ✅ Category appears in list
- ✅ Database record has:
  - `user_id` = current user id
  - `family_id` = null
  - `is_default` = false
  - `name` = "Test Kategori Baru"

#### Verify in Database:
```sql
SELECT * FROM categories 
WHERE name = 'Test Kategori Baru' 
AND user_id = 'YOUR_USER_ID';
```

---

### ✅ TEST 2: Read Categories (READ)

**Test Case ID:** CAT-002  
**Feature:** View categories as solo user  

#### Test Steps:
1. Navigate to Categories page
2. Wait for page to load

#### Expected Result:
- ✅ All categories displayed
- ✅ Default categories visible (family_id = null)
- ✅ User's custom categories visible (user_id = current user)
- ✅ No error in console
- ✅ Categories sorted by name

#### Verify Query Works:
```sql
-- Check what categories should be visible
SELECT id, name, family_id, user_id, is_default
FROM categories
WHERE family_id IS NULL 
   OR user_id = 'YOUR_USER_ID'
ORDER BY is_default DESC, name;
```

---

### ✅ TEST 3: Edit Category (UPDATE)

**Test Case ID:** CAT-003  
**Feature:** Edit custom category  
**Precondition:** Have at least one custom category created

#### Test Steps:
1. Navigate to Categories page
2. Find custom category (not default)
3. Click edit button (pencil icon)
4. Change name to "Kategori Updated"
5. Change icon to 🚗
6. Click "Simpan" button

#### Expected Result:
- ✅ Category updated successfully
- ✅ Toast success message: "Kategori berhasil diperbarui"
- ✅ Changes reflected in list
- ✅ Database record updated

#### Verify in Database:
```sql
SELECT * FROM categories 
WHERE user_id = 'YOUR_USER_ID'
AND name = 'Kategori Updated';
```

---

### ✅ TEST 4: Delete Category (DELETE)

**Test Case ID:** CAT-004  
**Feature:** Delete custom category  
**Precondition:** Have at least one custom category created

#### Test Steps:
1. Navigate to Categories page
2. Find custom category
3. Click delete button (trash icon)
4. Confirm deletion in modal
5. Click "Hapus" button

#### Expected Result:
- ✅ Category deleted successfully
- ✅ Toast success message: "Kategori berhasil dihapus"
- ✅ Category removed from list
- ✅ Database record deleted

#### Verify in Database:
```sql
-- Should return 0 rows
SELECT * FROM categories 
WHERE name = 'DELETED_CATEGORY_NAME'
AND user_id = 'YOUR_USER_ID';
```

---

### ❌ TEST 5: Delete Default Category (Negative Test)

**Test Case ID:** CAT-005  
**Feature:** Attempt to delete default category  

#### Test Steps:
1. Navigate to Categories page
2. Find a default category (has "Default" label)
3. Click delete button
4. Confirm deletion

#### Expected Result:
- ❌ Deletion should fail
- ✅ Error message shown: "Kategori default tidak dapat dihapus..."
- ✅ Category still exists in list

---

### ✅ TEST 6: Create Category with Same Name (Edge Case)

**Test Case ID:** CAT-006  
**Feature:** Create category with duplicate name  

#### Test Steps:
1. Create category with name "Duplikat Test"
2. Try to create another category with same name

#### Expected Result:
- Should allow or reject based on application logic
- Check RLS policies allow it

---

### ✅ TEST 7: Create Category - Validation

**Test Case ID:** CAT-007  
**Feature:** Form validation  

#### Test Steps:
1. Navigate to Categories page
2. Click "Tambah"
3. Leave name empty
4. Click "Tambah"

#### Expected Result:
- ❌ Form submission prevented
- ✅ Error message: "Nama kategori wajib diisi"
- ✅ Field highlighted in red

---

### ✅ TEST 8: Switch Between Income/Expense Tabs

**Test Case ID:** CAT-008  
**Feature:** Filter categories by type  

#### Test Steps:
1. Create one income category
2. Create one expense category
3. Click "Pemasukan" tab
4. Click "Pengeluaran" tab

#### Expected Result:
- ✅ Only income categories shown in Pemasukan tab
- ✅ Only expense categories shown in Pengeluaran tab
- ✅ Toggle works smoothly

---

## ERROR SCENARIOS

### ❌ TEST 9: Create Category Without Login

**Test Case ID:** CAT-009  

#### Steps:
1. Logout
2. Try to access Categories page directly

#### Expected:
- ✅ Redirect to login page
- ❌ Cannot create category (401 error)

---

### ❌ TEST 10: Network Error During Create

**Test Case ID:** CAT-010  

#### Steps:
1. Disconnect network
2. Try to create category

#### Expected:
- ✅ Error toast shown
- ❌ Category not created
- ✅ Form data preserved (optional)

---

## REGRESSION TESTS

### ✅ TEST 11: Family User Categories Still Work

**Test Case ID:** CAT-011  
**User Type:** Family member  

#### Steps:
1. Login as family member
2. Access Categories page
3. Create category
4. Edit category
5. Delete category

#### Expected:
- ✅ All operations work as before
- ✅ Categories shared with family members
- ✅ family_id populated correctly

---

## PERFORMANCE TESTS

### ✅ TEST 12: Load Time

**Test Case ID:** CAT-012  

#### Steps:
1. Navigate to Categories page
2. Measure load time

#### Expected:
- ✅ Categories load within 2 seconds
- ✅ No loading spinner for too long

---

### ✅ TEST 13: Multiple Categories

**Test Case ID:** CAT-013  

#### Steps:
1. Create 20+ categories
2. Verify page performance

#### Expected:
- ✅ Page still responsive
- ✅ No lag when switching tabs
- ✅ Scroll works smoothly

---

## CHECKLIST SUMMARY

### Solo User Categories Test
- [ ] CAT-001: Create category works
- [ ] CAT-002: Read categories works
- [ ] CAT-003: Edit category works
- [ ] CAT-004: Delete category works
- [ ] CAT-005: Cannot delete default category
- [ ] CAT-006: Duplicate name handling
- [ ] CAT-007: Form validation works
- [ ] CAT-008: Tab switching works
- [ ] CAT-009: Auth required
- [ ] CAT-010: Error handling works
- [ ] CAT-011: Family user still works
- [ ] CAT-012: Performance acceptable
- [ ] CAT-013: Many categories handled

**Status:** Ready for testing

---

## DEBUGGING CHECKLIST

If tests fail:

1. **Check RLS Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'categories';
```

2. **Check Table Structure:**
```sql
\d categories
```

3. **Check User Permissions:**
```sql
SELECT auth.uid();
```

4. **Test Insert Directly:**
```sql
-- As authenticated user
INSERT INTO categories (user_id, name, type, icon, color, is_default)
VALUES (auth.uid(), 'Test Direct', 'expense', '📦', '#10b981', false);
```

5. **Check Error Logs:**
- Browser console
- Supabase logs

---

## FIXES APPLIED

### 1. Added user_id column to categories table
```sql
ALTER TABLE categories ADD COLUMN user_id uuid references auth.users(id) on delete cascade;
```

### 2. Updated RLS Policies
```sql
-- Insert: Allow family user OR solo user
create policy "categories_insert" on categories
  for insert with check (
    family_id = get_user_family_id() 
    or user_id = auth.uid()
  );

-- Select: Allow defaults, family categories, or solo user categories
create policy "categories_select" on categories
  for select using (
    family_id is null 
    or family_id = get_user_family_id()
    or user_id = auth.uid()
  );
```

### 3. Updated useCategories hook
- Uses user_id for solo users
- Uses family_id for family users
- Proper error handling

---

**Test Date:** 2026-05-16  
**Tester:** Manual QA  
**Status:** Ready
