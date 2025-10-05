-- Migration: Standardize status values to match admin dashboard expectations
-- Run this on your Supabase database

-- ============================================================================
-- ORDERS TABLE: Update status values to match STATUS_VARIANTS
-- ============================================================================

-- Update 'New' to 'Generated'
UPDATE orders
SET status = 'Generated'
WHERE status = 'New';

-- Update 'pending' to 'In progress'
UPDATE orders
SET status = 'In progress'
WHERE status = 'pending';

-- Update 'in_progress' to 'In progress'
UPDATE orders
SET status = 'In progress'
WHERE status = 'in_progress';

-- Update 'completed' to 'Completed' (capitalize)
UPDATE orders
SET status = 'Completed'
WHERE status = 'completed';

-- Update 'cancelled' to 'Cancelled' (capitalize)
UPDATE orders
SET status = 'Cancelled'
WHERE status = 'cancelled';

-- ============================================================================
-- Verify the changes
-- ============================================================================

SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY status;

-- Expected results:
-- Status       | Count
-- --------------|------
-- Generated    | X
-- In progress  | X
-- Completed    | X
-- Cancelled    | X (if any)

-- ============================================================================
-- OPTIONAL: Add check constraint to ensure only valid statuses
-- ============================================================================

-- Uncomment the following if you want to enforce status values at DB level:
-- ALTER TABLE orders
-- DROP CONSTRAINT IF EXISTS orders_status_check;
-- 
-- ALTER TABLE orders
-- ADD CONSTRAINT orders_status_check
-- CHECK (status IN ('Generated', 'In progress', 'Completed', 'Cancelled'));
