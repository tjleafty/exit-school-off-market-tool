-- Create company_contacts table for storing individual contact records
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('zoominfo', 'apollo', 'hunter')),
  source_contact_id TEXT, -- ID from the source API (e.g., ZoomInfo contact ID)

  -- Basic contact info
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ', '') ||
    COALESCE(middle_name || ' ', '') ||
    COALESCE(last_name, '')
  ) STORED,

  -- Job information
  job_title TEXT,
  management_level TEXT,
  seniority TEXT,
  department TEXT,
  job_function TEXT,
  job_start_date TEXT,

  -- Contact details
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  phone TEXT,
  direct_phone TEXT,
  mobile_phone TEXT,

  -- Social/Web
  linkedin_url TEXT,
  twitter_url TEXT,

  -- Confidence & Quality
  confidence_score INTEGER,
  contact_accuracy_score INTEGER,
  has_email BOOLEAN DEFAULT false,
  has_direct_phone BOOLEAN DEFAULT false,
  has_mobile_phone BOOLEAN DEFAULT false,

  -- Metadata from source
  raw_data JSONB, -- Store full API response for reference
  last_enriched_at TIMESTAMP WITH TIME ZONE,
  last_updated_date TEXT, -- From ZoomInfo
  valid_date TEXT, -- From ZoomInfo

  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_source ON company_contacts(source);
CREATE INDEX IF NOT EXISTS idx_company_contacts_email ON company_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_contacts_management_level ON company_contacts(management_level);
CREATE INDEX IF NOT EXISTS idx_company_contacts_has_email ON company_contacts(has_email);
CREATE INDEX IF NOT EXISTS idx_company_contacts_full_name ON company_contacts USING gin(to_tsvector('english', full_name));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_company_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_contacts_updated_at
  BEFORE UPDATE ON company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_company_contacts_updated_at();

-- Add comment
COMMENT ON TABLE company_contacts IS 'Stores individual contact records from enrichment APIs (ZoomInfo, Apollo, Hunter) linked to companies';
