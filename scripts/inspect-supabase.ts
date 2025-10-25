import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing SUPABASE_DB_URL or DATABASE_URL in environment");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const tables = [
      "communication_threads",
      "communication_messages",
      "orders",
      "invoices",
      "transactions",
    ];

    // RLS status
    const rlsRes = await client.query(
      `select c.relname as table, c.relrowsecurity as rls_enabled
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1)`,
      [tables]
    );

    // Policies per table
    const polRes = await client.query(
      `select tab.relname as table, pol.polname as policy_name
       from pg_policy pol
       join pg_class tab on pol.polrelid = tab.oid
       join pg_namespace ns on ns.oid = tab.relnamespace
       where ns.nspname = 'public' and tab.relname = any($1)
       order by tab.relname, pol.polname`,
      [tables]
    );

    // Indexes
    const idxRes = await client.query(
      `select tablename, indexname, indexdef
       from pg_indexes
       where schemaname = 'public' and tablename = any($1)
       order by tablename, indexname`,
      [tables]
    );

    console.log("--- RLS Status ---");
    for (const row of rlsRes.rows) {
      console.log(`${row.table}: ${row.rls_enabled ? "enabled" : "disabled"}`);
    }

    console.log("\n--- Policies ---");
    const byTable: Record<string, string[]> = {};
    for (const row of polRes.rows) {
      byTable[row.table] ||= [];
      byTable[row.table].push(row.policy_name);
    }
    for (const t of tables) {
      const list = byTable[t] || [];
      console.log(`${t}: ${list.length ? list.join(", ") : "(none)"}`);
    }

    console.log("\n--- Indexes ---");
    const idxByTable: Record<string, { name: string; def: string }[]> = {};
    for (const row of idxRes.rows) {
      const arr = idxByTable[row.tablename] || [];
      arr.push({ name: row.indexname, def: row.indexdef });
      idxByTable[row.tablename] = arr;
    }
    for (const t of tables) {
      console.log(`\n[${t}]`);
      const arr = idxByTable[t] || [];
      if (!arr.length) {
        console.log("  (no indexes)");
        continue;
      }
      for (const it of arr) {
        console.log(`  - ${it.name}: ${it.def}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
