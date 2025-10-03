-- Create enrichment source priority configuration table
CREATE TYPE source_priority AS ENUM ('FIRST', 'SECOND', 'THIRD', 'DO_NOT_USE');

CREATE TABLE public.enrichment_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  priority source_priority NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick priority lookups
CREATE INDEX idx_enrichment_sources_priority ON public.enrichment_sources(priority);
CREATE INDEX idx_enrichment_sources_enabled ON public.enrichment_sources(is_enabled);

-- Add trigger for updated_at
CREATE TRIGGER update_enrichment_sources_updated_at BEFORE UPDATE ON public.enrichment_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default sources with default priorities
INSERT INTO public.enrichment_sources (source_name, display_name, priority, is_enabled) VALUES
  ('zoominfo', 'ZoomInfo', 'FIRST', true),
  ('hunter', 'Hunter.io', 'SECOND', true),
  ('apollo', 'Apollo.io', 'THIRD', true);

-- Add constraint to ensure only one source per priority (excluding DO_NOT_USE)
CREATE UNIQUE INDEX idx_unique_priority ON public.enrichment_sources(priority)
  WHERE priority != 'DO_NOT_USE';
