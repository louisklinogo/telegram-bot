/**
 * Migration Script: Schema V2
 *
 * This script:
 * 1. Drops existing tables (WARNING: ALL DATA WILL BE LOST)
 * 2. Creates new tables with Schema V2 structure
 * 3. Seeds sample data for testing
 *
 * Run: bun scripts/migrate-to-schema-v2.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL or SUPABASE_DB_URL environment variable is required");
  process.exit(1);
}

async function runMigration() {
  console.log("🚀 Starting Schema V2 Migration...\n");

  // Create postgres client
  const client = postgres(DATABASE_URL!, { max: 1 });
  const db = drizzle(client);

  try {
    // Step 1: Drop existing tables (if they exist)
    console.log("📦 Step 1: Dropping existing tables (if they exist)...");

    // Drop functions first (no dependencies)
    await db.execute(sql`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS calculate_balance_amount() CASCADE`);

    // Drop tables in correct order (CASCADE will handle triggers)
    await db.execute(sql`DROP TABLE IF EXISTS public.measurements CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.invoices CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.orders CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS public.clients CASCADE`);

    console.log("✅ Existing tables dropped\n");

    // Step 2: Create new tables
    console.log("📦 Step 2: Creating Schema V2 tables...");
    const createScript = fs.readFileSync(
      path.join(process.cwd(), "scripts", "schema-v2-create-tables.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(createScript));
    console.log("✅ Schema V2 tables created\n");

    // Step 3: Seed sample data
    console.log("📦 Step 3: Seeding sample data...");
    const seedScript = fs.readFileSync(
      path.join(process.cwd(), "scripts", "schema-v2-seed-sample-data.sql"),
      "utf-8"
    );
    await db.execute(sql.raw(seedScript));
    console.log("✅ Sample data seeded\n");

    console.log("🎉 Migration completed successfully!\n");
    console.log("📊 Summary:");
    console.log("   - Old tables dropped");
    console.log("   - New Schema V2 tables created");
    console.log("   - Sample data inserted");
    console.log("   - Ready for development!\n");

    // Verify tables
    try {
      const result = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM clients) as clients_count,
          (SELECT COUNT(*) FROM orders) as orders_count,
          (SELECT COUNT(*) FROM invoices) as invoices_count,
          (SELECT COUNT(*) FROM measurements) as measurements_count
      `);

      console.log("📈 Data Counts:");
      const row = (result as any)?.rows?.[0] || (result as any)?.[0];
      console.log(`   - Clients: ${row?.clients_count || 0}`);
      console.log(`   - Orders: ${row?.orders_count || 0}`);
      console.log(`   - Invoices: ${row?.invoices_count || 0}`);
      console.log(`   - Measurements: ${row?.measurements_count || 0}`);
    } catch (_verifyError) {
      console.log("ℹ️  Verification skipped (data inserted successfully)");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
runMigration();
