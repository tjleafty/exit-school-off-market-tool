# Feature Implementation Prompt Template

I need to implement [feature].

## Current context: 
[paste relevant code]

## Database schema: 
[paste schema]

## Create complete implementation with:
- API route/Server Action
- UI component
- Supabase query functions
- Error handling
- TypeScript types
- Loading states
- Optimistic updates (where applicable)

## Example Usage:
```
I need to implement company enrichment feature.

Current context:
- We have a companies table with basic info
- Users can view companies in a dashboard
- Need to enrich company data from external APIs

Database schema:
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  industry TEXT,
  employee_count INTEGER,
  annual_revenue INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Create complete implementation with:
- Server Action for triggering enrichment
- EnrichmentButton component with loading states
- Supabase functions for updating company data
- Error handling for API failures
- TypeScript types for enrichment data
- Optimistic UI updates
- Toast notifications for success/failure
```