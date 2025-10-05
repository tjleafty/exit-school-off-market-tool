-- Run this in Supabase SQL Editor to see what enrichment data was saved

SELECT
  id,
  name,
  is_enriched,
  enrichment_data->'zoominfo_data' as zoominfo_data,
  enrichment_data->'enriched_at' as enriched_at
FROM companies
WHERE is_enriched = true
ORDER BY updated_at DESC
LIMIT 5;
