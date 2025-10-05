import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { db } from "@cimantikos/database/client";
import { createClient } from "../services/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Session = {
  userId: string;
  teamId?: string;
  email?: string;
} | null;

export type TRPCContext = {
  session: Session;
  teamId?: string;
  userId?: string;
  db: typeof db;
  supabase: SupabaseClient;
};

export async function createTRPCContext(opts?: FetchCreateContextFnOptions): Promise<TRPCContext> {
  const authHeader = opts?.req?.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
  const supabase = createClient();

  // Try to authenticate via token without relying on cookies
  let session: Session = null;
  if (token) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (!error && user) {
        const userRecord = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, user.id),
        });
        session = {
          userId: user.id,
          email: user.email,
          teamId: userRecord?.currentTeamId || undefined,
        };
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  }

  return {
    session,
    teamId: session?.teamId,
    userId: session?.userId,
    supabase,
    db,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

export const teamProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.teamId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No team selected. Please select a team first.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      teamId: ctx.teamId,
    },
  });
});
