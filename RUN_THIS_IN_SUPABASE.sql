-- =====================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- =====================================================
-- This adds the username and client_id columns needed for ZoomInfo JWT authentication
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Add additional fields to api_keys table for JWT authentication (specifically for ZoomInfo)
-- ZoomInfo requires: username, client_id, and private_key for JWT authentication

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Update ZoomInfo service name if it exists to ensure consistency
UPDATE api_keys
SET service = 'zoominfo'
WHERE service ILIKE '%zoom%';

-- Add helpful comments
COMMENT ON COLUMN api_keys.username IS 'Username for services requiring JWT authentication (e.g., ZoomInfo)';
COMMENT ON COLUMN api_keys.client_id IS 'Client ID for services requiring JWT authentication (e.g., ZoomInfo)';
COMMENT ON COLUMN api_keys.encrypted_key IS 'API key, token, or private key depending on service authentication method';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;
