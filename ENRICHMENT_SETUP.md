# Enrichment Process Setup & Troubleshooting

## Issue Identified

The enrichment process was failing due to a **database schema mismatch**. The enrichment API was trying to write to columns that don't exist in the current database.

### Root Cause
- The initial database migration (001_initial_schema.sql) created a basic `companies` table
- The enrichment API expects additional columns like `email`, `formatted_address`, `city`, `state`, etc.
- These columns were defined in a separate `companies-table.sql` file but never migrated

## Solution Implemented

### 1. Created Migration File
Created `supabase/migrations/005_update_companies_for_enrichment.sql` that:
- Adds all missing enrichment columns to the companies table
- Handles column renames (address → formatted_address, review_count → user_ratings_total)
- Creates necessary indexes for performance
- Adds update triggers
- Updates existing data appropriately

### 2. Enhanced API Error Handling
Updated `app/api/companies/enrich/route.js` to:
- Gracefully handle missing columns
- Provide helpful error messages pointing to the migration
- Filter data to only include valid columns
- Better error diagnostics

## How to Fix the Enrichment Process

### Step 1: Run the Database Migration
Execute the migration in your Supabase dashboard:

```sql
-- Copy and paste the contents of:
-- supabase/migrations/005_update_companies_for_enrichment.sql
```

Or using Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify the Migration
Check that the columns were added:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY column_name;
```

Expected enrichment columns:
- `email`
- `formatted_address`
- `city`
- `state` 
- `industry`
- `is_enriched`
- `enriched_at`
- `enrichment_source`
- And many more...

### Step 3: Test the Enrichment
Try enriching a company through the UI or API:
```bash
curl -X POST "http://localhost:3000/api/companies/enrich" \
  -H "Content-Type: application/json" \
  -d '{"companyData":{"name":"Test Company","website":"https://example.com"}}'
```

## API Endpoints

### POST /api/companies/enrich
Enriches company data using Google Places API

**Body:**
```json
{
  "companyId": "uuid-here", // Optional: update existing company
  "companyData": {          // Required: company data to enrich
    "name": "Company Name",
    "website": "https://example.com",
    "place_id": "google-place-id"
  }
}
```

### GET /api/companies/enrich
Lists all companies with enrichment status

**Query Parameters:**
- `enriched=true` - Only show enriched companies

## Enrichment Process Flow

1. **Input Validation** - Check for companyId or companyData
2. **Google Places Enhancement** - Fetch detailed info if place_id provided
3. **Email Extraction** - Generate contact email from website domain
4. **Industry Classification** - Map Google Places types to industries
5. **Database Storage** - Save enriched data with metadata
6. **Response** - Return success/error with enriched data

## Error Messages & Solutions

### "Could not find the 'email' column"
**Solution:** Run the database migration (Step 1 above)

### "Database schema outdated"
**Solution:** The API will return this error if columns are missing. Run the migration.

### "Companies table not found"
**Solution:** Run the initial migration first, then the enrichment migration.

## Column Mapping

| Enrichment Field | Database Column | Source |
|------------------|-----------------|---------|
| name | name | Google Places |
| email | email | Generated from domain |
| phone | formatted_phone_number | Google Places |
| address | formatted_address | Google Places |
| website | website | Google Places |
| industry | industry_categories | Derived from types |
| rating | rating | Google Places |
| reviews | user_ratings_total | Google Places |

## Next Steps

After running the migration:
1. Test enrichment on existing companies
2. Verify new companies can be enriched during creation
3. Check that the data enrichment page works properly
4. Ensure report generation includes enriched data

## Environment Variables Required

Make sure these are set in your `.env.local`:
```
GOOGLE_PLACES_API_KEY=your_google_places_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```