import { Client } from "pg";

async function main() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing SUPABASE_DB_URL or DATABASE_URL");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const idxName = "idx_comm_threads_pagination";
    const existsRes = await client.query(
      `select 1 from pg_indexes where schemaname='public' and tablename='communication_threads' and indexname=$1`,
      [idxName],
    );
    if (existsRes.rowCount && existsRes.rowCount > 0) {
      console.log(`Index ${idxName} already exists.`);
      return;
    }
    console.log(`Creating index ${idxName} on communication_threads...`);
    await client.query(
      `CREATE INDEX CONCURRENTLY ${idxName}
       ON public.communication_threads (team_id, status, last_message_at DESC, id DESC)`,
    );
    console.log("Index created. Verifying...");
    const verify = await client.query(
      `select indexname, indexdef from pg_indexes where schemaname='public' and tablename='communication_threads' and indexname=$1`,
      [idxName],
    );
    console.log(verify.rows[0] || "not found");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
