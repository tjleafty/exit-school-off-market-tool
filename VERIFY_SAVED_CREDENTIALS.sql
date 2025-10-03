-- Run this in Supabase SQL Editor to see EXACTLY what's saved

SELECT
  service,
  username,
  client_id,
  LENGTH(encrypted_key) as private_key_length,
  SUBSTRING(encrypted_key, 1, 50) as private_key_start,
  SUBSTRING(encrypted_key, LENGTH(encrypted_key) - 50, 50) as private_key_end,
  status,
  updated_at
FROM api_keys
WHERE service = 'zoominfo';
