import { and, eq, users, usersOnTeam } from "@Faworra/database/schema";
import { createServerClient } from "@Faworra/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/trpc/server";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  // Ensure membership
  const rows = await db
    .select({ teamId: usersOnTeam.teamId })
    .from(usersOnTeam)
    .where(and(eq(usersOnTeam.userId, user.id), eq(usersOnTeam.teamId, teamId)))
    .limit(1);
  if (!rows.length) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await db.update(users).set({ currentTeamId: teamId }).where(eq(users.id, user.id));

  return NextResponse.redirect(new URL("/", url.origin));
}
