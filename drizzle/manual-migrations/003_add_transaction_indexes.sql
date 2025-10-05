-- ============================================================================
-- Migration 003: Add Transaction Performance Indexes
-- ============================================================================
-- Description: Creates indexes for optimal query performance
-- Run this AFTER enhancing transactions table (002)
-- ============================================================================

-- STEP 1: Core indexes for common queries
-- ============================================================================

-- Team + Date (most common filter combination)
CREATE INDEX IF NOT EXISTS idx_transactions_team_date 
  ON transactions(team_id, date DESC);

-- Date only (for date range queries)
CREATE INDEX IF NOT EXISTS idx_transactions_date 
  ON transactions(date DESC);

-- Assigned user (for filtering by assignment)
CREATE INDEX IF NOT EXISTS idx_transactions_assigned_id 
  ON transactions(assigned_id)
  WHERE assigned_id IS NOT NULL;

-- Client (for filtering by client)
CREATE INDEX IF NOT EXISTS idx_transactions_client_id 
  ON transactions(client_id)
  WHERE client_id IS NOT NULL;

-- Category slug (for category filtering)
CREATE INDEX IF NOT EXISTS idx_transactions_category_slug 
  ON transactions(category_slug)
  WHERE category_slug IS NOT NULL;

-- STEP 2: Composite indexes for common filter combinations
-- ============================================================================

-- Team + Status + Date (filtered queries with status)
CREATE INDEX IF NOT EXISTS idx_transactions_team_status_date 
  ON transactions(team_id, status, date DESC);

-- Team + Type + Date (filtered queries with type)
CREATE INDEX IF NOT EXISTS idx_transactions_team_type_date 
  ON transactions(team_id, type, date DESC);

-- STEP 3: Deduplication index
-- ============================================================================

-- Internal ID (for fast deduplication lookups)
CREATE INDEX IF NOT EXISTS idx_transactions_internal_id 
  ON transactions(internal_id);

-- STEP 4: Invoice/Order relationship indexes (if not already exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id 
  ON transactions(invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_order_id 
  ON transactions(order_id)
  WHERE order_id IS NOT NULL;

-- STEP 5: Pagination index (for cursor-based pagination)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_team_pagination 
  ON transactions(team_id, date DESC, id DESC)
  WHERE deleted_at IS NULL;

-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON INDEX idx_transactions_team_date IS 'Primary index for team-scoped date queries';
COMMENT ON INDEX idx_transactions_team_status_date IS 'Composite index for filtered status queries';
COMMENT ON INDEX idx_transactions_team_pagination IS 'Optimized for cursor-based pagination';

-- Verification query (optional - check indexes)
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'transactions'
-- AND indexname LIKE 'idx_transactions_%'
-- ORDER BY indexname;
