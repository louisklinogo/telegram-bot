import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const userId = process.argv[2] || process.env.TEST_USER_ID;
  if (!userId) {
    console.error("Pass a user id: bun run scripts/test-get-user-teams.ts <uuid>");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const sql = `select teams.id, teams.name, teams.base_currency, teams.country, teams.timezone, teams.quiet_hours, teams.locale
                 from users_on_team
                 inner join teams on users_on_team.team_id = teams.id
                 where users_on_team.user_id = $1`;
    const res = await client.query(sql, [userId]);
    console.log("rows:", res.rows);
  } catch (e) {
    console.error("query failed:", e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
