-- ============================================================================
-- Migration 008: Add Full-Text Search (OPTIONAL)
-- ============================================================================
-- Description: Enables PostgreSQL full-text search and trigram similarity
-- Run this for fast fuzzy search capabilities
-- ============================================================================

-- STEP 1: Enable required extensions
-- ============================================================================

-- Trigram extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Unaccent extension for accent-insensitive search (optional)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- STEP 2: Add FTS generated column
-- ============================================================================

-- Add tsvector column for full-text search
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS fts_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(name, '') || ' ' || 
      COALESCE(description, '') || ' ' || 
      COALESCE(counterparty_name, '') || ' ' ||
      COALESCE(merchant_name, '') || ' ' ||
      COALESCE(category, '')
    )
  ) STORED;

-- STEP 3: Create FTS indexes
-- ============================================================================

-- GIN index for full-text search (fast but larger)
CREATE INDEX IF NOT EXISTS idx_transactions_fts 
  ON transactions USING GIN(fts_vector);

-- Trigram index for fuzzy name search
CREATE INDEX IF NOT EXISTS idx_transactions_name_trigram 
  ON transactions USING GIN(name gin_trgm_ops);

-- Trigram index for description
CREATE INDEX IF NOT EXISTS idx_transactions_description_trigram 
  ON transactions USING GIN(description gin_trgm_ops);

-- STEP 4: Create search helper function
-- ============================================================================

-- Function to search transactions with ranking
CREATE OR REPLACE FUNCTION search_transactions(
  p_team_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  transaction_id UUID,
  name TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.amount,
    t.date,
    ts_rank(t.fts_vector, plainto_tsquery('english', p_query)) as rank
  FROM transactions t
  WHERE 
    t.team_id = p_team_id
    AND t.deleted_at IS NULL
    AND t.fts_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, t.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Create fuzzy search helper function
-- ============================================================================

-- Function for fuzzy/similarity search
CREATE OR REPLACE FUNCTION fuzzy_search_transactions(
  p_team_id UUID,
  p_query TEXT,
  p_threshold REAL DEFAULT 0.3,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  transaction_id UUID,
  name TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.amount,
    t.date,
    GREATEST(
      similarity(t.name, p_query),
      COALESCE(similarity(t.description, p_query), 0),
      COALESCE(similarity(t.counterparty_name, p_query), 0)
    ) as sim
  FROM transactions t
  WHERE 
    t.team_id = p_team_id
    AND t.deleted_at IS NULL
    AND (
      similarity(t.name, p_query) > p_threshold
      OR similarity(t.description, p_query) > p_threshold
      OR similarity(t.counterparty_name, p_query) > p_threshold
    )
  ORDER BY sim DESC, t.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN transactions.fts_vector IS 'Generated tsvector for full-text search across name, description, counterparty, and merchant';
COMMENT ON FUNCTION search_transactions IS 'Full-text search with relevance ranking';
COMMENT ON FUNCTION fuzzy_search_transactions IS 'Fuzzy/similarity search using trigrams';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Full-text search
-- SELECT * FROM search_transactions(
--   '<your-team-id>'::uuid,
--   'office supplies',
--   20
-- );

-- Example 2: Fuzzy search (finds "Nike" even if you search "Nkie")
-- SELECT * FROM fuzzy_search_transactions(
--   '<your-team-id>'::uuid,
--   'Nkie',
--   0.3,
--   10
-- );

-- Example 3: Direct FTS query
-- SELECT 
--   name,
--   description,
--   ts_rank(fts_vector, plainto_tsquery('english', 'office supplies')) as rank
-- FROM transactions
-- WHERE 
--   team_id = '<your-team-id>'
--   AND deleted_at IS NULL
--   AND fts_vector @@ plainto_tsquery('english', 'office supplies')
-- ORDER BY rank DESC;
