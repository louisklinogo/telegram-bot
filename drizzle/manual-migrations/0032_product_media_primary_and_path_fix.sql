-- Backfill product_media.path to store storage path (strip public URL prefix if present)
-- Handles any domain; keeps existing path if already a storage path
UPDATE product_media
SET path = regexp_replace(path, '^https?://[^/]+/storage/v1/object/public/product-media/', '')
WHERE path ~ '^https?://.*/storage/v1/object/public/product-media/';

-- Ensure only one primary image per (team, product[, variant]) scope
-- First, normalize duplicates by keeping the most recent and clearing others
WITH ranked AS (
  SELECT
    id,
    team_id,
    product_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') AS variant_key,
    is_primary,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000')
      ORDER BY is_primary DESC, created_at DESC, id DESC
    ) AS rn,
    COUNT(*) FILTER (WHERE is_primary) OVER (
      PARTITION BY team_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000')
    ) AS primary_count
  FROM product_media
)
UPDATE product_media pm
SET is_primary = CASE WHEN r.rn = 1 THEN pm.is_primary ELSE false END
FROM ranked r
WHERE pm.id = r.id AND r.primary_count > 1;

-- Add partial unique index to enforce single primary per scope
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_media_primary
ON product_media (team_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
WHERE is_primary = true;
