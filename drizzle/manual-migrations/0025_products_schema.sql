-- 0025_products_schema.sql
-- Create product-related enums and tables (idempotent), ensure team_id present on product_inventory

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('active','draft','archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
    CREATE TYPE product_type AS ENUM ('physical','service','digital','bundle');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_type') THEN
    CREATE TYPE fulfillment_type AS ENUM ('stocked','dropship','made_to_order','preorder');
  END IF;
END $$;

-- products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug varchar(120),
  type product_type NOT NULL DEFAULT 'physical',
  status product_status NOT NULL DEFAULT 'active',
  description text,
  category_slug varchar(120),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_products_team ON public.products(team_id);
CREATE INDEX IF NOT EXISTS idx_products_team_name ON public.products(team_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_team_slug ON public.products(team_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- inventory_locations
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  code varchar(32),
  is_default boolean NOT NULL DEFAULT false,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_team ON public.inventory_locations(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_team_code ON public.inventory_locations(team_id, code);

-- product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text,
  sku varchar(64),
  barcode varchar(64),
  unit_of_measure varchar(32),
  pack_size numeric(10,3),
  price numeric(12,2),
  currency varchar(8),
  cost numeric(12,2),
  status product_status NOT NULL DEFAULT 'active',
  fulfillment_type fulfillment_type NOT NULL DEFAULT 'stocked',
  stock_managed boolean NOT NULL DEFAULT true,
  lead_time_days integer,
  availability_date date,
  backorder_policy varchar(16),
  capacity_per_period integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_variants_team ON public.product_variants(team_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_variants_team_sku ON public.product_variants(team_id, sku);
CREATE INDEX IF NOT EXISTS idx_variants_status ON public.product_variants(status);

-- product_inventory
CREATE TABLE IF NOT EXISTS public.product_inventory (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  on_hand integer NOT NULL DEFAULT 0,
  allocated integer NOT NULL DEFAULT 0,
  safety_stock integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid,
  CONSTRAINT pk_product_inventory PRIMARY KEY (variant_id, location_id)
);
-- ensure team_id exists and is not null, then add FK and index
ALTER TABLE public.product_inventory ADD COLUMN IF NOT EXISTS team_id uuid;
UPDATE public.product_inventory pi
SET team_id = v.team_id
FROM public.product_variants v
WHERE pi.variant_id = v.id AND pi.team_id IS NULL;
ALTER TABLE public.product_inventory ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.product_inventory
  ADD CONSTRAINT fk_product_inventory_team
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_inventory_team ON public.product_inventory(team_id);
