import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in environment");
  process.exit(1);
}

async function applyMigration() {
  console.log("🚀 Starting migration 002: Add invoice_items...\n");

  const sql = postgres(DATABASE_URL);

  try {
    // Read migration file
    const migrationPath = join(__dirname, "migrations", "002-add-invoice-items.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("📄 Running migration SQL...");
    await sql.unsafe(migrationSQL);

    console.log("✅ Migration 002 applied successfully!\n");
    console.log("Changes:");
    console.log("  - ✅ Created invoice_items table");
    console.log("  - ✅ Added subtotal, tax, discount, sent_at to invoices");
    console.log("  - ✅ Backfilled subtotal for existing invoices");
    console.log("  - ✅ Added indexes");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });
