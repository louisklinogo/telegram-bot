-- ============================================================================
-- Migration: Add Teams Metadata Fields
-- Description: Add essential operational fields to teams table
-- Date: 2024
-- ============================================================================

-- Add base_currency column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'GHS';
COMMENT ON COLUMN teams.base_currency IS 'Team base currency (GHS, USD, EUR, etc.)';

-- Add country column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'GH';
COMMENT ON COLUMN teams.country IS 'Team country code (ISO 3166-1 alpha-2: GH, US, NG, etc.)';

-- Add timezone column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Accra';
COMMENT ON COLUMN teams.timezone IS 'Team timezone for scheduling and timestamps (IANA format)';

-- Add quiet_hours column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS quiet_hours TEXT DEFAULT '21:00-08:00';
COMMENT ON COLUMN teams.quiet_hours IS 'Hours when automated messages should NOT be sent (format: HH:MM-HH:MM)';

-- Add locale column
ALTER TABLE teams ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-GH';
COMMENT ON COLUMN teams.locale IS 'Team locale for formatting dates/numbers (format: language-COUNTRY)';

-- Update existing teams to have these values if they're null
UPDATE teams SET base_currency = 'GHS' WHERE base_currency IS NULL;
UPDATE teams SET country = 'GH' WHERE country IS NULL;
UPDATE teams SET timezone = 'Africa/Accra' WHERE timezone IS NULL;
UPDATE teams SET quiet_hours = '21:00-08:00' WHERE quiet_hours IS NULL;
UPDATE teams SET locale = 'en-GH' WHERE locale IS NULL;

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Added 5 columns to teams table:';
  RAISE NOTICE '  - base_currency (default: GHS)';
  RAISE NOTICE '  - country (default: GH)';
  RAISE NOTICE '  - timezone (default: Africa/Accra)';
  RAISE NOTICE '  - quiet_hours (default: 21:00-08:00)';
  RAISE NOTICE '  - locale (default: en-GH)';
END $$;
