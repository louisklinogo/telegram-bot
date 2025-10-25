import {
  createMessage,
  getTeamAccounts,
  getThreadMessages,
  getThreadsByStatus,
} from "@Faworra/database/queries";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

export const communicationsRouter = createTRPCRouter({
  accounts: teamProcedure.query(async ({ ctx }) => {
    const rows = await getTeamAccounts(ctx.db, ctx.teamId);
    return rows.map((r: any) => ({
      id: r.id,
      provider: r.provider,
      externalId: r.externalId,
      displayName: r.displayName,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }),
  disconnect: teamProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement disconnect logic (invalidate session, clean up credentials)
      return { success: true };
    }),
  reconnect: teamProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement reconnect logic (refresh session/credentials)
      return { success: true };
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
      })
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
        lead: r.lead
          ? {
              id: r.lead.id,
              status: r.lead.status,
              score: r.lead.score,
              qualification: r.lead.qualification,
            }
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
  messages: createTRPCRouter({
    list: teamProcedure
      .input(
        z.object({
          threadId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
      )
      .query(async ({ input, ctx }) => {
        const messages = await getThreadMessages(ctx.db, input.threadId, ctx.teamId, input.limit);
        return messages.map((m: any) => ({
          id: m.id,
          threadId: m.threadId,
          direction: m.direction,
          type: m.type,
          content: m.content,
          createdAt: m.createdAt,
          deliveredAt: m.deliveredAt,
          readAt: m.readAt,
          status: m.status,
        }));
      }),
    send: teamProcedure
      .input(
        z.object({
          threadId: z.string().uuid(),
          text: z.string().min(1).max(4096),
          clientMessageId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const message = await createMessage(ctx.db, {
          id: undefined,
          threadId: input.threadId,
          teamId: ctx.teamId,
          direction: "out",
          type: "text",
          content: input.text,
          clientMessageId: input.clientMessageId,
          status: "queued",
        });
        return message;
      }),
  }),
});
