-- Add unique constraint to company_contacts for upsert operations
-- This allows us to avoid duplicate contacts when re-enriching companies

-- First, remove any existing duplicates based on company_id + source + source_contact_id
DELETE FROM company_contacts a USING company_contacts b
WHERE a.id < b.id
  AND a.company_id = b.company_id
  AND a.source = b.source
  AND a.source_contact_id = b.source_contact_id
  AND a.source_contact_id IS NOT NULL;

-- Add unique constraint
ALTER TABLE company_contacts
ADD CONSTRAINT company_contacts_unique_source
UNIQUE (company_id, source, source_contact_id);

-- Add comment
COMMENT ON CONSTRAINT company_contacts_unique_source ON company_contacts IS 'Ensures no duplicate contacts from the same source for a company';
