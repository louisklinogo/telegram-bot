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

    // Enums (idempotent)
    await client.query(`
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
    `);

    // products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS idx_products_team ON products(team_id);
      CREATE INDEX IF NOT EXISTS idx_products_team_name ON products(team_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_products_team_slug ON products(team_id, slug);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    `);

    // inventory_locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name text NOT NULL,
        code varchar(32),
        is_default boolean NOT NULL DEFAULT false,
        address text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_locations_team ON inventory_locations(team_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_team_code ON inventory_locations(team_id, code);
    `);

    // product_variants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS idx_variants_team ON product_variants(team_id);
      CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_variants_team_sku ON product_variants(team_id, sku);
      CREATE INDEX IF NOT EXISTS idx_variants_status ON product_variants(status);
    `);

    // product_inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_inventory (
        variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
        on_hand integer NOT NULL DEFAULT 0,
        allocated integer NOT NULL DEFAULT 0,
        safety_stock integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_product_inventory PRIMARY KEY (variant_id, location_id)
      );
    `);

    await client.query("COMMIT");
    console.log("Products migration applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
