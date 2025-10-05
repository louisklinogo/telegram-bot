import { eq } from "drizzle-orm";
import type { DbClient } from "../client";
import { teams, usersOnTeam } from "../schema";

export async function getUserTeams(db: DbClient, userId: string) {
  return await db
    .select({
      team: {
        id: teams.id,
        name: teams.name,
        baseCurrency: teams.baseCurrency,
        country: teams.country,
        timezone: teams.timezone,
        quietHours: teams.quietHours,
        locale: teams.locale,
      },
    })
    .from(usersOnTeam)
    .innerJoin(teams, eq(usersOnTeam.teamId, teams.id))
    .where(eq(usersOnTeam.userId, userId));
}

export async function getTeamById(db: DbClient, teamId: string) {
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      baseCurrency: teams.baseCurrency,
      country: teams.country,
      timezone: teams.timezone,
      quietHours: teams.quietHours,
      locale: teams.locale,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return result[0] || null;
}
