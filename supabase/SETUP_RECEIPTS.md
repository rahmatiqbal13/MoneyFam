# Setup Foto Nota (Receipt Upload)

## Step 1: Jalankan SQL Migration

Buka Supabase Dashboard → SQL Editor, jalankan:

```sql
alter table transactions add column if not exists receipt_url text;
```

## Step 2: Buat Storage Bucket (Manual)

1. Buka Supabase Dashboard → Storage
2. Click "New Bucket"
3. **Name**: `receipts`
4. **Public bucket**: Uncheck (biarkan private untuk keamanan)
5. Click "Create bucket"

## Step 3: Tambah Policies (Manual)

Buka bucket "receipts" → Policies → New Policy

### Policy 1: SELECT (View)
- **Name**: `Allow users to view own receipts`
- **Allowed operation**: SELECT
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
auth.uid() = (storage.foldername(name))[1]::uuid
```

### Policy 2: INSERT (Upload)
- **Name**: `Allow users to upload own receipts`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
auth.uid() = (storage.foldername(name))[1]::uuid
```

### Policy 3: DELETE
- **Name**: `Allow users to delete own receipts`
- **Allowed operation**: DELETE
- **Target roles**: `authenticated`
- **USING expression**:
```sql
auth.uid() = (storage.foldername(name))[1]::uuid
```

## Step 4: Deploy Aplikasi

Upload folder `dist/` ke hosting setelah build.

## Cara Kerja

- File nota disimpan di: `receipts/{user_id}/{timestamp}.{ext}`
- Maksimal ukuran file: 5MB
- Format yang diterima: JPG, PNG, dll (image/*)
- Field `receipt_url` di tabel transactions menyimpan URL public file
