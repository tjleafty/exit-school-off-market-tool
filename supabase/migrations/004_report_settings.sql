-- Migration: Add report_settings table for BI report customization
-- Created: 2024-12-11
-- Purpose: Store customizable AI prompts for different report sections

-- Create report_settings table
CREATE TABLE IF NOT EXISTS public.report_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_settings_updated_at ON public.report_settings(updated_at DESC);

-- Add RLS policy for admin access only
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin users can access report settings
CREATE POLICY "Admin users can manage report settings" ON public.report_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_settings TO authenticated;
GRANT USAGE ON SEQUENCE report_settings_id_seq TO authenticated;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_report_settings_updated_at 
  BEFORE UPDATE ON public.report_settings 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert default settings
INSERT INTO public.report_settings (settings_data) VALUES ('{
  "enhanced": {
    "system_prompt": "You are a business analyst creating an enhanced company overview report. Provide clear, concise insights about the company''s potential and key opportunities. Keep the analysis practical and focused on immediate opportunities.",
    "company_owner_info": {
      "prompt": "Analyze company ownership, leadership structure, and key decision makers based on enriched data. Include owner contact information, background, and decision-making authority for partnership discussions.",
      "api": "hunter"
    },
    "employees": {
      "prompt": "Evaluate company size, employee count, organizational structure, and workforce composition using available data. Assess team capabilities and organizational maturity for partnership evaluation.",
      "api": "apollo"
    },
    "company_structure": {
      "prompt": "Analyze company structure, organizational hierarchy, business model, and operational framework using available data. Assess corporate structure and organizational maturity for partnership evaluation.",
      "api": "zoominfo"
    }
  },
  "bi": {
    "system_prompt": "You are a business intelligence analyst creating a comprehensive B2B company report. Generate detailed insights with market analysis, financial projections, and strategic recommendations. Focus on data-driven insights and actionable intelligence.",
    "executive_summary": "Create an executive summary that provides strategic insights into the company''s market position, financial health, and growth trajectory with specific recommendations for stakeholders.",
    "company_overview": "Deliver a comprehensive analysis of the company''s business model, operations, competitive landscape, and market positioning with supporting data and metrics.",
    "market_analysis": "Perform comprehensive market analysis including industry trends, competitive positioning, market size, growth projections, and sector-specific opportunities and challenges.",
    "financial_insights": "Analyze financial performance, revenue trends, profitability indicators, and provide financial projections based on available data and industry benchmarks.",
    "key_personnel": "Conduct detailed analysis of leadership team, key personnel, organizational structure, and assess management capabilities and track record.",
    "growth_opportunities": "Identify and evaluate strategic growth opportunities including market expansion, product development, partnerships, and investment potential with supporting analysis.",
    "risk_assessment": "Evaluate potential risks including market risks, competitive threats, operational challenges, financial risks, and regulatory considerations with mitigation strategies.",
    "recommendations": "Provide strategic recommendations with specific action items, investment considerations, partnership strategies, and detailed implementation roadmap."
  }
}')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.report_settings IS 'Stores customizable AI prompts for different report sections and types';
COMMENT ON COLUMN public.report_settings.settings_data IS 'JSONB structure containing prompts for enhanced and BI report types';