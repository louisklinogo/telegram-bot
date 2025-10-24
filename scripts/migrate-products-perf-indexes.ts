import { Client } from "pg";
import fs from "fs";
import path from "path";

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
    const sqlFile = path.resolve(process.cwd(), "drizzle", "manual-migrations", "0031_products_perf_indexes.sql");
    const content = fs.readFileSync(sqlFile, "utf8");
    await client.query(content);
    await client.query("COMMIT");
    console.log("Products performance indexes migration applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
