-- ============================================================================
-- Migration 007: Convert Payment Method and Status to ENUMs (OPTIONAL)
-- ============================================================================
-- Description: Converts existing payment_method and status columns to use ENUMs
-- ⚠️ WARNING: This is OPTIONAL and RISKY if you have custom values
-- Run this ONLY if you want strict type enforcement
-- ============================================================================

-- ⚠️⚠️⚠️ IMPORTANT NOTES ⚠️⚠️⚠️
-- 1. This migration will FAIL if you have values not in the enum lists
-- 2. Backup your data before running this
-- 3. Check for non-standard values first (see verification queries below)
-- 4. You may need to clean/map data before converting

-- VERIFICATION STEP 1: Check existing payment_method values
-- ============================================================================
-- Run this first to see what values exist:

-- SELECT DISTINCT payment_method, COUNT(*) 
-- FROM transactions 
-- WHERE payment_method IS NOT NULL
-- GROUP BY payment_method
-- ORDER BY COUNT(*) DESC;

-- VERIFICATION STEP 2: Check existing status values
-- ============================================================================
-- Run this first to see what values exist:

-- SELECT DISTINCT status, COUNT(*) 
-- FROM transactions 
-- WHERE status IS NOT NULL
-- GROUP BY status
-- ORDER BY COUNT(*) DESC;

-- ============================================================================
-- PROCEED ONLY IF ALL VALUES MATCH THE ENUMS
-- ============================================================================

-- STEP 1: Clean/map payment_method values (customize as needed)
-- ============================================================================

-- Map any non-standard values to enum values
UPDATE transactions 
SET payment_method = (CASE
  WHEN LOWER(payment_method::text) IN ('cash', 'cash payment') THEN 'cash'
  WHEN LOWER(payment_method::text) IN ('bank_transfer', 'bank transfer', 'transfer', 'wire') THEN 'bank_transfer'
  WHEN LOWER(payment_method::text) IN ('mobile_money', 'momo', 'm-pesa', 'mobile money') THEN 'mobile_money'
  WHEN LOWER(payment_method::text) IN ('card', 'credit card', 'debit card') THEN 'card'
  WHEN LOWER(payment_method::text) IN ('cheque', 'check') THEN 'cheque'
  ELSE 'other'
END)::transaction_method
WHERE payment_method IS NOT NULL;

-- STEP 2: Clean/map status values (customize as needed)
-- ============================================================================

UPDATE transactions 
SET status = (CASE
  WHEN LOWER(status::text) IN ('pending', 'processing') THEN 'pending'
  WHEN LOWER(status::text) IN ('completed', 'complete', 'success', 'successful') THEN 'completed'
  WHEN LOWER(status::text) IN ('failed', 'error') THEN 'failed'
  WHEN LOWER(status::text) IN ('refunded', 'refund') THEN 'refunded'
  WHEN LOWER(status::text) IN ('archived', 'archive') THEN 'archived'
  WHEN LOWER(status::text) IN ('excluded', 'exclude') THEN 'excluded'
  ELSE 'completed' -- Default to completed for unknown values
END)::transaction_status
WHERE status IS NOT NULL;

-- STEP 3: Convert payment_method to ENUM (IF NOT ALREADY ENUM)
-- ============================================================================
-- ⚠️ SKIP THIS STEP IF COLUMNS ARE ALREADY ENUMS (you'll get dependency errors)
-- Only run if converting from TEXT/VARCHAR to ENUM for the first time

-- Drop dependent views before column modification
-- DROP VIEW IF EXISTS transactions_income CASCADE;
-- DROP VIEW IF EXISTS transactions_expenses CASCADE;

-- First, create a temp column with the enum type
-- ALTER TABLE transactions 
--   ADD COLUMN payment_method_new transaction_method;

-- Copy data to new column
-- UPDATE transactions 
-- SET payment_method_new = payment_method::transaction_method
-- WHERE payment_method IS NOT NULL;

-- Drop old column and rename new column
-- ALTER TABLE transactions 
--   DROP COLUMN payment_method;

-- ALTER TABLE transactions 
--   RENAME COLUMN payment_method_new TO payment_method;

-- Recreate views (customize based on your original view definitions)
-- CREATE VIEW transactions_income AS ...
-- CREATE VIEW transactions_expenses AS ...

-- STEP 4: Convert status to ENUM (IF NOT ALREADY ENUM)
-- ============================================================================
-- ⚠️ SKIP THIS STEP IF COLUMNS ARE ALREADY ENUMS

-- Drop dependent views if needed
-- DROP VIEW IF EXISTS transactions_income CASCADE;
-- DROP VIEW IF EXISTS transactions_expenses CASCADE;

-- First, create a temp column with the enum type
-- ALTER TABLE transactions 
--   ADD COLUMN status_new transaction_status;

-- Copy data to new column with default
-- UPDATE transactions 
-- SET status_new = status::transaction_status
-- WHERE status IS NOT NULL;

-- Set default for new rows
-- ALTER TABLE transactions 
--   ALTER COLUMN status_new SET DEFAULT 'completed'::transaction_status;

-- Drop old column and rename new column
-- ALTER TABLE transactions 
--   DROP COLUMN status;

-- ALTER TABLE transactions 
--   RENAME COLUMN status_new TO status;

-- Restore NOT NULL constraint
-- ALTER TABLE transactions 
--   ALTER COLUMN status SET NOT NULL;

-- Recreate views (customize based on your original view definitions)
-- CREATE VIEW transactions_income AS ...
-- CREATE VIEW transactions_expenses AS ...

-- STEP 5: Verification
-- ============================================================================

-- Check the conversion worked
-- SELECT 
--   payment_method::text as method,
--   status::text as status,
--   COUNT(*) as count
-- FROM transactions
-- GROUP BY payment_method, status
-- ORDER BY count DESC;

COMMENT ON COLUMN transactions.payment_method IS 'Payment method (ENUM: cash, bank_transfer, mobile_money, card, cheque, other)';
COMMENT ON COLUMN transactions.status IS 'Transaction status (ENUM: pending, completed, failed, refunded, archived, excluded)';
