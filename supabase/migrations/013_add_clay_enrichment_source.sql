-- Add Clay as an enrichment source
-- Clay uses async webhook-based enrichment, different from other sources

-- Insert Clay as a new enrichment source (set to DO_NOT_USE by default until configured)
INSERT INTO public.enrichment_sources (source_name, display_name, priority, is_enabled)
VALUES ('clay', 'Clay', 'DO_NOT_USE', false)
ON CONFLICT (source_name) DO NOTHING;

-- Add Clay webhook configuration to api_keys table
-- The 'encrypted_key' field will store the Clay webhook URL
-- Additional metadata can store the callback configuration
ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS callback_secret TEXT;

COMMENT ON COLUMN public.api_keys.webhook_url IS 'For webhook-based integrations like Clay - stores the webhook endpoint URL';
COMMENT ON COLUMN public.api_keys.callback_secret IS 'Secret token for verifying callback authenticity from webhook-based services';
