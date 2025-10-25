import { Client } from "pg";

async function run() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN");

    // Ensure team_id on product_inventory and backfill
    await client.query(`
      ALTER TABLE public.product_inventory ADD COLUMN IF NOT EXISTS team_id uuid;
      UPDATE public.product_inventory pi
      SET team_id = v.team_id
      FROM public.product_variants v
      WHERE pi.variant_id = v.id AND pi.team_id IS NULL;
      ALTER TABLE public.product_inventory ALTER COLUMN team_id SET NOT NULL;
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_inventory_team'
        ) THEN
          ALTER TABLE public.product_inventory
          ADD CONSTRAINT fk_product_inventory_team
          FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_product_inventory_team ON public.product_inventory(team_id);
    `);

    // Enable RLS
    await client.query(`
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
    `);

    // Policies using IF NOT EXISTS checks
    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query("COMMIT");
    console.log("Products RLS migration applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
