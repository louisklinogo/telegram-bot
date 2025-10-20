import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/trpc/server";
import { db } from "@/lib/trpc/server";
import { usersOnTeam, teams } from "@Faworra/database/schema";
import { eq } from "@Faworra/database/schema";
import Link from "next/link";

async function getUserTeams(userId: string) {
  const rows = await db
    .select({ id: teams.id, name: teams.name })
    .from(usersOnTeam)
    .leftJoin(teams, eq(usersOnTeam.teamId, teams.id))
    .where(eq(usersOnTeam.userId, userId));
  return rows.filter((r) => r.id);
}

export default async function TeamsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const myTeams = await getUserTeams(userId);
  if (!myTeams.length) redirect("/teams/create");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select a team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myTeams.map((t) => (
              <form action={`/api/teams/launch?teamId=${t.id}`} method="post" key={t.id}>
                <div className="flex items-center justify-between border rounded p-2">
                  <span>{t.name || t.id}</span>
                  <Button type="submit" variant="outline" size="sm">
                    Launch
                  </Button>
                </div>
              </form>
            ))}
            <div className="text-center pt-4 border-t mt-4">
              <Link href="/teams/create">
                <Button variant="ghost">Create team</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
