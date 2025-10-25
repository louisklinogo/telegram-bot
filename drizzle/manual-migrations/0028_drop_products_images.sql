-- 0028_drop_products_images.sql
-- Drop deprecated products.images column (idempotent)

ALTER TABLE public.products DROP COLUMN IF EXISTS images;
