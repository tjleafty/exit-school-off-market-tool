-- Auto Schema Refresh Migration
-- This migration adds automatic PostgREST schema cache refresh functionality

-- Create a function to automatically refresh PostgREST schema cache
CREATE OR REPLACE FUNCTION public.refresh_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the PostgREST schema cache
  NOTIFY pgrst, 'reload schema';
  
  -- Log the refresh for debugging
  RAISE NOTICE 'PostgREST schema cache refreshed at %', NOW();
END;
$$;

-- Create a function that can be called after any schema changes
CREATE OR REPLACE FUNCTION public.auto_refresh_schema_on_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh on DDL commands that affect the schema
  IF tg_tag IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'DROP INDEX') THEN
    PERFORM public.refresh_postgrest_schema();
  END IF;
END;
$$;

-- Create event trigger to automatically refresh schema on DDL changes
DROP EVENT TRIGGER IF EXISTS auto_schema_refresh_trigger;
CREATE EVENT TRIGGER auto_schema_refresh_trigger
  ON ddl_command_end
  EXECUTE FUNCTION public.auto_refresh_schema_on_ddl();

-- Create a manual refresh function for API use
CREATE OR REPLACE FUNCTION public.manual_schema_refresh()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_postgrest_schema();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Schema cache refreshed successfully',
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_postgrest_schema() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.manual_schema_refresh() TO authenticated, anon;

-- Immediately refresh schema cache for this migration
SELECT public.refresh_postgrest_schema();