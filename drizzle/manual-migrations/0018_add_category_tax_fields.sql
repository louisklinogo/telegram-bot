-- ============================================================================
-- Migration 0018: Add tax fields to transaction_categories
-- ============================================================================
-- Description: Adds tax-related columns and excluded flag to categories.
-- Idempotent: Uses IF NOT EXISTS guards.
-- ============================================================================

BEGIN;

ALTER TABLE transaction_categories
  ADD COLUMN IF NOT EXISTS tax_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS tax_type text,
  ADD COLUMN IF NOT EXISTS tax_reporting_code text,
  ADD COLUMN IF NOT EXISTS excluded boolean NOT NULL DEFAULT false;

-- Backfill notes:
--  - excluded defaults to false for existing rows via DEFAULT + NOT NULL.
--  - tax_rate/tax_type/tax_reporting_code remain NULL until explicitly set.

COMMENT ON COLUMN transaction_categories.tax_rate IS 'Tax rate as a decimal percentage (e.g., 15.00 for 15%)';
COMMENT ON COLUMN transaction_categories.tax_type IS 'Tax type (e.g., VAT, GST)';
COMMENT ON COLUMN transaction_categories.tax_reporting_code IS 'Jurisdiction-specific reporting code';
COMMENT ON COLUMN transaction_categories.excluded IS 'If true, category is excluded from analytics';

COMMIT;
