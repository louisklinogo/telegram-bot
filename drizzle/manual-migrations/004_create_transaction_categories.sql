-- ============================================================================
-- Migration 004: Create Transaction Categories Table
-- ============================================================================
-- Description: Creates hierarchical transaction categories table
-- Run this AFTER adding indexes (003)
-- ============================================================================

-- STEP 1: Create transaction_categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT, -- Hex color for UI (e.g., '#00C969')
  description TEXT,
  parent_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  system BOOLEAN DEFAULT false NOT NULL, -- System-provided vs user-created
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure slug is unique per team
  CONSTRAINT unique_category_slug_per_team UNIQUE(team_id, slug)
);

-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX idx_transaction_categories_team_id 
  ON transaction_categories(team_id);

CREATE INDEX idx_transaction_categories_parent_id 
  ON transaction_categories(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX idx_transaction_categories_slug 
  ON transaction_categories(slug);

CREATE INDEX idx_transaction_categories_system 
  ON transaction_categories(system)
  WHERE system = true;

-- STEP 3: Add foreign key to transactions table
-- ============================================================================

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_category 
  FOREIGN KEY (team_id, category_slug) 
  REFERENCES transaction_categories(team_id, slug) 
  ON DELETE SET NULL;

-- STEP 4: Seed system categories for all teams
-- ============================================================================

-- Insert system categories for all existing teams
INSERT INTO transaction_categories (team_id, name, slug, color, system)
SELECT 
  t.id as team_id,
  cat.name,
  cat.slug,
  cat.color,
  true as system
FROM teams t
CROSS JOIN (
  VALUES 
    -- Income categories
    ('Income', 'income', '#00C969'),
    ('Sales Revenue', 'sales', '#00C969'),
    ('Service Revenue', 'service-revenue', '#00C969'),
    ('Other Income', 'other-income', '#00C969'),
    
    -- Expense categories
    ('Expenses', 'expenses', '#FF4444'),
    ('Cost of Goods Sold', 'cogs', '#FF6B6B'),
    ('Office Supplies', 'office-supplies', '#FF6B6B'),
    ('Rent & Utilities', 'rent-utilities', '#F5A623'),
    ('Software & Subscriptions', 'software', '#4A90E2'),
    ('Marketing & Advertising', 'marketing', '#BD10E0'),
    ('Travel & Transport', 'travel', '#F8E71C'),
    ('Meals & Entertainment', 'meals', '#F8E71C'),
    ('Professional Services', 'professional-services', '#7ED321'),
    ('Equipment & Tools', 'equipment', '#50E3C2'),
    ('Inventory', 'inventory', '#B8E986'),
    ('Salaries & Wages', 'salaries', '#9013FE'),
    ('Taxes & Licenses', 'taxes', '#9013FE'),
    ('Insurance', 'insurance', '#FF9500'),
    ('Bank Fees', 'bank-fees', '#FF6B6B'),
    
    -- Other categories
    ('Refunds', 'refunds', '#FF9500'),
    ('Adjustments', 'adjustments', '#8E8E93'),
    ('Uncategorized', 'uncategorized', '#8E8E93')
) AS cat(name, slug, color)
ON CONFLICT (team_id, slug) DO NOTHING;

-- STEP 5: Migrate existing category strings to slugs (best effort)
-- ============================================================================

-- Create a mapping of common category names to slugs
UPDATE transactions t
SET category_slug = (
  SELECT slug 
  FROM transaction_categories tc 
  WHERE tc.team_id = t.team_id 
    AND (
      LOWER(tc.name) = LOWER(t.category)
      OR tc.slug = LOWER(REPLACE(t.category, ' ', '-'))
    )
  LIMIT 1
)
WHERE t.category IS NOT NULL 
  AND t.category_slug IS NULL;

-- Set uncategorized for remaining transactions
UPDATE transactions t
SET category_slug = (
  SELECT slug 
  FROM transaction_categories tc 
  WHERE tc.team_id = t.team_id 
    AND tc.slug = 'uncategorized'
  LIMIT 1
)
WHERE t.category IS NOT NULL 
  AND t.category_slug IS NULL;

-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE transaction_categories IS 'Hierarchical transaction categories with system defaults and user-created categories';
COMMENT ON COLUMN transaction_categories.slug IS 'URL-safe unique identifier for category (e.g., office-supplies)';
COMMENT ON COLUMN transaction_categories.system IS 'True for system-provided categories that cannot be deleted';
COMMENT ON COLUMN transaction_categories.parent_id IS 'Parent category for hierarchical structure (NULL for root categories)';

-- Verification query (optional - check categories)
-- SELECT 
--   tc.name,
--   tc.slug,
--   tc.color,
--   tc.system,
--   parent.name as parent_name
-- FROM transaction_categories tc
-- LEFT JOIN transaction_categories parent ON tc.parent_id = parent.id
-- WHERE tc.team_id = '<your-team-id>'
-- ORDER BY tc.system DESC, tc.name;
