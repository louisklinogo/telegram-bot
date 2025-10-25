import "dotenv/config";
import { db } from "@Faworra/database/client";
import { seedCategoryHierarchy } from "@Faworra/database/queries/transaction-categories";
import { teams, users } from "@Faworra/database/schema";

async function main() {
  // Prefer current user's team if available; fallback to first team
  const [user] = await db
    .select({ id: users.id, currentTeamId: users.currentTeamId })
    .from(users)
    .limit(1);
  let teamId = user?.currentTeamId as string | null | undefined;
  if (!teamId) {
    const [team] = await db.select({ id: teams.id }).from(teams).limit(1);
    teamId = team?.id as string | undefined;
  }
  if (!teamId) {
    console.error("No team found. Create a team first.");
    process.exit(1);
  }

  const result = await seedCategoryHierarchy(db, teamId);
  const count = Array.isArray(result) ? result.length : 0;
  console.log(`Seeded/updated category hierarchy for team ${teamId}. Root count: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
