-- 0015_add_transactions_fts.sql
-- Add Full-Text Search support and trigram indexes for transactions

-- Enable required extensions (safe if already installed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add generated FTS column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'fts_vector'
  ) THEN
    ALTER TABLE public.transactions
      ADD COLUMN fts_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(counterparty_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(merchant_name, '')), 'D') ||
        setweight(to_tsvector('simple',  coalesce(category, '')), 'D')
      ) STORED;
  END IF;
END
$$;

-- Create FTS GIN index
CREATE INDEX IF NOT EXISTS idx_transactions_fts
  ON public.transactions USING GIN (fts_vector);

-- Trigram indexes for fuzzy search on key text fields
CREATE INDEX IF NOT EXISTS idx_transactions_name_trgm
  ON public.transactions USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm
  ON public.transactions USING GIN (description gin_trgm_ops);
