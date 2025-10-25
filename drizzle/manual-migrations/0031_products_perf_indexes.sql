-- Products performance indexes (safe, idempotent)
-- Products: filter by team_id + category_slug
CREATE INDEX IF NOT EXISTS idx_products_team_category_slug ON products (team_id, category_slug);

-- Variants: filter by team_id + product_id
CREATE INDEX IF NOT EXISTS idx_product_variants_team_product ON product_variants (team_id, product_id);

-- Media: filter by team_id + product_id
CREATE INDEX IF NOT EXISTS idx_product_media_team_product ON product_media (team_id, product_id);

-- Inventory: filter by team_id + variant_id
CREATE INDEX IF NOT EXISTS idx_product_inventory_team_variant ON product_inventory (team_id, variant_id);
