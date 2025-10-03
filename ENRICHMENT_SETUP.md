# Enrichment Source Priority Management

## Overview
This system allows you to configure the priority order for data enrichment sources (ZoomInfo, Hunter.io, Apollo.io) through an admin interface.

## Setup Instructions

### Step 1: Run Database Migration

You need to create the `enrichment_sources` table in your Supabase database.

**Using Supabase SQL Editor (Recommended)**
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/007_enrichment_sources.sql`
4. Click "Run" to execute the migration

The migration will:
- Create a new `source_priority` enum type
- Create the `enrichment_sources` table
- Add indexes for performance
- Insert default source configurations:
  - ZoomInfo: FIRST
  - Hunter.io: SECOND
  - Apollo.io: THIRD

### Step 2: Verify Installation

After running the migration, verify it worked:

1. Go to Supabase Dashboard → Table Editor
2. Look for the `enrichment_sources` table
3. You should see 3 rows with default priorities
4. Or run this query in SQL Editor:
```sql
SELECT * FROM enrichment_sources ORDER BY priority;
```

### Step 3: Access Admin Interface

1. Navigate to your admin settings page: `/dashboard/admin/settings`
2. Click on the "Enrichment Sources" tab
3. You'll see the three sources with dropdown menus to set priority

## How It Works

### Priority Levels
- **First**: Primary enrichment source (attempted first)
- **Second**: Secondary source (attempted if first doesn't provide all data)
- **Third**: Tertiary source (attempted last)
- **Do not use**: Disables the source entirely

### Enrichment Process
1. When enriching a company, the system queries the `enrichment_sources` table
2. Sources are sorted by priority (FIRST → SECOND → THIRD)
3. Each enabled source is called in order
4. Higher priority sources take precedence for data fields
5. Sources marked "Do not use" are skipped

### Features
- ✅ Only one source can be assigned to each priority level
- ✅ Changing a priority automatically adjusts other sources if needed
- ✅ Real-time updates reflected in enrichment process
- ✅ Disabled sources are excluded from enrichment
- ✅ Comprehensive logging shows which source provided which data

## Usage

### Changing Priority
1. Navigate to `/dashboard/admin/settings`
2. Click the "Enrichment Sources" tab
3. Select a new priority from the dropdown for any source
4. The system automatically saves and adjusts other priorities as needed

### Example Configurations

**Example 1: ZoomInfo Primary**
- ZoomInfo: First
- Hunter.io: Second
- Apollo.io: Third

**Example 2: Disable ZoomInfo**
- ZoomInfo: Do not use
- Hunter.io: First
- Apollo.io: Second

**Example 3: Hunter.io Only**
- Hunter.io: First
- ZoomInfo: Do not use
- Apollo.io: Do not use

## Technical Details

### Database Schema
```sql
CREATE TYPE source_priority AS ENUM ('FIRST', 'SECOND', 'THIRD', 'DO_NOT_USE');

CREATE TABLE enrichment_sources (
  id UUID PRIMARY KEY,
  source_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  priority source_priority NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

**GET `/api/settings/enrichment-sources`**
- Returns all enrichment sources with their current priorities
- Response:
```json
{
  "success": true,
  "sources": [
    {
      "id": "uuid",
      "source_name": "zoominfo",
      "display_name": "ZoomInfo",
      "priority": "FIRST",
      "is_enabled": true
    }
  ]
}
```

**PUT `/api/settings/enrichment-sources`**
- Updates a source's priority
- Body:
```json
{
  "source_name": "zoominfo",
  "priority": "FIRST"
}
```
- Automatically handles priority conflicts by swapping

### Enrichment Function Updates

The enrichment Edge Function (`supabase/functions/enrich-company/index.ts`) now:
1. Loads enabled sources from the database at runtime
2. Sorts by priority (FIRST → SECOND → THIRD)
3. Processes enrichment in priority order
4. Only uses data from higher-priority sources
5. Logs which sources provided which data points

Example log output:
```
Using prioritized enrichment sources: ['zoominfo', 'hunter', 'apollo']
Attempting enrichment with: zoominfo
✓ ZoomInfo provided email and name
✓ ZoomInfo provided phone
✓ ZoomInfo provided employee count
Enrichment complete: 5 data points collected
```

## Data Source Capabilities

### ZoomInfo
Provides comprehensive B2B data:
- Owner name and email
- Phone numbers
- Employee count
- Revenue estimates
- Company details

### Hunter.io
Specializes in email finding:
- Email addresses
- Email verification
- Contact names
- Email patterns

### Apollo.io
B2B contact and company database:
- Employee count
- Revenue data
- Company information
- Contact details

## Troubleshooting

### Sources not appearing in admin panel

**Problem**: The "Enrichment Sources" tab is empty

**Solutions**:
1. Run the migration in Supabase SQL Editor
2. Check browser console for errors (F12)
3. Verify the API endpoint is accessible:
   ```bash
   curl https://your-domain.com/api/settings/enrichment-sources
   ```
4. Check that the table exists:
   ```sql
   SELECT * FROM enrichment_sources;
   ```

### Enrichment not respecting priorities

**Problem**: Enrichment still uses old priority order

**Solutions**:
1. Check Supabase function logs in Dashboard → Edge Functions → Logs
2. Verify sources are marked as enabled:
   ```sql
   SELECT source_name, priority, is_enabled FROM enrichment_sources;
   ```
3. Ensure the enrichment function was updated (check git status)
4. Redeploy the Edge Function if needed

### Migration errors

**Common errors and fixes**:

1. **"type source_priority already exists"**
   - The migration was already run
   - Skip this step or drop and recreate

2. **"function update_updated_at() does not exist"**
   - Run migration 001 first
   - This creates the required trigger function

3. **"permission denied"**
   - Use the service role key
   - Make sure you're an admin in Supabase

### Priority conflicts

**Problem**: Can't set a source to a priority that's already used

**Solution**: The system automatically handles this by:
1. Setting the conflicting source to "Do not use"
2. Then applying your requested priority
3. You can manually reassign priorities as needed

## Best Practices

1. **Test First**: After changing priorities, test enrichment on a single company
2. **Monitor Logs**: Check Edge Function logs to see which sources are being used
3. **API Keys**: Ensure all source API keys are configured in Settings → API Connections
4. **Gradual Changes**: Change one priority at a time to see the impact
5. **Backup**: The old priority order is logged in the audit trail

## Migration File Location

`supabase/migrations/007_enrichment_sources.sql`

Copy this file's contents and run in Supabase SQL Editor to set up the feature.
