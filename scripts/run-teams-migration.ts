#!/usr/bin/env bun

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function runMigration() {
  console.log("🚀 Running Teams Metadata Migration...\n");

  // Get database URL from environment
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("❌ DATABASE_URL not found in environment variables");
  }

  // Create postgres client
  const sql = postgres(dbUrl);

  try {
    // Read the migration SQL
    const sqlPath = join(import.meta.dir, "migrations", "001-add-teams-metadata.sql");
    const migrationSql = readFileSync(sqlPath, "utf-8");

    console.log("📄 Loaded migration: 001-add-teams-metadata.sql");
    console.log("📊 Adding 5 columns to teams table...\n");

    // Execute the migration
    await sql.unsafe(migrationSql);

    console.log("✅ Migration executed successfully!\n");

    // Verify the changes
    console.log("🔍 Verifying teams table structure...\n");
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `;

    console.log("Teams table columns:");
    for (const col of result) {
      const defaultValue = col.column_default ? ` (default: ${col.column_default})` : "";
      console.log(`  ✓ ${col.column_name} - ${col.data_type}${defaultValue}`);
    }

    console.log("\n✅ Migration complete! Teams table now has all required fields.");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
