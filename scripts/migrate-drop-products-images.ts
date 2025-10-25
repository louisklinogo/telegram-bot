import fs from "fs";
import path from "path";
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
    const sqlFile = path.resolve(
      process.cwd(),
      "drizzle",
      "manual-migrations",
      "0028_drop_products_images.sql"
    );
    const content = fs.readFileSync(sqlFile, "utf8");
    await client.query(content);
    await client.query("COMMIT");
    console.log("Dropped products.images column.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
