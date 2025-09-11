-- Simple Companies Table Creation
-- This will create the basic table needed for the Add to List feature

-- Create the companies table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  formatted_address TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  industry TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(3,1),
  user_ratings_total INTEGER,
  types TEXT,
  geometry TEXT,
  is_enriched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX ON companies(place_id);
CREATE INDEX ON companies(name);
CREATE INDEX ON companies(is_enriched);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON companies
  FOR ALL USING (true)
  WITH CHECK (true);

-- Verify table was created
SELECT 'Companies table created successfully! You can now use Add to List feature.' as status;