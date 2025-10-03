# Enrichment Fields Configuration System

## Overview

This system provides a flexible, configurable enrichment framework based on ZoomInfo's comprehensive data model. Administrators can control exactly which fields are included in Basic vs Enhanced enrichment tiers.

## Features

- **65+ Enrichment Fields**: Complete ZoomInfo field set covering contact info, company data, financials, and more
- **Tier-Based Configuration**: Assign fields to Basic, Enhanced, Both, or None
- **Category Organization**: Fields grouped into 6 categories (Contact, Company, Financial, Firmographics, Location, Social)
- **Admin Interface**: Visual UI to configure field assignments
- **Flexible Data Storage**: JSONB storage allows any field combination
- **Source Priority Integration**: Works seamlessly with enrichment source priority system

## Database Structure

### Tables

#### enrichment_fields
Stores all available enrichment fields and their tier assignments.

```sql
CREATE TABLE enrichment_fields (
  id UUID PRIMARY KEY,
  field_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  field_category TEXT NOT NULL,
  data_type TEXT NOT NULL,
  tier enrichment_tier DEFAULT 'NONE',
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT
);
```

#### companies (updated)
Enhanced to store tier-specific enrichment data.

```sql
ALTER TABLE companies
  ADD COLUMN enrichment_data JSONB DEFAULT '{}',
  ADD COLUMN enrichment_tier TEXT DEFAULT 'BASIC';
```

### Field Categories

1. **contact** - Individual contact information (👤)
   - Names, titles, emails, phones, LinkedIn profiles

2. **company** - Company-level data (🏢)
   - Name, description, website, industry, certifications

3. **financial** - Financial metrics (💰)
   - Revenue, budgets, funding information

4. **firmographics** - Company characteristics (📊)
   - Employee count, growth rates, ownership, business model

5. **location** - Address and location data (📍)
   - Street address, city, state, zip, country

6. **social** - Social media presence (🌐)
   - LinkedIn, Facebook, Twitter profiles

### Tier Types

- **BASIC**: Essential fields included in basic enrichment package
- **ENHANCED**: Premium fields for enhanced/BI reports
- **BOTH**: Field included in both tiers
- **NONE**: Field available but not currently used

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration in Supabase SQL Editor:

```bash
supabase/migrations/008_enrichment_fields_system.sql
```

This creates:
- `enrichment_tier` enum type
- `enrichment_fields` table with 65+ pre-configured fields
- Updates to `companies` table for JSONB storage
- View for easy field filtering

### Step 2: Access Configuration Interface

Navigate to:
```
/dashboard/admin/enrichment-config
```

You'll see:
- Summary cards showing field distribution across tiers
- Category and tier filters
- Table of all fields with tier assignment dropdowns
- Bulk save functionality

### Step 3: Configure Field Tiers

