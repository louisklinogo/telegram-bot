import "dotenv/config";
import { db } from "@Faworra/database/client";
import { users, teams } from "@Faworra/database/schema";
import { eq } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ id: users.id, email: users.email, currentTeamId: users.currentTeamId })
    .from(users);
  console.table(rows);
  for (const u of rows) {
    if (u.currentTeamId) {
      const [team] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, u.currentTeamId));
      console.log(`User ${u.email} current team: ${team?.id} ${team?.name ?? "(no name)"}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
