-- 0026_products_rls.sql
-- Enable RLS and add team_id-scoped policies for product tables

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

-- Helper: policy creation function pattern replicated inline using IF NOT EXISTS checks

-- products policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products' AND p.polname = 'team_select_products'
  ) THEN
    CREATE POLICY team_select_products ON public.products FOR SELECT
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products' AND p.polname = 'team_insert_products'
  ) THEN
    CREATE POLICY team_insert_products ON public.products FOR INSERT
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products' AND p.polname = 'team_update_products'
  ) THEN
    CREATE POLICY team_update_products ON public.products FOR UPDATE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'products' AND p.polname = 'team_delete_products'
  ) THEN
    CREATE POLICY team_delete_products ON public.products FOR DELETE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- product_variants policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_variants' AND p.polname = 'team_select_product_variants'
  ) THEN
    CREATE POLICY team_select_product_variants ON public.product_variants FOR SELECT
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_variants' AND p.polname = 'team_insert_product_variants'
  ) THEN
    CREATE POLICY team_insert_product_variants ON public.product_variants FOR INSERT
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_variants' AND p.polname = 'team_update_product_variants'
  ) THEN
    CREATE POLICY team_update_product_variants ON public.product_variants FOR UPDATE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_variants' AND p.polname = 'team_delete_product_variants'
  ) THEN
    CREATE POLICY team_delete_product_variants ON public.product_variants FOR DELETE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- inventory_locations policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'inventory_locations' AND p.polname = 'team_select_inventory_locations'
  ) THEN
    CREATE POLICY team_select_inventory_locations ON public.inventory_locations FOR SELECT
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'inventory_locations' AND p.polname = 'team_insert_inventory_locations'
  ) THEN
    CREATE POLICY team_insert_inventory_locations ON public.inventory_locations FOR INSERT
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'inventory_locations' AND p.polname = 'team_update_inventory_locations'
  ) THEN
    CREATE POLICY team_update_inventory_locations ON public.inventory_locations FOR UPDATE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'inventory_locations' AND p.polname = 'team_delete_inventory_locations'
  ) THEN
    CREATE POLICY team_delete_inventory_locations ON public.inventory_locations FOR DELETE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;

-- product_inventory policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_inventory' AND p.polname = 'team_select_product_inventory'
  ) THEN
    CREATE POLICY team_select_product_inventory ON public.product_inventory FOR SELECT
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_inventory' AND p.polname = 'team_insert_product_inventory'
  ) THEN
    CREATE POLICY team_insert_product_inventory ON public.product_inventory FOR INSERT
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_inventory' AND p.polname = 'team_update_product_inventory'
  ) THEN
    CREATE POLICY team_update_product_inventory ON public.product_inventory FOR UPDATE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()))
      WITH CHECK (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_inventory' AND p.polname = 'team_delete_product_inventory'
  ) THEN
    CREATE POLICY team_delete_product_inventory ON public.product_inventory FOR DELETE
      USING (team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
