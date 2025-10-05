-- ============================================================================
-- Migration 000: Check Existing State (DIAGNOSTIC)
-- ============================================================================
-- Description: Run this FIRST to see what already exists in your database
-- This will help determine which migrations you need to run
-- ============================================================================

-- Check for existing enums
SELECT 
  'ENUM' as object_type,
  typname as name,
  'EXISTS' as status
FROM pg_type 
WHERE typname IN ('transaction_method', 'transaction_status', 'transaction_frequency')
ORDER BY typname;

-- Check for new columns in transactions table
SELECT 
  'COLUMN' as object_type,
  column_name as name,
  CASE 
    WHEN column_name IN (
      'date', 'name', 'internal_id', 'balance', 'base_amount', 'base_currency',
      'category_slug', 'assigned_id', 'counterparty_name', 'merchant_name',
      'manual', 'recurring', 'frequency', 'enrichment_completed'
    ) THEN 'NEW FIELD'
    ELSE 'EXISTING'
  END as status
FROM information_schema.columns 
WHERE table_name = 'transactions'
AND column_name IN (
  'date', 'name', 'internal_id', 'balance', 'base_amount', 'base_currency',
  'category_slug', 'assigned_id', 'counterparty_name', 'merchant_name',
  'manual', 'recurring', 'frequency', 'enrichment_completed',
  'description', 'payment_method', 'status'
)
ORDER BY column_name;

-- Check for new tables
SELECT 
  'TABLE' as object_type,
  table_name as name,
  CASE 
    WHEN table_name IN ('transaction_categories', 'transaction_tags', 'transaction_attachments', 'tags')
    THEN 'NEW TABLE'
    ELSE 'EXISTING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'transaction_categories', 
  'transaction_tags', 
  'transaction_attachments', 
  'tags',
  'transactions'
)
ORDER BY table_name;

-- Check for indexes
SELECT 
  'INDEX' as object_type,
  indexname as name,
  CASE 
    WHEN indexname LIKE 'idx_transactions_team_date%' THEN 'NEW INDEX'
    WHEN indexname LIKE 'idx_transactions_date%' THEN 'NEW INDEX'
    WHEN indexname LIKE 'idx_transactions_assigned%' THEN 'NEW INDEX'
    WHEN indexname LIKE 'idx_transactions_category_slug%' THEN 'NEW INDEX'
    ELSE 'EXISTING'
  END as status
FROM pg_indexes
WHERE tablename = 'transactions'
AND (
  indexname LIKE 'idx_transactions_team_date%'
  OR indexname LIKE 'idx_transactions_date%'
  OR indexname LIKE 'idx_transactions_assigned%'
  OR indexname LIKE 'idx_transactions_category_slug%'
  OR indexname LIKE 'idx_transactions_status%'
)
ORDER BY indexname;

-- Summary counts
SELECT 
  'SUMMARY' as report_type,
  (SELECT COUNT(*) FROM pg_type WHERE typname LIKE 'transaction_%') as enums_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'transactions') as transaction_columns_count,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'transaction_%') as transaction_tables_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'transactions') as transaction_indexes_count;
