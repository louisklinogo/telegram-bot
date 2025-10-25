-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text NULL,
  description text NULL,
  parent_id uuid NULL REFERENCES product_categories(id) ON DELETE SET NULL,
  system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_team_id ON product_categories(team_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
-- Enforce unique slug per team
CREATE UNIQUE INDEX IF NOT EXISTS unique_product_category_slug_per_team ON product_categories(team_id, slug);

-- Create product_category_mappings table
CREATE TABLE IF NOT EXISTS product_category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  product_category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  transaction_category_id uuid NOT NULL REFERENCES transaction_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for mappings
CREATE INDEX IF NOT EXISTS idx_pcm_team ON product_category_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_pcm_product_category ON product_category_mappings(product_category_id);
CREATE INDEX IF NOT EXISTS idx_pcm_transaction_category ON product_category_mappings(transaction_category_id);
-- One mapping per product category per team
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcm_team_product ON product_category_mappings(team_id, product_category_id);
