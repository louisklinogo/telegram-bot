-- ============================================================================
-- Migration 005: Create Transaction Tags System
-- ============================================================================
-- Description: Creates tags table and transaction_tags junction table
-- Run this AFTER creating categories (004)
-- ============================================================================

-- STEP 1: Create tags table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT, -- Hex color for UI
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure tag name is unique per team
  CONSTRAINT unique_tag_name_per_team UNIQUE(team_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_team_id 
  ON tags(team_id);

CREATE INDEX IF NOT EXISTS idx_tags_name 
  ON tags(name);

-- STEP 2: Create transaction_tags junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure each transaction can only have a tag once
  CONSTRAINT unique_transaction_tag UNIQUE(transaction_id, tag_id)
);

-- STEP 3: Create indexes for transaction_tags
-- ============================================================================

-- Transaction lookup (get all tags for a transaction)
CREATE INDEX idx_transaction_tags_transaction_id 
  ON transaction_tags(transaction_id);

-- Tag lookup (get all transactions with a tag)
CREATE INDEX idx_transaction_tags_tag_id 
  ON transaction_tags(tag_id);

-- Team lookup (for team-scoped queries)
CREATE INDEX idx_transaction_tags_team_id 
  ON transaction_tags(team_id);

-- Composite index for filtering transactions by tags
CREATE INDEX idx_transaction_tags_team_transaction_tag 
  ON transaction_tags(team_id, transaction_id, tag_id);

-- STEP 4: Seed common tags for all teams (optional)
-- ============================================================================

-- Insert common tags for all existing teams
INSERT INTO tags (team_id, name, color)
SELECT 
  t.id as team_id,
  tag.name,
  tag.color
FROM teams t
CROSS JOIN (
  VALUES 
    ('Urgent', '#FF4444'),
    ('Review', '#F5A623'),
    ('Recurring', '#4A90E2'),
    ('Tax Deductible', '#00C969'),
    ('Personal', '#BD10E0'),
    ('Reimbursable', '#F8E71C'),
    ('Client Billable', '#00C969'),
    ('Needs Receipt', '#FF9500'),
    ('Verified', '#00C969'),
    ('Disputed', '#FF4444')
) AS tag(name, color)
ON CONFLICT (team_id, name) DO NOTHING;

-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE tags IS 'Flexible tagging system shared across transactions, clients, and other entities';
COMMENT ON TABLE transaction_tags IS 'Many-to-many junction table linking transactions to tags';
COMMENT ON CONSTRAINT unique_transaction_tag ON transaction_tags IS 'Prevents duplicate tag assignments';

-- Verification query (optional - check tags)
-- SELECT 
--   t.name as tag_name,
--   t.color,
--   COUNT(tt.transaction_id) as transaction_count
-- FROM tags t
-- LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
-- WHERE t.team_id = '<your-team-id>'
-- GROUP BY t.id, t.name, t.color
-- ORDER BY transaction_count DESC, t.name;
