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
    const files = ["0033_leads.sql", "0034_leads_rls.sql", "0035_leads_triggers.sql", "0036_leads_snapshots.sql"]; 
    for (const f of files) {
      const sqlFile = path.resolve(process.cwd(), "drizzle", "manual-migrations", f);
      console.log(`Applying migration: ${f}`);
      const content = fs.readFileSync(sqlFile, "utf8");
      try {
        await client.query(content);
      } catch (e) {
        console.error(`Failed on ${f}`);
        throw e;
      }
    }
    await client.query("COMMIT");
    console.log("Leads table migration applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
