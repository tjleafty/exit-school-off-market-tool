-- Create enrichment history table to track all enrichment activities
CREATE TABLE public.enrichment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Company and User tracking
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Company snapshot at time of enrichment
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_industry TEXT,
  company_location TEXT,

  -- Enrichment details
  enrichment_tier TEXT NOT NULL, -- 'BASIC' or 'ENHANCED'
  enrichment_type TEXT NOT NULL, -- 'MANUAL', 'BULK', 'AUTO', 'BI_REPORT'

  -- Source and field tracking
  sources_used TEXT[], -- Array of sources: ['zoominfo', 'hunter', 'apollo']
  fields_enriched TEXT[], -- Array of field names that were populated
  fields_requested INTEGER DEFAULT 0, -- Number of fields requested for this tier
  fields_populated INTEGER DEFAULT 0, -- Number of fields actually populated

  -- Quality metrics
  enrichment_confidence DECIMAL(3,2), -- Overall confidence score
  data_completeness DECIMAL(3,2), -- Percentage of requested fields populated

  -- Status tracking
  status TEXT DEFAULT 'COMPLETED', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
  error_message TEXT,

  -- Enriched data snapshot (JSONB for flexibility)
  enrichment_snapshot JSONB DEFAULT '{}',

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  request_metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER -- Enrichment duration in milliseconds
);

-- Create indexes for common queries
CREATE INDEX idx_enrichment_history_company_id ON public.enrichment_history(company_id);
CREATE INDEX idx_enrichment_history_user_id ON public.enrichment_history(user_id);
CREATE INDEX idx_enrichment_history_created_at ON public.enrichment_history(created_at DESC);
CREATE INDEX idx_enrichment_history_status ON public.enrichment_history(status);
CREATE INDEX idx_enrichment_history_tier ON public.enrichment_history(enrichment_tier);
CREATE INDEX idx_enrichment_history_type ON public.enrichment_history(enrichment_type);
CREATE INDEX idx_enrichment_history_company_name ON public.enrichment_history(company_name);

-- Create index for JSONB enrichment snapshot queries
CREATE INDEX idx_enrichment_history_snapshot ON public.enrichment_history USING gin(enrichment_snapshot);

-- Create view for enrichment statistics by user
CREATE OR REPLACE VIEW enrichment_stats_by_user AS
SELECT
  users.id as user_id,
  users.email,
  users.name,
  COUNT(eh.id) as total_enrichments,
  COUNT(CASE WHEN eh.enrichment_tier = 'BASIC' THEN 1 END) as basic_enrichments,
  COUNT(CASE WHEN eh.enrichment_tier = 'ENHANCED' THEN 1 END) as enhanced_enrichments,
  COUNT(CASE WHEN eh.status = 'COMPLETED' THEN 1 END) as successful_enrichments,
  COUNT(CASE WHEN eh.status = 'FAILED' THEN 1 END) as failed_enrichments,
  AVG(eh.data_completeness) as avg_data_completeness,
  AVG(eh.enrichment_confidence) as avg_confidence,
  AVG(eh.duration_ms) as avg_duration_ms,
  MAX(eh.created_at) as last_enrichment_date,
  MIN(eh.created_at) as first_enrichment_date
FROM public.users
LEFT JOIN public.enrichment_history eh ON users.id = eh.user_id
GROUP BY users.id, users.email, users.name;

-- Create view for enrichment statistics by date
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

-- Create view for recent enrichment activity (last 100)
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

-- Create function to log enrichment activity
CREATE OR REPLACE FUNCTION log_enrichment_activity(
  p_company_id UUID,
  p_user_id UUID,
  p_company_name TEXT,
  p_company_website TEXT DEFAULT NULL,
  p_company_industry TEXT DEFAULT NULL,
  p_company_location TEXT DEFAULT NULL,
  p_enrichment_tier TEXT DEFAULT 'BASIC',
  p_enrichment_type TEXT DEFAULT 'MANUAL',
  p_sources_used TEXT[] DEFAULT '{}',
  p_fields_enriched TEXT[] DEFAULT '{}',
  p_fields_requested INTEGER DEFAULT 0,
  p_fields_populated INTEGER DEFAULT 0,
  p_enrichment_confidence DECIMAL(3,2) DEFAULT NULL,
  p_data_completeness DECIMAL(3,2) DEFAULT NULL,
  p_status TEXT DEFAULT 'COMPLETED',
  p_error_message TEXT DEFAULT NULL,
  p_enrichment_snapshot JSONB DEFAULT '{}',
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO public.enrichment_history (
    company_id,
    user_id,
    company_name,
    company_website,
    company_industry,
    company_location,
    enrichment_tier,
    enrichment_type,
    sources_used,
    fields_enriched,
    fields_requested,
    fields_populated,
    enrichment_confidence,
    data_completeness,
    status,
    error_message,
    enrichment_snapshot,
    duration_ms,
    completed_at
  ) VALUES (
    p_company_id,
    p_user_id,
    p_company_name,
    p_company_website,
    p_company_industry,
    p_company_location,
    p_enrichment_tier,
    p_enrichment_type,
    p_sources_used,
    p_fields_enriched,
    p_fields_requested,
    p_fields_populated,
    p_enrichment_confidence,
    p_data_completeness,
    p_status,
    p_error_message,
    p_enrichment_snapshot,
    p_duration_ms,
    CASE WHEN p_status IN ('COMPLETED', 'FAILED', 'PARTIAL') THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get enrichment summary for admin dashboard
CREATE OR REPLACE FUNCTION get_enrichment_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_enrichments BIGINT,
  basic_enrichments BIGINT,
  enhanced_enrichments BIGINT,
  successful_enrichments BIGINT,
  failed_enrichments BIGINT,
  unique_companies BIGINT,
  unique_users BIGINT,
  avg_completeness NUMERIC,
  avg_confidence NUMERIC,
  avg_duration_ms NUMERIC,
  total_fields_populated BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_enrichments,
    COUNT(CASE WHEN enrichment_tier = 'BASIC' THEN 1 END)::BIGINT as basic_enrichments,
    COUNT(CASE WHEN enrichment_tier = 'ENHANCED' THEN 1 END)::BIGINT as enhanced_enrichments,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::BIGINT as successful_enrichments,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::BIGINT as failed_enrichments,
    COUNT(DISTINCT company_id)::BIGINT as unique_companies,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    ROUND(AVG(data_completeness), 2) as avg_completeness,
    ROUND(AVG(enrichment_confidence), 2) as avg_confidence,
    ROUND(AVG(duration_ms), 0) as avg_duration_ms,
    SUM(fields_populated)::BIGINT as total_fields_populated
  FROM public.enrichment_history
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Add comment to table
COMMENT ON TABLE public.enrichment_history IS 'Tracks all enrichment activities with user attribution, sources used, and quality metrics';
