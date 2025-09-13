# Automated Schema Cache Refresh 🔄

This system automatically refreshes PostgREST schema cache to prevent production issues after database migrations.

## How It Works

### 1. Database-Level Automation
- **Event Trigger**: Automatically refreshes schema cache after DDL changes (CREATE/ALTER/DROP TABLE)
- **Manual Function**: `manual_schema_refresh()` can be called via API
- **Migration**: `006_auto_schema_refresh.sql` sets up all automation

### 2. API-Level Automation  
- **Auto-Recovery**: Enrichment API automatically attempts schema refresh on column errors
- **Graceful Handling**: Returns 202 status when auto-refresh succeeds, asking user to retry
- **Admin Endpoint**: `/api/admin/refresh-schema` for manual triggering

### 3. Error Recovery Flow
```
1. Enrichment API encounters "column not found" error
2. System automatically calls schema refresh API
3. If successful: Returns 202 "Please retry enrichment"
4. If failed: Returns 500 with manual instructions
5. User retries enrichment → Works with refreshed schema
```

## Setup Instructions

### Step 1: Run the Migration
```sql
-- In Supabase SQL Editor, run:
-- This file: supabase/migrations/006_auto_schema_refresh.sql
```

### Step 2: Environment Variables
Add to your Vercel environment variables:
```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

### Step 3: Verify Setup
```bash
# Test the schema refresh endpoint
curl -X POST https://your-app.vercel.app/api/admin/refresh-schema

# Expected response:
{
  "success": true,
  "message": "PostgREST schema cache refreshed successfully"
}
```

## Usage

### Automatic (Recommended)
- Schema refreshes automatically after any DDL changes
- Enrichment API auto-recovers from schema cache issues
- No manual intervention needed

### Manual API Call
```javascript
// Refresh schema programmatically
const response = await fetch('/api/admin/refresh-schema', {
  method: 'POST'
})
```

### Manual SQL (Fallback)
```sql
-- In Supabase SQL Editor if needed
SELECT public.manual_schema_refresh();
```

## Benefits

1. **Zero Downtime**: Schema cache issues resolve automatically
2. **Production Ready**: No manual intervention required in production
3. **Self-Healing**: System recovers from schema cache mismatches
4. **Developer Friendly**: Clear error messages guide users through recovery

## Monitoring

Check Supabase logs for:
- `PostgREST schema cache refreshed at [timestamp]` - Success messages
- Event trigger activations on DDL commands
- API calls to refresh endpoint

## Troubleshooting

If issues persist after automatic refresh:
1. Check Supabase Database logs
2. Verify migration 006 ran successfully  
3. Ensure environment variables are set correctly
4. Test `/api/admin/refresh-schema` endpoint manually

## Migration History

- **005**: Added enrichment columns to companies table
- **006**: Added automated schema refresh system (this migration)