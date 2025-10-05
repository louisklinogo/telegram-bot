-- ============================================================================
-- Migration 002: Enhance Transactions Table
-- ============================================================================
-- Description: Adds new fields to transactions table following Midday patterns
-- Run this AFTER creating enums (001)
-- ============================================================================

-- STEP 1: Add new columns (all nullable initially)
-- ============================================================================

ALTER TABLE transactions
  -- Core fields
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS internal_id TEXT,
  
  -- Financial fields
  ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3),
  
  -- Classification
  ADD COLUMN IF NOT EXISTS category_slug TEXT,
  
  -- Relationships
  ADD COLUMN IF NOT EXISTS assigned_id UUID,
  
  -- Metadata
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false,
  
  -- Recurring transactions
  ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS frequency transaction_frequency,
  
  -- AI enrichment
  ADD COLUMN IF NOT EXISTS enrichment_completed BOOLEAN DEFAULT false;

-- STEP 2: Add foreign key for assigned_id
-- ============================================================================

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_assigned_user 
  FOREIGN KEY (assigned_id) REFERENCES users(id) ON DELETE SET NULL;

-- STEP 3: Populate new fields from existing data
-- ============================================================================

-- Populate date from transaction_date
UPDATE transactions 
SET date = transaction_date::date
WHERE date IS NULL;

-- Populate name from description (or default)
UPDATE transactions 
SET name = COALESCE(
  CASE 
    WHEN description IS NOT NULL AND LENGTH(description) > 0 
    THEN SUBSTRING(description FROM 1 FOR 100)
    ELSE 'Transaction'
  END
)
WHERE name IS NULL;

-- Generate internal_id for deduplication
UPDATE transactions 
SET internal_id = 'manual_' || id::text
WHERE internal_id IS NULL;

-- Set manual flag for existing transactions
UPDATE transactions 
SET manual = true
WHERE manual IS NULL;

-- STEP 4: Make critical fields NOT NULL
-- ============================================================================

ALTER TABLE transactions 
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN internal_id SET NOT NULL;

-- STEP 5: Add constraints
-- ============================================================================

-- Unique constraint on internal_id (for deduplication)
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_internal_id_unique UNIQUE(internal_id);

-- STEP 6: Make description nullable (it's now optional, name is the main field)
-- ============================================================================

ALTER TABLE transactions 
  ALTER COLUMN description DROP NOT NULL;

-- STEP 7: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN transactions.date IS 'Accounting date (separate from createdAt for when transaction occurred)';
COMMENT ON COLUMN transactions.name IS 'Transaction title/name (short description)';
COMMENT ON COLUMN transactions.internal_id IS 'Unique identifier for deduplication (format: manual_<uuid> or bank_<provider>_<id>)';
COMMENT ON COLUMN transactions.category_slug IS 'Foreign key to transaction_categories.slug';
COMMENT ON COLUMN transactions.assigned_id IS 'User assigned to manage/review this transaction';
COMMENT ON COLUMN transactions.enrichment_completed IS 'Whether AI categorization has been completed';

-- Verification query (optional - check new columns)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions' 
-- AND column_name IN ('date', 'name', 'internal_id', 'category_slug', 'assigned_id')
-- ORDER BY ordinal_position;
