import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@cimantikos/supabase/server";
import { db } from "@/lib/trpc/server";
import { usersOnTeam, users } from "@cimantikos/database/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.redirect(new URL("/login", url.origin));
  const userId = session.user.id;

  // Ensure membership
  const rows = await db
    .select({ teamId: usersOnTeam.teamId })
    .from(usersOnTeam)
    .where(and(eq(usersOnTeam.userId, userId), eq(usersOnTeam.teamId, teamId)))
    .limit(1);
  if (!rows.length) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await db.update(users).set({ currentTeamId: teamId }).where(eq(users.id, userId));

  return NextResponse.redirect(new URL("/", url.origin));
}
