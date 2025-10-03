# Enrichment History & Activity Tracking

## Overview

The Enrichment History system provides comprehensive tracking and auditing of all enrichment activities. Every enrichment operation is logged with user attribution, timing, quality metrics, and detailed results.

## Features

✅ **Complete Activity Log**: Every enrichment tracked with full details
✅ **User Attribution**: Know exactly who performed each enrichment
✅ **Quality Metrics**: Track completeness, confidence, and performance
✅ **Filtering & Search**: Find specific enrichments by multiple criteria
✅ **Statistics Dashboard**: Summary metrics and trends
✅ **CSV Export**: Download enrichment data for analysis
✅ **Audit Trail**: Full snapshot of enriched data stored

## Database Schema

### enrichment_history Table

```sql
CREATE TABLE enrichment_history (
  id UUID PRIMARY KEY,

  -- Relationships
  company_id UUID,
  user_id UUID,

  -- Company snapshot
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_industry TEXT,
  company_location TEXT,

  -- Enrichment details
  enrichment_tier TEXT NOT NULL,      -- 'BASIC' or 'ENHANCED'
  enrichment_type TEXT NOT NULL,      -- 'MANUAL', 'BULK', 'AUTO', 'BI_REPORT'

  -- Sources and fields
  sources_used TEXT[],                -- ['zoominfo', 'hunter', 'apollo']
  fields_enriched TEXT[],             -- Field names populated
  fields_requested INTEGER,           -- Total fields for tier
  fields_populated INTEGER,           -- Actually populated

  -- Quality metrics
  enrichment_confidence DECIMAL(3,2), -- 0.00 to 1.00
  data_completeness DECIMAL(3,2),     -- 0.00 to 1.00

  -- Status
  status TEXT DEFAULT 'COMPLETED',    -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
  error_message TEXT,

  -- Snapshot
  enrichment_snapshot JSONB,          -- Full enriched data

  -- Performance
  duration_ms INTEGER,                -- Enrichment duration

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Views

**enrichment_stats_by_user**
- Total enrichments per user
- Success/failure rates
- Average quality metrics
- Date range of activity

**enrichment_stats_by_date**
- Daily enrichment counts
- Unique users and companies
- Average performance metrics
- Tier distribution

**recent_enrichment_activity**
- Last 100 enrichment activities
- Includes user information
- Quick overview for monitoring

## Setup Instructions

### Step 1: Run Database Migration

Execute in Supabase SQL Editor:

```bash
supabase/migrations/009_enrichment_history.sql
```

This creates:
- `enrichment_history` table
- Helper views for statistics
- `log_enrichment_activity()` function
- `get_enrichment_summary()` function

### Step 2: Access History Dashboard

Navigate to:
```
/dashboard/admin/enrichment-history
```

Only admins have access to this page.

## Admin Dashboard

### Summary Statistics

Top section shows key metrics for the selected period (default 30 days):

- **Total Enrichments**: All enrichment operations
- **Success Rate**: Percentage completed successfully
- **Active Users**: Unique users who performed enrichments
- **Avg Completeness**: Average field population rate

### Filters

- **Tier**: Filter by BASIC or ENHANCED
- **Status**: COMPLETED, FAILED, PARTIAL
- **Date Range**: From/To date filters
- **Company Search**: Search by company name
- **User**: Filter by specific user (when implemented)

### History Table

Displays enrichment records with:
- Date and time
- Company name and website
- User who performed enrichment
- Tier and type
- Sources used
- Fields populated vs requested
- Status
- Duration

### Pagination

- 50 records per page
- Page navigation
- Total record count

### Export

**CSV Export** button downloads filtered results with all fields.

## API Endpoints

### Get Enrichment History

**GET `/api/admin/enrichment-history`**

Query Parameters:
```javascript
{
  page: 1,              // Page number
  limit: 50,            // Records per page
  tier: 'BASIC',        // Filter by tier
  status: 'COMPLETED',  // Filter by status
  userId: 'uuid',       // Filter by user
  dateFrom: '2025-01-01', // Start date
  dateTo: '2025-01-31',   // End date
  companyName: 'Acme'   // Search company name
}
```

Response:
```javascript
{
  success: true,
  history: [
    {
      id: "uuid",
      company_name: "Example Corp",
      company_website: "https://example.com",
      enrichment_tier: "ENHANCED",
      enrichment_type: "MANUAL",
      sources_used: ["zoominfo", "hunter"],
      fields_requested: 40,
      fields_populated: 35,
      data_completeness: 0.875,
      enrichment_confidence: 0.82,
      status: "COMPLETED",
      duration_ms: 2500,
      created_at: "2025-01-15T10:30:00Z",
      users: {
        email: "user@example.com",
        name: "John Doe"
      }
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 150,
    totalPages: 3
  }
}
```

### Get Statistics

**GET `/api/admin/enrichment-stats`**

Query Parameters:
```javascript
{
  days: 30,           // Statistics period (default 30)
  groupBy: 'summary'  // 'summary', 'user', or 'date'
}
```

**Summary Stats** (default):
```javascript
{
  success: true,
  type: 'summary',
  stats: {
    total_enrichments: 250,
    basic_enrichments: 150,
    enhanced_enrichments: 100,
    successful_enrichments: 235,
    failed_enrichments: 15,
    unique_companies: 220,
    unique_users: 5,
    avg_completeness: 0.85,
    avg_confidence: 0.78,
    avg_duration_ms: 2100,
    total_fields_populated: 8500
  },
  period_days: 30
}
```

**Stats by User**:
```javascript
{
  success: true,
  type: 'by_user',
  stats: [
    {
      user_id: "uuid",
      email: "user@example.com",
      name: "John Doe",
      total_enrichments: 50,
      basic_enrichments: 30,
      enhanced_enrichments: 20,
      successful_enrichments: 48,
      failed_enrichments: 2,
      avg_data_completeness: 0.87,
      avg_confidence: 0.81,
      avg_duration_ms: 2000,
      last_enrichment_date: "2025-01-15T10:30:00Z",
      first_enrichment_date: "2024-12-01T09:00:00Z"
    }
  ]
}
```

**Stats by Date**:
```javascript
{
  success: true,
  type: 'by_date',
  stats: [
    {
      enrichment_date: "2025-01-15",
      total_enrichments: 25,
      unique_users: 3,
      unique_companies: 22,
      basic_count: 15,
      enhanced_count: 10,
      successful_count: 24,
      failed_count: 1,
      avg_completeness: 0.86,
      avg_confidence: 0.79,
      avg_duration_ms: 2200
    }
  ]
}
```

### Log Enrichment Activity

**POST `/api/admin/enrichment-history`**

Automatically called by enrichment process. Can also be called manually:

```javascript
{
  companyId: "uuid",
  userId: "uuid",
  companyName: "Example Corp",
  companyWebsite: "https://example.com",
  companyIndustry: "Technology",
  companyLocation: "San Francisco, CA",
  enrichmentTier: "ENHANCED",
  enrichmentType: "MANUAL",
  sourcesUsed: ["zoominfo", "hunter"],
  fieldsEnriched: ["owner_email", "company_name", "revenue"],
  fieldsRequested: 40,
  fieldsPopulated: 35,
  enrichmentConfidence: 0.82,
  dataCompleteness: 0.875,
  status: "COMPLETED",
  enrichmentSnapshot: { /* full data */ },
  durationMs: 2500
}
```

## Automatic Logging

The enrichment process automatically logs every operation:

### What Gets Logged

1. **Company Information**
   - ID, name, website, industry, location
   - Captured at time of enrichment

2. **User Attribution**
   - User ID who initiated enrichment
   - Timestamp of activity

3. **Configuration**
   - Tier (BASIC/ENHANCED)
   - Type (MANUAL, BULK, AUTO, BI_REPORT)
   - Sources used in priority order

4. **Results**
   - Fields requested vs populated
   - Data completeness percentage
   - Confidence scores
   - Full data snapshot (JSONB)

5. **Performance**
   - Duration in milliseconds
   - Status (COMPLETED, FAILED, PARTIAL)
   - Error messages if applicable

### Enrichment Types

- **MANUAL**: User clicked "Enrich" button
- **BULK**: Part of bulk enrichment operation
- **AUTO**: Automatic enrichment (scheduled)
- **BI_REPORT**: Triggered by BI report generation

## Use Cases

### 1. User Activity Monitoring

See what each user has been enriching:

```sql
SELECT * FROM enrichment_stats_by_user
WHERE email = 'user@example.com';
```

### 2. Quality Assurance

Find enrichments with low completeness:

```sql
SELECT company_name, data_completeness, fields_populated, fields_requested
FROM enrichment_history
WHERE data_completeness < 0.5
ORDER BY created_at DESC;
```

### 3. Performance Analysis

Find slow enrichments:

```sql
SELECT company_name, duration_ms, sources_used
FROM enrichment_history
WHERE duration_ms > 5000
ORDER BY duration_ms DESC;
```

### 4. Source Effectiveness

Which sources are being used most:

```sql
SELECT
  unnest(sources_used) as source,
  COUNT(*) as usage_count,
  AVG(data_completeness) as avg_completeness
FROM enrichment_history
WHERE status = 'COMPLETED'
GROUP BY source
ORDER BY usage_count DESC;
```

### 5. Daily Trends

```sql
SELECT * FROM enrichment_stats_by_date
WHERE enrichment_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY enrichment_date DESC;
```

## Data Retention

### Current Implementation

All enrichment history is retained indefinitely.

### Future Options

Consider implementing retention policies:

```sql
-- Example: Delete history older than 1 year
DELETE FROM enrichment_history
WHERE created_at < NOW() - INTERVAL '1 year';

-- Or archive to separate table
INSERT INTO enrichment_history_archive
SELECT * FROM enrichment_history
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM enrichment_history
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Privacy Considerations

### What's Stored

- User IDs (not passwords)
- Company names and basic info
- Enriched data snapshots
- Timestamps and metadata

### Access Control

- Only admins can view history
- Row-level security via Supabase RLS
- Service role key required for API access

### GDPR Compliance

If user requests data deletion:

```sql
-- Anonymize user's enrichment history
UPDATE enrichment_history
SET user_id = NULL
WHERE user_id = 'uuid-to-delete';

-- Or delete entirely
DELETE FROM enrichment_history
WHERE user_id = 'uuid-to-delete';
```

## Troubleshooting

### No History Showing

**Problem**: History table is empty

**Solutions**:
1. Run migration 009
2. Verify `log_enrichment_activity` function exists
3. Check that enrichment is using `/enrich-advanced` endpoint
4. Look for errors in server logs

### Logging Failing Silently

**Problem**: Enrichment works but history not logged

**Solutions**:
1. Check `SUPABASE_SERVICE_ROLE_KEY` is set
2. Verify function URL is correct
3. Check for RLS policies blocking inserts
4. Review server logs for errors

### Stats Not Calculating

**Problem**: Stats endpoints return zeros

**Solutions**:
1. Verify views were created successfully
2. Check date filters aren't too restrictive
3. Ensure enrichment_history has records
4. Try refreshing materialized views if using them

## Performance Optimization

### Indexes

Already created for common queries:
- `company_id`, `user_id`
- `created_at` (DESC for recent first)
- `status`, `tier`, `type`
- `company_name` for search
- GIN index on `enrichment_snapshot` JSONB

### Query Optimization

Use views for aggregations:
```javascript
// Good - uses pre-aggregated view
fetch('/api/admin/enrichment-stats?groupBy=user')

// Avoid - aggregates on every request
// (unless you need custom grouping)
```

### Archiving

For large datasets, consider:
- Partitioning by date
- Archiving old records
- Summarizing instead of detail storage

## Future Enhancements

Potential additions:

1. **User Leaderboards**: Who enriches the most
2. **Quality Scores**: User-specific quality metrics
3. **Alerts**: Notify on failed enrichments
4. **Scheduled Reports**: Weekly summary emails
5. **Advanced Analytics**: Charts and graphs
6. **Export Templates**: Custom CSV/Excel formats
7. **Audit Compliance**: Tamper-proof logging
8. **Cost Tracking**: Associate API costs per enrichment

## Example Queries

### Top Performing Users (Last 30 Days)

```sql
SELECT
  u.name,
  u.email,
  COUNT(*) as total,
  AVG(eh.data_completeness) as avg_quality,
  AVG(eh.duration_ms) as avg_speed
FROM enrichment_history eh
JOIN users u ON eh.user_id = u.id
WHERE eh.created_at >= NOW() - INTERVAL '30 days'
  AND eh.status = 'COMPLETED'
GROUP BY u.id, u.name, u.email
ORDER BY avg_quality DESC, total DESC
LIMIT 10;
```

### Failed Enrichments Requiring Attention

```sql
SELECT
  company_name,
  enrichment_tier,
  error_message,
  created_at,
  users.email as user_email
FROM enrichment_history
LEFT JOIN users ON enrichment_history.user_id = users.id
WHERE status = 'FAILED'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Source Performance Comparison

```sql
SELECT
  unnest(sources_used) as source,
  COUNT(*) as times_used,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successes,
  AVG(data_completeness) as avg_completeness,
  AVG(duration_ms) as avg_duration
FROM enrichment_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY times_used DESC;
```

## Compliance & Auditing

### Audit Trail Benefits

- **Accountability**: Know who enriched what and when
- **Troubleshooting**: Debug enrichment issues
- **Billing**: Track usage for cost allocation
- **Compliance**: Meet regulatory requirements
- **Quality**: Monitor and improve data quality

### Tamper Protection

The database function ensures:
- Timestamps are automatic
- Status transitions are tracked
- Original data is preserved in snapshot
- Modifications require service role key

### Export for Compliance

```javascript
// Export all enrichments for a user (GDPR request)
const userId = 'uuid'
const response = await fetch(
  `/api/admin/enrichment-history?userId=${userId}&limit=1000`
)
const data = await response.json()
// Download as JSON or CSV for user
```
