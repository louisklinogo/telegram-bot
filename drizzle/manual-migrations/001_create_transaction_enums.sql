-- ============================================================================
-- Migration 001: Create Transaction Enums (SAFE - Checks Existence)
-- ============================================================================
-- Description: Creates PostgreSQL ENUMs for type-safe transaction fields
-- Run this FIRST before altering the transactions table
-- ============================================================================

-- Transaction method enum (payment methods)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_method') THEN
    CREATE TYPE transaction_method AS ENUM (
      'cash',
      'bank_transfer',
      'mobile_money',
      'card',
      'cheque',
      'other'
    );
    RAISE NOTICE 'Created transaction_method enum';
  ELSE
    RAISE NOTICE 'transaction_method enum already exists, skipping';
  END IF;
END $$;

-- Transaction status enum (lifecycle states)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM (
      'pending',
      'completed',
      'failed',
      'refunded',
      'archived',
      'excluded'
    );
    RAISE NOTICE 'Created transaction_status enum';
  ELSE
    RAISE NOTICE 'transaction_status enum already exists, skipping';
  END IF;
END $$;

-- Transaction frequency enum (for recurring transactions)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_frequency') THEN
    CREATE TYPE transaction_frequency AS ENUM (
      'weekly',
      'biweekly',
      'monthly',
      'semi_monthly',
      'annually',
      'irregular'
    );
    RAISE NOTICE 'Created transaction_frequency enum';
  ELSE
    RAISE NOTICE 'transaction_frequency enum already exists, skipping';
  END IF;
END $$;

-- Verification query (optional - check enums were created)
-- SELECT typname, enumlabel 
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid 
-- WHERE typname LIKE 'transaction_%'
-- ORDER BY typname, enumsortorder;
