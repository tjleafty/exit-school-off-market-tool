-- Run this in Supabase SQL Editor to check ZoomInfo credentials

SELECT
  service,
  CASE
    WHEN username IS NOT NULL AND username != '' THEN 'Username: ' || username
    ELSE 'Username: MISSING'
  END as username_status,
  CASE
    WHEN client_id IS NOT NULL AND client_id != '' THEN 'Client ID: ' || SUBSTRING(client_id, 1, 20) || '...'
    ELSE 'Client ID: MISSING'
  END as client_id_status,
  CASE
    WHEN encrypted_key IS NOT NULL AND encrypted_key != '' THEN 'Private Key: ' || SUBSTRING(encrypted_key, 1, 30) || '...'
    ELSE 'Private Key: MISSING'
  END as private_key_status,
  status,
  created_at,
  updated_at
FROM api_keys
WHERE service = 'zoominfo';

-- If no results, ZoomInfo record doesn't exist at all
