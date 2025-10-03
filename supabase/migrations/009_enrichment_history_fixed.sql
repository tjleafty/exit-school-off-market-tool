-- Drop existing views if they exist
DROP VIEW IF EXISTS enrichment_stats_by_user CASCADE;
DROP VIEW IF EXISTS enrichment_stats_by_date CASCADE;
DROP VIEW IF EXISTS recent_enrichment_activity CASCADE;

-- Recreate view for enrichment statistics by user (fixed)
CREATE OR REPLACE VIEW enrichment_stats_by_user AS
SELECT
  users.id as user_id,
  users.email,
  users.name,
  COALESCE(COUNT(eh.id), 0) as total_enrichments,
  COALESCE(COUNT(CASE WHEN eh.enrichment_tier = 'BASIC' THEN 1 END), 0) as basic_enrichments,
  COALESCE(COUNT(CASE WHEN eh.enrichment_tier = 'ENHANCED' THEN 1 END), 0) as enhanced_enrichments,
  COALESCE(COUNT(CASE WHEN eh.status = 'COMPLETED' THEN 1 END), 0) as successful_enrichments,
  COALESCE(COUNT(CASE WHEN eh.status = 'FAILED' THEN 1 END), 0) as failed_enrichments,
  AVG(eh.data_completeness) as avg_data_completeness,
  AVG(eh.enrichment_confidence) as avg_confidence,
  AVG(eh.duration_ms) as avg_duration_ms,
  MAX(eh.created_at) as last_enrichment_date,
  MIN(eh.created_at) as first_enrichment_date
FROM public.users
LEFT JOIN public.enrichment_history eh ON users.id = eh.user_id
GROUP BY users.id, users.email, users.name;

-- Recreate view for enrichment statistics by date
CREATE OR REPLACE VIEW enrichment_stats_by_date AS
SELECT
  DATE(created_at) as enrichment_date,
  COUNT(*) as total_enrichments,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT company_id) as unique_companies,
  COUNT(CASE WHEN enrichment_tier = 'BASIC' THEN 1 END) as basic_count,
  COUNT(CASE WHEN enrichment_tier = 'ENHANCED' THEN 1 END) as enhanced_count,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as successful_count,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
  AVG(data_completeness) as avg_completeness,
  AVG(enrichment_confidence) as avg_confidence,
  AVG(duration_ms) as avg_duration_ms
FROM public.enrichment_history
GROUP BY DATE(created_at)
ORDER BY enrichment_date DESC;

-- Recreate view for recent enrichment activity (fixed)
CREATE OR REPLACE VIEW recent_enrichment_activity AS
SELECT
  eh.id,
  eh.company_name,
  eh.company_website,
  eh.enrichment_tier,
  eh.enrichment_type,
  eh.status,
  eh.sources_used,
  eh.fields_populated,
  eh.fields_requested,
  eh.data_completeness,
  eh.enrichment_confidence,
  eh.duration_ms,
  eh.created_at,
  eh.completed_at,
  users.email as user_email,
  users.name as user_name
FROM public.enrichment_history eh
LEFT JOIN public.users ON eh.user_id = users.id
ORDER BY eh.created_at DESC
LIMIT 100;
