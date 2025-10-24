import "dotenv/config";
import { db } from "@Faworra/database/client";
import { transactionCategories, teams } from "@Faworra/database/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
  const [team] = await db.select({ id: teams.id }).from(teams).limit(1);
  if (!team) throw new Error("No team found");
  const rows = await db
    .select({ id: transactionCategories.id, name: transactionCategories.name, slug: transactionCategories.slug, parentId: transactionCategories.parentId, system: transactionCategories.system })
    .from(transactionCategories)
    .where(eq(transactionCategories.teamId, team.id))
    .orderBy(desc(transactionCategories.system), transactionCategories.name);
  console.table(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
