import { createTRPCRouter, teamProcedure } from "../init";
import { z } from "zod";
import { getTeamAccounts, getThreadsByStatus } from "@Faworra/database/queries";

export const communicationsRouter = createTRPCRouter({
  accounts: teamProcedure.query(async ({ ctx }) => {
    const rows = await getTeamAccounts(ctx.db, ctx.teamId);
    return rows.map((r: any) => ({ id: r.id, provider: r.provider, externalId: r.externalId }));
  }),
  threadsByStatus: teamProcedure
    .input(
      z.object({
        status: z.enum(["open", "pending", "resolved", "snoozed"]).default("open"),
        limit: z.number().int().min(1).max(100).optional().default(50),
        cursor: z
          .object({ lastMessageAt: z.string().nullable(), id: z.string() })
          .nullable()
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const rows = await getThreadsByStatus(ctx.db, {
        teamId: ctx.teamId,
        status: input.status,
        limit: input.limit ?? 50,
        cursor: input.cursor
          ? {
              lastMessageAt: input.cursor.lastMessageAt
                ? new Date(input.cursor.lastMessageAt)
                : null,
              id: input.cursor.id,
            }
          : null,
      });

      const items = rows.map((r: any) => ({
        id: r.thread.id,
        externalContactId: r.thread.externalContactId,
        lastMessageAt: r.thread.lastMessageAt,
        status: r.thread.status,
        account: { provider: r.account?.provider },
        contact: r.client
          ? { id: r.client.id, name: r.client.name, whatsapp: r.client.whatsapp }
          : null,
      }));

      const last = items.at(-1) || null;
      const nextCursor = last
        ? {
            lastMessageAt: last.lastMessageAt ? new Date(last.lastMessageAt).toISOString() : null,
            id: last.id,
          }
        : null;

      return { status: input.status, items, nextCursor };
    }),
});
