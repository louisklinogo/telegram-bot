-- 0027_product_media.sql
-- Create product_media table, backfill from products.images, indexes, and RLS policies (idempotent)

CREATE TABLE IF NOT EXISTS public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  path text NOT NULL,
  alt text,
  is_primary boolean NOT NULL DEFAULT false,
  position integer,
  width integer,
  height integer,
  size_bytes integer,
  mime_type varchar(128),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_media_team ON public.product_media(team_id);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_variant ON public.product_media(variant_id);

-- One primary per product
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_primary_media_per_product') THEN
    CREATE UNIQUE INDEX uq_primary_media_per_product ON public.product_media(product_id) WHERE is_primary = true;
  END IF;
END $$;

-- One primary per variant (when variant_id is set)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_primary_media_per_variant') THEN
    CREATE UNIQUE INDEX uq_primary_media_per_variant ON public.product_media(variant_id) WHERE is_primary = true AND variant_id IS NOT NULL;
  END IF;
END $$;

-- Backfill from products.images (array of text paths)
INSERT INTO public.product_media (team_id, product_id, path, is_primary, position)
SELECT p.team_id, p.id, elem.path, (elem.ord = 1) AS is_primary, elem.ord - 1 AS position
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements_text(p.images::jsonb) WITH ORDINALITY AS elem(path, ord)
WHERE p.images IS NOT NULL AND jsonb_typeof(p.images::jsonb) = 'array' AND jsonb_array_length(p.images::jsonb) > 0
ON CONFLICT DO NOTHING;

-- Enable RLS and add policies
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_media' AND p.polname = 'team_select_product_media'
  ) THEN
    CREATE POLICY team_select_product_media ON public.product_media FOR SELECT
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_media' AND p.polname = 'team_insert_product_media'
  ) THEN
    CREATE POLICY team_insert_product_media ON public.product_media FOR INSERT
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_media' AND p.polname = 'team_update_product_media'
  ) THEN
    CREATE POLICY team_update_product_media ON public.product_media FOR UPDATE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_media' AND p.polname = 'team_delete_product_media'
  ) THEN
    CREATE POLICY team_delete_product_media ON public.product_media FOR DELETE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
