-- ============================================================================
-- Migration 006: Create Transaction Attachments Table
-- ============================================================================
-- Description: Creates table for transaction attachments (receipts, invoices, etc.)
-- Run this AFTER creating tags (005)
-- ============================================================================

-- STEP 1: Create transaction_attachments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT[] NOT NULL, -- Supabase storage path array (e.g., ['receipts', '2024', '01', 'receipt.pdf'])
  type TEXT, -- 'receipt', 'invoice', 'contract', 'other'
  mime_type TEXT, -- 'image/jpeg', 'application/pdf', etc.
  size NUMERIC(20,0), -- File size in bytes
  checksum TEXT, -- MD5/SHA256 hash for deduplication
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STEP 2: Create indexes
-- ============================================================================

-- Transaction lookup (get all attachments for a transaction)
CREATE INDEX idx_transaction_attachments_transaction_id 
  ON transaction_attachments(transaction_id);

-- Team lookup (for team-scoped queries)
CREATE INDEX idx_transaction_attachments_team_id 
  ON transaction_attachments(team_id);

-- Type lookup (filter by attachment type)
CREATE INDEX idx_transaction_attachments_type 
  ON transaction_attachments(type)
  WHERE type IS NOT NULL;

-- Checksum lookup (for deduplication)
CREATE INDEX idx_transaction_attachments_checksum 
  ON transaction_attachments(checksum)
  WHERE checksum IS NOT NULL;

-- Uploader lookup
CREATE INDEX idx_transaction_attachments_uploaded_by 
  ON transaction_attachments(uploaded_by)
  WHERE uploaded_by IS NOT NULL;

-- STEP 3: Add check constraints
-- ============================================================================

-- Ensure path array is not empty
ALTER TABLE transaction_attachments
  ADD CONSTRAINT check_attachment_path_not_empty 
  CHECK (array_length(path, 1) > 0);

-- Ensure file size is positive if provided
ALTER TABLE transaction_attachments
  ADD CONSTRAINT check_attachment_size_positive 
  CHECK (size IS NULL OR size > 0);

-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE transaction_attachments IS 'Stores receipts, invoices, and other documents attached to transactions';
COMMENT ON COLUMN transaction_attachments.path IS 'Supabase storage path as array (e.g., [''receipts'', ''2024'', ''01'', ''file.pdf''])';
COMMENT ON COLUMN transaction_attachments.checksum IS 'File hash for deduplication (prevents uploading same file twice)';
COMMENT ON COLUMN transaction_attachments.type IS 'Attachment category: receipt, invoice, contract, or other';

-- Verification query (optional - check attachments)
-- SELECT 
--   t.transaction_number,
--   t.name as transaction_name,
--   ta.name as attachment_name,
--   ta.type,
--   ta.mime_type,
--   ta.size,
--   array_to_string(ta.path, '/') as full_path,
--   u.full_name as uploaded_by
-- FROM transaction_attachments ta
-- JOIN transactions t ON ta.transaction_id = t.id
-- LEFT JOIN users u ON ta.uploaded_by = u.id
-- WHERE ta.team_id = '<your-team-id>'
-- ORDER BY ta.created_at DESC
-- LIMIT 10;
