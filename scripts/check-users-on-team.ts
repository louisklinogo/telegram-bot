import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const reg = await client.query<{ to_regclass: string | null }>(
      "select to_regclass('public.users_on_team')"
    );
    console.log("users_on_team regclass:", reg.rows[0]?.to_regclass || null);

    const cols = await client.query(
      `select column_name, data_type from information_schema.columns where table_schema='public' and table_name='users_on_team' order by ordinal_position`
    );
    console.log("users_on_team columns:");
    for (const r of cols.rows) console.log(` - ${r.column_name} :: ${r.data_type}`);

    const sample = await client.query("select * from public.users_on_team limit 3");
    console.log("sample rows:", sample.rowCount);
  } catch (e) {
    console.error("check failed:", e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
