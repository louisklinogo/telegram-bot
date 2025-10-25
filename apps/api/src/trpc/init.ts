import { db } from "@Faworra/database/client";
import { getRequestContext, runWithRequestContext } from "@Faworra/database/request-context";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import baseLogger from "../lib/logger";
import { createClient } from "../services/supabase";
import { BEARER_PREFIX, DEFAULT_SLOW_MS, REQ_ID_RADIX } from "../lib/http";

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
  const token = authHeader?.startsWith(BEARER_PREFIX)
    ? authHeader.substring(BEARER_PREFIX.length)
    : undefined;
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
      baseLogger.error({ err: error }, "trpc auth error");
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

// Timing middleware (production safe, env-gated)
const timing = t.middleware(async ({ path, type, next }) => {
  const enable = process.env.TRPC_TIMING === "1";
  if (!enable) {
    return next();
  }
  const reqId = Math.random().toString(REQ_ID_RADIX).slice(2);
  const start = Date.now();
  return await runWithRequestContext(
    { reqId, procedure: `${type}:${path}`, startAt: start },
    async () => {
      const result = await next();
      const ms = Date.now() - start;
      const ctx = getRequestContext();
      const q = ctx?.queryCount ?? 0;
      const threshold = Number(process.env.SLOW_PROCEDURE_MS ?? DEFAULT_SLOW_MS);
      if (ms >= threshold) {
        baseLogger.warn({ ms, type, path, queries: q }, "trpc slow procedure");
      } else if (process.env.TRPC_LOG_ALL === "1") {
        baseLogger.info({ ms, type, path, queries: q }, "trpc procedure");
      }
      return result;
    }
  );
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(timing).use(({ ctx, next }) => {
  if (!(ctx.session && ctx.userId)) {
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

export const teamProcedure = protectedProcedure.use(({ ctx, next }) => {
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
