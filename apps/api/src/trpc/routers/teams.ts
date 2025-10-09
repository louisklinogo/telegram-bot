import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { teams, users, usersOnTeam } from "@cimantikos/database/schema";

export const teamsRouter = createTRPCRouter({
  // List teams for the authenticated user
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: teams.id, name: teams.name })
      .from(usersOnTeam)
      .leftJoin(teams, eq(usersOnTeam.teamId, teams.id))
      .where(eq(usersOnTeam.userId, ctx.userId!));
    return rows.filter((r) => r.id);
  }),

  // Get current team id for the user
  current: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, ctx.userId!),
    });
    return { teamId: row?.currentTeamId ?? null };
  }),

  // Set current team id (only if user is a member)
  setCurrent: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db
        .select({ teamId: usersOnTeam.teamId })
        .from(usersOnTeam)
        .where(and(eq(usersOnTeam.userId, ctx.userId!), eq(usersOnTeam.teamId, input.teamId)))
        .limit(1);
      if (!membership.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this team" });
      }
      await ctx.db
        .update(users)
        .set({ currentTeamId: input.teamId })
        .where(eq(users.id, ctx.userId!));
      return { success: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // ctx.userId is guaranteed by protectedProcedure

      // Create admin Supabase client to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

      // Ensure a user profile row exists (FK required by users_on_team)
      {
        const { error: userUpsertErr } = await supabase
          .from("users")
          .upsert({ id: ctx.userId!, email: ctx.session?.email || null }, { onConflict: "id" });
        if (userUpsertErr) {
          console.error("Upsert user failed:", userUpsertErr.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user profile",
          });
        }
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: input.name,
        })
        .select()
        .single();

      if (teamError) {
        console.error("Error creating team:", teamError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create team",
        });
      }

      // Add user to team as owner
      const { error: memberError } = await supabase.from("users_on_team").insert({
        user_id: ctx.userId,
        team_id: team.id,
        role: "owner",
      });

      if (memberError) {
        console.error("Error adding user to team:", memberError);
        // Try to clean up the team
        await supabase.from("teams").delete().eq("id", team.id);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add user to team",
        });
      }

      // Update user's current_team_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ current_team_id: team.id })
        .eq("id", ctx.userId);

      if (updateError) {
        console.error("Error updating user current_team_id:", updateError);
        // Don't fail the request, user can select team manually
      }

      return {
        success: true,
        team,
      };
    }),
});
