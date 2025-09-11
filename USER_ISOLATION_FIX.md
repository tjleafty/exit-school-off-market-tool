# Fix User Isolation Security Issue

## Critical Issue Identified
Users can currently see other users' companies and reports due to missing user isolation in the database schema.

## Root Cause
The current `companies` table was created without proper user linking through the `searches` table, bypassing the Row Level Security (RLS) policies.

## Solution
Execute the migration script to recreate the companies table with proper user isolation.

## Steps to Fix

### 1. Run Database Migration
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase/fix-user-isolation.sql`
4. Execute the script

### 2. Verify the Fix
After running the migration:
1. Test that new users only see their own companies
2. Verify that reports are properly isolated
3. Check that the "Add to List" functionality works with user context

## What the Migration Does

1. **Drops the current companies table** that lacks user isolation
2. **Recreates the companies table** with proper `search_id` linking
3. **Implements proper RLS policies** that filter by user through searches
4. **Maintains all existing functionality** while adding security

## Code Changes Made

✅ **Backend APIs Updated:**
- `companies/save` - Now requires userId and creates/links to user searches
- `companies/list` - Now filters companies by user through searches table
- `companies/generate-report` - Already had user isolation

✅ **Frontend Updated:**
- Company Discovery page now passes user context when saving companies
- Data Enrichment page now loads user-specific companies
- Report generation includes proper user ID

## Expected Behavior After Fix

- **✅ User A** saves companies → Only User A can see them
- **✅ User B** saves companies → Only User B can see them  
- **✅ Reports** are isolated by user_id
- **✅ Cross-contamination** eliminated

## Verification Commands

After migration, you can verify the fix with these SQL queries in Supabase:

```sql
-- Check if companies are properly linked to searches
SELECT c.name, s.user_id, s.name as search_name 
FROM companies c 
JOIN searches s ON c.search_id = s.id;

-- Verify RLS is working (should only show current user's data)
SELECT * FROM companies;
```

## Important Notes

- **All existing company data will be lost** during migration (this is necessary to fix the schema)
- **User accounts and authentication remain unchanged**
- **The fix maintains all current functionality** while adding proper security
- **Future company saves will automatically be user-isolated**

## Status
🔧 **Code changes complete** - Ready for database migration
⏳ **Waiting for user** to execute the SQL migration script