# Setting Up Enrichment Fields

## Quick Setup Guide

The enrichment fields configuration requires running the database migrations in order. Here's the step-by-step process:

## Step 1: Run Migrations in Order

Go to your Supabase Dashboard → SQL Editor and run these migrations **in this exact order**:

### Migration 1: Enrichment Source Priorities
```sql
-- Copy and paste contents of:
supabase/migrations/007_enrichment_sources.sql
```
This creates:
- `source_priority` enum
- `enrichment_sources` table
- Default source configurations (ZoomInfo, Hunter.io, Apollo.io)

### Migration 2: Enrichment Fields System
```sql
-- Copy and paste contents of:
supabase/migrations/008_enrichment_fields_system.sql
```
This creates:
- `enrichment_tier` enum
- `enrichment_fields` table with **65 fields**
- Updates to `companies` table
- Pre-populates all ZoomInfo fields with default tiers

**⚠️ IMPORTANT**: This migration includes INSERT statements that add all 65 fields to the database.

### Migration 3: Enrichment History
```sql
-- Copy and paste contents of:
supabase/migrations/009_enrichment_history.sql
```

### Migration 4: Fix Views (if needed)
```sql
-- Copy and paste contents of:
supabase/migrations/009_enrichment_history_fixed.sql
```

## Step 2: Verify Fields Were Created

After running migration 008, verify in Supabase:

```sql
-- Check that fields were created
SELECT COUNT(*) FROM enrichment_fields;
-- Should return: 65

-- View all fields by category
SELECT field_category, COUNT(*) as count
FROM enrichment_fields
GROUP BY field_category
ORDER BY field_category;
```

Expected results:
- contact: 12 fields
- company: 14 fields
- financial: 12 fields
- firmographics: 7 fields
- location: 6 fields
- social: 3 fields
- (company/industry): 8 fields

## Step 3: Access the UI

Navigate to:
```
/dashboard/admin/enrichment-config
```

You should now see:
- Summary cards showing field counts
- Filter dropdowns for category and tier
- Table with all 65 fields
- Dropdown selectors to assign tiers

## Troubleshooting

### No Fields Showing in UI

**Problem**: The enrichment config page shows "No fields configured"

**Cause**: Migration 008 wasn't run or INSERT statements failed

**Solution**:
1. Check if table exists:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'enrichment_fields';
   ```

2. Check if fields were inserted:
   ```sql
   SELECT * FROM enrichment_fields LIMIT 5;
   ```

3. If table exists but empty, re-run the INSERT statements from migration 008

### Migration 008 Fails

**Common Errors**:

**Error: "type enrichment_tier already exists"**
- The enum was already created
- Skip to the CREATE TABLE statement

**Error: "table enrichment_fields already exists"**
- Table was created but not populated
- Run just the INSERT statements

**Error: "function update_updated_at does not exist"**
- Run migration 001 first (creates this function)

### Manual Field Population

If INSERT statements fail, you can manually add fields:

```sql
-- Example: Add a single field
INSERT INTO enrichment_fields
  (field_name, display_name, field_category, data_type, tier, sort_order, description)
VALUES
  ('owner_email', 'Email Address', 'contact', 'email', 'BASIC', 5, 'Primary email address');

-- Add another
INSERT INTO enrichment_fields
  (field_name, display_name, field_category, data_type, tier, sort_order, description)
VALUES
  ('mobile_phone', 'Mobile Phone', 'contact', 'phone', 'ENHANCED', 6, 'Mobile phone number');
```

## Verification Checklist

After setup, verify:

- [ ] Migration 007 ran successfully (enrichment_sources table exists with 3 rows)
- [ ] Migration 008 ran successfully (enrichment_fields table exists with 65 rows)
- [ ] Migration 009 ran successfully (enrichment_history table exists)
- [ ] Migration 009_fixed ran successfully (views work without errors)
- [ ] `/dashboard/admin/enrichment-config` shows all 65 fields
- [ ] Can change field tiers using dropdowns
- [ ] "Save Changes" button works
- [ ] `/dashboard/admin/enrichment-history` loads (even if empty)

## Complete Field List

After migration 008, these fields should be available:

### Contact Fields (12)
- owner_last_name, owner_first_name
- job_title, job_title_hierarchy_level, management_level
- job_start_date, job_function, department
- direct_phone, email, mobile_phone
- linkedin_contact_url

### Company Fields (14)
- company_name, website, company_phone, company_description
- zoominfo_company_id, founded_year, fax, ticker
- alexa_rank, zoominfo_profile_url
- certified_active, certification_date
- primary_industry, primary_sub_industry

### Financial Fields (12)
- revenue, revenue_range
- marketing_budget, finance_budget, it_budget, hr_budget
- total_funding, recent_funding_amount, recent_funding_round
- recent_funding_date, recent_investors, all_investors

### Firmographics Fields (7)
- employees, employee_range
- employee_growth_1yr, employee_growth_2yr
- ownership_type, business_model, number_of_locations

### Location Fields (6)
- street_address, city, state, zip_code, country, full_address

### Industry Classification (8)
- all_industries, all_sub_industries, industry_category
- sic_code_1, sic_codes, naics_code_1, naics_codes

### Social Media Fields (3)
- linkedin_company_url, facebook_url, twitter_url

## Default Tier Assignments

The migration sets these defaults:

**BASIC Tier** (25 fields):
- Essential contact info (name, email, phone, title)
- Basic company info (name, website, phone, description)
- Location (full address)
- Basic firmographics (employee count/range, revenue range)
- Primary industry

**ENHANCED Tier** (40 fields):
- Extended contact info (mobile, LinkedIn, job details)
- Company details (founding, certifications, IDs)
- All financial data (budgets, funding, revenue)
- Growth metrics
- Industry codes (SIC, NAICS)
- Social media profiles

You can change any of these assignments in the UI after setup!

## Next Steps After Setup

1. **Review Default Assignments**: Check if Basic/Enhanced splits make sense for your use case
2. **Customize as Needed**: Adjust field tiers based on your business needs
3. **Test Enrichment**: Try enriching a company with both BASIC and ENHANCED tiers
4. **Check History**: Verify enrichment activities are logged
5. **Monitor Quality**: Use stats dashboard to track completeness

## Support

If you encounter issues:
1. Check Supabase SQL Editor for error messages
2. Verify all migrations ran in order
3. Check browser console for API errors
4. Review server logs for backend issues
