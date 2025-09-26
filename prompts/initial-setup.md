# Initial Setup Prompt Template

Create a Next.js 14 app with Supabase integration for a business intelligence platform.

## Requirements:
- Use App Router with TypeScript
- Integrate Supabase client for auth and database
- Set up shadcn/ui with Tailwind
- Create folder structure for (public), (user), and (admin) route groups
- Add environment variables for Supabase

## Provide:
1. Complete package.json
2. Supabase client configuration
3. Middleware for auth protection
4. Layout components for each route group

## Context:
This is a single-tenant B2B intelligence platform with:
- Admin-gated onboarding
- Company discovery and enrichment
- AI-generated reports
- Email automation

## Tech Stack:
- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage, Edge Functions)
- TanStack Query v5
- Tailwind CSS + shadcn/ui
- OpenAI GPT-4 for reports
- Resend for email