1. Filter by category (Contact, Company, Financial, etc.)
2. Use dropdowns to assign each field to a tier
3. Make multiple changes (they're tracked as "pending")
4. Click "Save Changes" to apply all updates at once

## Default Configuration

The migration includes sensible defaults:

### Basic Tier (25 fields)
- Contact: First/Last name, Job title, Phone, Email
- Company: Name, Website, Phone, Description
- Financial: Revenue range
- Firmographics: Employee count, Employee range
- Location: Full address details
- Industry: Primary industry/sub-industry

### Enhanced Tier (40+ fields)
- Contact: Mobile, LinkedIn, Job function, Department, Management level
- Company: Founded year, Stock ticker, ZoomInfo ID, Certifications
- Financial: Detailed budgets (Marketing, IT, HR, Finance), Funding data
- Firmographics: Growth rates, Ownership type, Business model
- Industry: SIC codes, NAICS codes, All industries
- Social: LinkedIn, Facebook, Twitter

## Usage

### API Endpoints

#### Configure Fields

**GET `/api/settings/enrichment-fields`**
```javascript
// Get all fields
fetch('/api/settings/enrichment-fields')

// Filter by tier
fetch('/api/settings/enrichment-fields?tier=BASIC')

// Filter by category
fetch('/api/settings/enrichment-fields?category=contact')
```

**PUT `/api/settings/enrichment-fields`**
```javascript
// Update single field
fetch('/api/settings/enrichment-fields', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    field_name: 'mobile_phone',
    tier: 'ENHANCED'
  })
})
```

**POST `/api/settings/enrichment-fields`**
```javascript
// Bulk update
fetch('/api/settings/enrichment-fields', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updates: [
      { field_name: 'mobile_phone', tier: 'ENHANCED' },
      { field_name: 'job_title', tier: 'BASIC' },
      { field_name: 'linkedin_contact_url', tier: 'ENHANCED' }
    ]
  })
})
```

#### Enrich Companies

**POST `/api/companies/enrich-advanced`**
```javascript
// Enrich with tier-specific fields
fetch('/api/companies/enrich-advanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyId: 'uuid-here',
    tier: 'ENHANCED'  // or 'BASIC'
  })
})
```

**GET `/api/companies/enrich-advanced?tier=BASIC`**
```javascript
// Preview fields for a tier
fetch('/api/companies/enrich-advanced?tier=BASIC')
```

### Integration with Data Sources

The enrichment process:

1. Checks enrichment source priorities (from previous system)
2. Loads field configuration for requested tier
3. Calls each source in priority order
4. Filters results to only include configured fields
5. Stores data in `enrichment_data` JSONB column

Example enriched company data structure:
```json
{
  "enrichment_data": {
    "owner_first_name": "John",
    "owner_last_name": "Smith",
    "email": "john@example.com",
    "direct_phone": "+1-555-0100",
    "job_title": "CEO",
    "company_name": "Example Corp",
    "website": "https://example.com",
    "employees": 50,
    "revenue_range": "$1M - $5M",
    "street_address": "123 Main St",
    "city": "Norman",
    "state": "Oklahoma",
    "zip_code": "73069",
    "country": "United States",
    "primary_industry": "Business Services"
  },
  "enrichment_tier": "BASIC",
  "is_enriched": true,
  "enriched_at": "2025-01-15T10:30:00Z"
}
```

## Field Reference

### Contact Fields (12 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| owner_first_name | First Name | BASIC | text |
| owner_last_name | Last Name | BASIC | text |
| job_title | Job Title | BASIC | text |
| direct_phone | Direct Phone | BASIC | phone |
| email | Email Address | BASIC | email |
| mobile_phone | Mobile Phone | ENHANCED | phone |
| job_title_hierarchy_level | Job Title Hierarchy Level | ENHANCED | number |
| management_level | Management Level | ENHANCED | text |
| job_start_date | Job Start Date | ENHANCED | date |
| job_function | Job Function | ENHANCED | text |
| department | Department | ENHANCED | text |
| linkedin_contact_url | LinkedIn Profile | ENHANCED | url |

### Company Fields (14 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| company_name | Company Name | BASIC | text |
| website | Website | BASIC | url |
| company_phone | Company Phone | BASIC | phone |
| company_description | Description | BASIC | text |
| primary_industry | Primary Industry | BASIC | text |
| primary_sub_industry | Primary Sub-Industry | BASIC | text |
| zoominfo_company_id | ZoomInfo Company ID | ENHANCED | text |
| founded_year | Founded Year | ENHANCED | number |
| fax | Fax Number | ENHANCED | phone |
| ticker | Stock Ticker | ENHANCED | text |
| alexa_rank | Alexa Rank | ENHANCED | number |
| zoominfo_profile_url | ZoomInfo Profile | ENHANCED | url |
| certified_active | Certified Active | ENHANCED | text |
| certification_date | Certification Date | ENHANCED | date |

### Financial Fields (12 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| revenue_range | Revenue Range | BASIC | text |
| revenue | Revenue (USD) | ENHANCED | number |
| marketing_budget | Marketing Budget | ENHANCED | number |
| finance_budget | Finance Budget | ENHANCED | number |
| it_budget | IT Budget | ENHANCED | number |
| hr_budget | HR Budget | ENHANCED | number |
| total_funding | Total Funding | ENHANCED | number |
| recent_funding_amount | Recent Funding Amount | ENHANCED | number |
| recent_funding_round | Recent Funding Round | ENHANCED | text |
| recent_funding_date | Recent Funding Date | ENHANCED | date |
| recent_investors | Recent Investors | ENHANCED | text |
| all_investors | All Investors | ENHANCED | text |

### Firmographics Fields (7 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| employees | Employee Count | BASIC | number |
| employee_range | Employee Range | BASIC | text |
| employee_growth_1yr | Employee Growth (1 Year) | ENHANCED | number |
| employee_growth_2yr | Employee Growth (2 Years) | ENHANCED | number |
| ownership_type | Ownership Type | ENHANCED | text |
| business_model | Business Model | ENHANCED | text |
| number_of_locations | Number of Locations | ENHANCED | number |

### Location Fields (6 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| street_address | Street Address | BASIC | text |
| city | City | BASIC | text |
| state | State | BASIC | text |
| zip_code | Zip Code | BASIC | text |
| country | Country | BASIC | text |
| full_address | Full Address | BASIC | text |

### Industry Classification (8 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| all_industries | All Industries | ENHANCED | text |
| all_sub_industries | All Sub-Industries | ENHANCED | text |
| industry_category | Industry Category | ENHANCED | text |
| sic_code_1 | SIC Code (Primary) | ENHANCED | text |
| sic_codes | SIC Codes (All) | ENHANCED | text |
| naics_code_1 | NAICS Code (Primary) | ENHANCED | text |
| naics_codes | NAICS Codes (All) | ENHANCED | text |

### Social Media Fields (3 total)

| Field Name | Display Name | Default Tier | Type |
|------------|--------------|--------------|------|
| linkedin_company_url | LinkedIn Company | ENHANCED | url |
| facebook_url | Facebook Page | ENHANCED | url |
| twitter_url | Twitter Profile | ENHANCED | url |

## Use Cases

### Scenario 1: Basic Lead Generation
Goal: Collect essential contact info for outreach

Configuration:
- Set to BASIC tier
- Include: Name, Email, Phone, Job Title, Company Name, Website
- Exclude: Social media, detailed financials, industry codes

### Scenario 2: Comprehensive BI Reports
Goal: Maximum detail for strategic analysis

Configuration:
- Set to ENHANCED tier
- Include: All contact details, financials, growth metrics, social profiles
- Use for: Deep dive reports, investor presentations

### Scenario 3: Compliance-Aware Enrichment
Goal: Collect only necessary data

Configuration:
- Set specific fields to NONE tier
- Exclude: Personal mobile phones, social media profiles
- Focus: Business contact info only

## Best Practices

1. **Start with Defaults**: The pre-configured tiers are industry-standard
2. **Test Changes**: Use the preview endpoint to see what fields will be included
3. **Document Custom Configs**: Keep notes on why you changed specific fields
4. **Review Regularly**: As your needs change, update tier assignments
5. **Monitor Source Coverage**: Not all sources provide all fields
6. **Use Categories**: Group related changes by category for consistency

## Troubleshooting

### Fields Not Showing in Admin UI

**Problem**: Enrichment config page is empty

**Solutions**:
1. Run migration 008 in Supabase SQL Editor
2. Check browser console for API errors
3. Verify table exists: `SELECT COUNT(*) FROM enrichment_fields;`

### Enrichment Data Not Saving

**Problem**: enrichment_data column empty after enrichment

**Solutions**:
1. Check that tier is specified in enrichment request
2. Verify fields are assigned to that tier
3. Confirm enrichment sources are returning data
4. Check Edge Function logs for errors

### Wrong Fields Returned

**Problem**: Getting BASIC fields when requesting ENHANCED

**Solutions**:
1. Verify tier parameter in API request
2. Check field configuration in admin UI
3. Clear and re-save field assignments
4. Restart enrichment process

## Migration Path

If you have existing enrichment data:

1. Run migration 008 to add new columns
2. Existing `is_enriched` flag remains valid
3. Re-enrich companies to populate `enrichment_data` JSONB
4. Old individual columns (email, phone, etc.) can be deprecated gradually

## Performance Considerations

- JSONB indexing allows fast queries on enrichment_data
- Field filtering happens server-side to minimize data transfer
- Bulk operations supported for updating many fields at once
- View `enrichment_fields_by_tier` pre-aggregates common queries

## Future Enhancements

Potential additions:
- Custom field definitions
- Field-level permissions (role-based access)
- Data validation rules per field
- Automatic field mapping from multiple sources
- Export templates based on tier
- Field usage analytics
