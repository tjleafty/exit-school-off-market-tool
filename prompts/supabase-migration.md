# Supabase Migration Prompt Template

Create a Supabase migration for [feature].

## Tables needed:
[list tables and relationships]

## Include:
- RLS policies for user/admin access
- Indexes for performance
- Triggers for updated_at timestamps
- Foreign key constraints
- Initial seed data (if applicable)

## Output as SQL with clear comments.

## Example Usage:
```
Create a Supabase migration for company enrichment tracking.

Tables needed:
- companies (id, name, domain, industry, employee_count, annual_revenue, status, created_at, updated_at)
- enrichment_sources (id, name, type, api_endpoint, is_active, rate_limit, cost_per_call)
- enrichment_jobs (id, company_id, source_id, status, data_enriched, cost, started_at, completed_at)
- enrichment_data (id, company_id, source_id, data_type, raw_data, processed_data, created_at)

Relationships:
- enrichment_jobs.company_id -> companies.id
- enrichment_jobs.source_id -> enrichment_sources.id  
- enrichment_data.company_id -> companies.id
- enrichment_data.source_id -> enrichment_sources.id

Include:
- RLS policies for user/admin access (admins can access all, users only their tenant data)
- Indexes for performance on company_id, source_id, created_at
- Triggers for updated_at timestamps
- Initial seed data for common enrichment sources
```