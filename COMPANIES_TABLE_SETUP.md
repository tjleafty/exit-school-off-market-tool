# Companies Table Setup Instructions

The "Add to List" and "Data Enrichment" features require a `companies` table in your Supabase database.

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/ibhjrxejiyvaiflfsufb
   - Navigate to SQL Editor

2. **Run the Migration Script**
   - Copy the entire contents of `supabase/companies-table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify the Table**
   - Go to Table Editor in Supabase
   - You should see a new `companies` table
   - The table will have columns for:
     - Company details (name, address, phone, website)
     - Location data (city, state, geometry)
     - Business metrics (rating, reviews, industry)
     - Enrichment tracking (is_enriched, enriched_at)

## Table Features

- **Unique Constraint**: `place_id` ensures no duplicate companies
- **Row Level Security**: Authenticated users can read/write
- **Automatic Timestamps**: `created_at` and `updated_at` auto-managed
- **Indexes**: Optimized for searching by name, location, and enrichment status

## Troubleshooting

If you see errors like "relation companies does not exist":
1. Make sure you've run the SQL script in Supabase
2. Check that the table appears in Table Editor
3. Verify your Supabase connection credentials in `.env.local`

## What This Enables

Once the table is created, you can:
- ✅ Save companies from search results
- ✅ View saved companies in Data Enrichment tab
- ✅ Enrich companies with additional data
- ✅ Export company lists to CSV
- ✅ Track enrichment status