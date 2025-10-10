-- Add clay_enrichment_status to track async Clay enrichment progress
-- This allows us to show users which companies are waiting for Clay data

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS clay_enrichment_status TEXT DEFAULT NULL;

-- Possible values: NULL (not sent), 'pending' (sent to Clay), 'completed' (Clay data received), 'failed' (Clay webhook failed)

CREATE INDEX IF NOT EXISTS idx_companies_clay_status ON public.companies(clay_enrichment_status);

-- Add timestamp for when Clay enrichment was requested
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS clay_enrichment_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Add timestamp for when Clay enrichment completed
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS clay_enrichment_completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.companies.clay_enrichment_status IS 'Tracks async Clay enrichment: NULL=not sent, pending=waiting for Clay, completed=Clay data received, failed=error';
COMMENT ON COLUMN public.companies.clay_enrichment_requested_at IS 'Timestamp when company data was sent to Clay webhook';
COMMENT ON COLUMN public.companies.clay_enrichment_completed_at IS 'Timestamp when Clay enrichment data was received via webhook callback';
