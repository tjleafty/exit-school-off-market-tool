-- Add password field to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add password reset token fields
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;