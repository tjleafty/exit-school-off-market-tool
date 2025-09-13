# Enrichment Database Issues & Solutions 🔧

## Current Issues

### 1. PostgREST Schema Cache Issue
**Error:** `Could not find the 'email' column of 'companies' in the schema cache`

**Cause:** PostgREST hasn't refreshed its schema cache after the migration.

**Solution:** Refresh the schema cache in Supabase:
```sql
-- Run this in Supabase SQL Editor to refresh schema cache
NOTIFY pgrst, 'reload schema';
```

### 2. User ID Constraint Violation  
**Error:** `new row for relation "companies" violates check constraint "companies_user_id_check"`

**Cause:** The migration added a `user_id` column but there might be a constraint expecting it to be non-null.

**Solution:** Update the constraint or make user_id nullable:
```sql
-- Check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'companies'::regclass 
AND conname LIKE '%user_id%';

-- If constraint is too restrictive, drop and recreate
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_check;
```

## Quick Fix Steps

### Step 1: Refresh PostgREST Schema
In your Supabase Dashboard → SQL Editor, run:
```sql
NOTIFY pgrst, 'reload schema';
SELECT 1; -- Just to confirm query ran
```

### Step 2: Fix User ID Constraint  
```sql
-- Remove restrictive constraint if it exists
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_check;

-- Add a more flexible constraint (allow nulls)
ALTER TABLE companies ADD CONSTRAINT companies_user_id_check 
CHECK (user_id IS NULL OR user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

### Step 3: Verify Schema
```sql
-- Verify columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('email', 'enriched_at', 'owner_name', 'employee_count', 'revenue')
ORDER BY column_name;
```

## Alternative: Complete Schema Reset

If issues persist, run this complete schema update:

```sql
-- Ensure all enrichment columns exist
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='email') THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='enriched_at') THEN
        ALTER TABLE companies ADD COLUMN enriched_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='owner_name') THEN
        ALTER TABLE companies ADD COLUMN owner_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='employee_count') THEN
        ALTER TABLE companies ADD COLUMN employee_count INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='revenue') THEN
        ALTER TABLE companies ADD COLUMN revenue DECIMAL(15,2);
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

## Testing After Fix

Try enriching a company again. You should see:
- ✅ No schema cache errors
- ✅ Successful enrichment with Hunter.io data
- ✅ Owner names and employee data in View Details modal

## Prevention

To prevent future schema cache issues:
1. Always run `NOTIFY pgrst, 'reload schema';` after schema changes
2. Wait 30-60 seconds after migrations before testing APIs
3. Check Supabase logs for any PostgREST restart messages