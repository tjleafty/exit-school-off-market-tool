-- Check what data we have for the companies we tried to enrich

SELECT
  name,
  website,
  formatted_address,
  city,
  state,
  phone
FROM companies
WHERE name IN ('Susan''s Green Cleaning', 'PURCOR Pest Solutions')
LIMIT 5;
