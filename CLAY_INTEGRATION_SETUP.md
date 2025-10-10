# Clay Integration Setup Guide

## Overview

Clay has been successfully integrated into your enrichment workflow as an **asynchronous webhook-based data source**. Unlike Hunter, Apollo, and ZoomInfo which provide instant responses, Clay works differently:

1. Your system sends company data **TO** Clay's webhook
2. Clay enriches the data using their 150+ providers (asynchronous process)
3. Clay sends enriched data **BACK** to your system via callback webhook

## Architecture

```
Your System → Clay Webhook (POST company data)
              ↓
         Clay processes enrichment (async)
              ↓
Clay Webhook → Your System (/api/webhooks/clay)
              ↓
         Data stored in database
```

## Setup Instructions

### 1. Database Migration

Run the migration to add Clay to your enrichment sources:

```bash
# This migration adds:
# - Clay as an enrichment source
# - webhook_url and callback_secret columns to api_keys table
```

File: `supabase/migrations/013_add_clay_enrichment_source.sql`

### 2. Clay Configuration in Clay Platform

**In your Clay account:**

1. Create a new table for company enrichment
2. Click "+ Create New" → "Import data from Webhook"
3. Copy the generated webhook URL
4. Set up your enrichment columns in Clay (whichever data you want to enrich)
5. Add an HTTP API column to send data back to your system:
   - Method: POST
   - Endpoint: `https://your-domain.com/api/webhooks/clay`
   - Body: Include all enriched fields + `company_id` field

### 3. System Configuration

**In your admin settings** (`/dashboard/admin/settings`):

1. Go to "API Connections" tab
2. Find "Clay API" section
3. Enter:
   - **Clay API Key** (optional, for authentication)
   - **Clay Webhook URL** (required - from step 2)
   - **Callback Secret** (optional, for verifying callbacks)
4. Click "Save"

### 4. Enable Clay in Enrichment Priority

**In Enrichment Sources tab:**

1. Find "Clay" in the list
2. Set priority (FIRST, SECOND, THIRD, or DO_NOT_USE)
3. Enable the source

## How It Works

### Sending Data to Clay

When enrichment runs, the system:

```typescript
// Prepares company data
const payload = {
  company_id: company.id,
  company_name: company.name,
  website: company.website,
  domain: extractedDomain,
  address: company.formatted_address,
  phone: company.phone,
  place_id: company.place_id
}

// Sends to Clay webhook
POST https://clay.com/webhooks/your-webhook-id
```

### Receiving Data from Clay

Your system receives callbacks at:

```
POST /api/webhooks/clay
```

**Expected payload format:**
```json
{
  "company_id": "uuid-of-company",
  "field1": "enriched value 1",
  "field2": "enriched value 2",
  ...any other fields Clay enriched...
}
```

The webhook endpoint will:
1. Validate the `company_id` exists
2. Store enriched data in `enrichment_data.clay_data`
3. Create an audit log entry
4. Return success confirmation

## Excel Export

Clay data appears in a dedicated "Clay Data" tab in Excel exports.

**Features:**
- Dynamic columns based on whatever data Clay returns
- Shows enrichment status
- Includes helpful notes about async processing
- If no data yet, shows setup instructions

## Files Modified

1. **Database Migration:**
   - `supabase/migrations/013_add_clay_enrichment_source.sql`

2. **Admin Settings UI:**
   - `app/dashboard/admin/settings/page.js`

3. **API Routes:**
   - `app/api/settings/api-keys/route.js` (updated to handle webhook fields)
   - `app/api/webhooks/clay/route.js` (NEW - receives Clay callbacks)

4. **Enrichment Function:**
   - `supabase/functions/enrich-company/index.ts` (added `fetchFromClay()`)

5. **Excel Export:**
   - `app/api/companies/export/excel/route.js` (added `generateClaySheetData()`)

## Testing the Integration

### 1. Test Sending to Clay

1. Enrich a company through your system
2. Check logs for: `"📤 Sending company data to Clay webhook"`
3. Verify in Clay dashboard that the record appeared in your table
4. Confirm enrichment is processing in Clay

### 2. Test Receiving from Clay

You can manually test the webhook receiver:

```bash
curl -X POST https://your-domain.com/api/webhooks/clay \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "your-test-company-id",
    "enriched_email": "owner@company.com",
    "enriched_phone": "+1234567890",
    "linkedin_url": "https://linkedin.com/company/example"
  }'
```

### 3. Verify Data Storage

```sql
SELECT
  id,
  name,
  enrichment_data->'clay_data' as clay_data
FROM companies
WHERE enrichment_data->'clay_data' IS NOT NULL;
```

### 4. Test Excel Export

1. Export companies that have been enriched
2. Check the "Clay Data" tab
3. Verify enriched fields appear correctly

## Important Notes

### Asynchronous Nature

- Clay enrichment is **not instant**
- Companies will show `clay_status: "pending"` initially
- Actual enriched data arrives via webhook callback
- Timing depends on Clay's processing (minutes to hours)

### Webhook URL Configuration

**Your callback webhook URL must be:**
- Publicly accessible (Clay needs to reach it)
- HTTPS (required for security)
- Configured in your Clay HTTP API column

**Production URL example:**
```
https://your-production-domain.com/api/webhooks/clay
```

**Development/Testing:**
- Use ngrok or similar for local testing
- Update Clay HTTP API endpoint when switching environments

### Data Structure

Clay data is stored in:
```json
{
  "enrichment_data": {
    "clay_data": {
      // All fields Clay returns
    },
    "enriched_at": "2025-10-08T12:34:56Z"
  }
}
```

### Rate Limits

Clay webhook has rate limits:
- 10 records per second per workspace
- Maximum burst capacity: 20 records
- Payload size limit: 100KB

## Troubleshooting

### Data not appearing in Clay?

- Check webhook URL is correct
- Verify Clay API key if using authentication
- Check Clay table webhook is active
- Review logs for `Clay webhook error`

### Clay not sending data back?

- Verify HTTP API column is configured in Clay
- Check callback URL is publicly accessible
- Ensure `company_id` is included in Clay's response
- Review `/api/webhooks/clay` endpoint logs

### Excel export shows "No Clay data"?

- Normal if enrichment is still pending
- Check database for `enrichment_data.clay_data`
- Verify Clay callback webhook has been triggered

## Next Steps

1. ✅ Complete database migration
2. ✅ Configure Clay webhook URL in admin settings
3. ✅ Set up Clay table with HTTP API callback
4. ✅ Enable Clay in enrichment priority
5. 🔄 Test with a sample company
6. 🔄 Monitor webhook logs
7. 🔄 Verify data in Excel export

## Support

For Clay-specific setup questions, refer to:
- https://docs.clay.com/en/articles/9672489-http-api-with-clay
- https://docs.clay.com/en/articles/9730014-import-data-to-clay-using-webhooks
