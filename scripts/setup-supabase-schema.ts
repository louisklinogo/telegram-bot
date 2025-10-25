#!/usr/bin/env bun

import "dotenv/config";
import { getSupabaseServiceClient } from "@Faworra/services";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function setupSchema() {
  console.log("🔧 Setting up Supabase schema...\n");

  const supabase = getSupabaseServiceClient();

  // Read the SQL file
  const sqlPath = join(import.meta.dir, "create-supabase-schema.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("📄 Loaded SQL schema file");
  console.log("🚀 Executing SQL statements...\n");

  // Execute the SQL
  const { error } = await supabase.rpc("exec_sql", { sql_query: sql }).select();

  if (error) {
    console.error("❌ Error executing SQL:", error);

    // Fallback: Try executing via direct connection string
    console.log("\n⚡ Trying alternative method with direct SQL execution...\n");

    const { Client } = await import("pg");
    const dbUrl = process.env.SUPABASE_DB_URL;

    if (!dbUrl) {
      throw new Error("SUPABASE_DB_URL not found in environment");
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query(sql);
      console.log("✅ Schema created successfully via direct connection!");
    } catch (err: any) {
      console.error("❌ Failed:", err.message);
      throw err;
    } finally {
      await client.end();
    }
  } else {
    console.log("✅ Schema created successfully!");
  }

  // Verify tables were created
  console.log("\n🔍 Verifying tables...");
  const tables = ["clients", "orders", "invoices", "measurements"];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: exists (${count ?? 0} rows)`);
    }
  }

  console.log("\n✅ Supabase schema setup complete!");
}

setupSchema().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
