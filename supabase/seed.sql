-- Initial seed data for Exit School Off-Market Tool
-- This file will be run on `supabase db reset`

-- Create initial admin user (will be created via Supabase Auth)
-- Email: admin@exitschool.com
-- Password: admin123 (change in production)

-- Insert initial companies for testing
INSERT INTO public.companies (
    id,
    name,
    domain,
    industry,
    employee_count,
    annual_revenue,
    description,
    headquarters_location,
    founded_year,
    status,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'TechCorp Solutions',
        'techcorp.com',
        'Software Development',
        250,
        5000000,
        'Leading provider of enterprise software solutions',
        'San Francisco, CA',
        2018,
        'active',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'DataFlow Analytics',
        'dataflow.io',
        'Data Analytics',
        85,
        2500000,
        'Advanced data analytics and visualization platform',
        'Austin, TX',
        2020,
        'active',
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'CloudScale Systems',
        'cloudscale.net',
        'Cloud Infrastructure',
        150,
        8000000,
        'Scalable cloud infrastructure solutions for enterprises',
        'Seattle, WA',
        2017,
        'active',
        now(),
        now()
    );

-- Insert initial enrichment sources
INSERT INTO public.enrichment_sources (
    id,
    name,
    type,
    api_endpoint,
    is_active,
    rate_limit,
    cost_per_call,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'LinkedIn Company API',
        'social',
        'https://api.linkedin.com/v2/companies',
        true,
        100,
        0.05,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'Clearbit Enrichment',
        'business_data',
        'https://person.clearbit.com/v2/combined',
        true,
        1000,
        0.25,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'Hunter.io Email Finder',
        'contact',
        'https://api.hunter.io/v2/domain-search',
        true,
        500,
        0.10,
        now(),
        now()
    );