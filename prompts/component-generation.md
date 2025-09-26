# Component Generation Prompt Template

Create a [ComponentName] component for [purpose].

## Requirements:
- Use shadcn/ui components
- Include proper TypeScript types
- Handle loading and error states
- Use Supabase hooks for data fetching
- Include accessibility attributes
- Follow the existing code style

## Context:
[paste relevant schema/types]

## Output as a single artifact with:
- Component file
- Any required types
- Usage example

## Example Usage:
```
Create a CompanyCard component for displaying company information in the discovery dashboard.

Requirements:
- Use shadcn/ui Card component
- Include proper TypeScript types for Company
- Handle loading and error states
- Display company logo, name, industry, employee count
- Include action buttons for enrichment and report generation
- Include accessibility attributes

Context:
type Company = {
  id: string
  name: string
  domain: string
  industry: string
  employee_count: number
  annual_revenue: number
  logo_url?: string
  status: 'active' | 'inactive' | 'pending'
}

Output as a single artifact with:
- CompanyCard component file
- Company type definition
- Usage example in a dashboard
```