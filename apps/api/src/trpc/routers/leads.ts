import {
  createLeadFromThread,
  getLead,
  getLeadByThread,
  listLeads,
  recomputeLeadScore,
  setLeadClient,
  updateLeadStatus,
} from "@Faworra/database/queries/leads";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

export const leadsRouter = createTRPCRouter({
  byThread: teamProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(
      async ({ ctx, input }) =>
        await getLeadByThread(ctx.db, { teamId: ctx.teamId!, threadId: input.threadId })
    ),

  get: teamProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(
      async ({ ctx, input }) => await getLead(ctx.db, { teamId: ctx.teamId!, leadId: input.leadId })
    ),
  createFromThread: teamProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        manualScore: z.number().int().min(0).max(100).optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await createLeadFromThread(ctx.db, {
        teamId: ctx.teamId!,
        threadId: input.threadId,
        ownerUserId: ctx.userId,
        manualScore: input.manualScore,
        notes: input.notes,
      });
      return lead;
    }),

  list: teamProcedure
    .input(
      z.object({
        status: z
          .enum(["new", "interested", "qualified", "converted", "lost", "all"])
          .default("all"),
        minScore: z.number().int().min(0).max(100).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
        cursor: z
          .object({ updatedAt: z.string().nullable(), id: z.string().uuid() })
          .nullable()
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const res = await listLeads(ctx.db, {
        teamId: ctx.teamId!,
        status: input.status,
        minScore: input.minScore,
        limit: input.limit,
        cursor: input.cursor
          ? {
              updatedAt: input.cursor.updatedAt ? new Date(input.cursor.updatedAt) : null,
              id: input.cursor.id,
            }
          : null,
      });
      return res;
    }),

  updateStatus: teamProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        status: z.enum(["new", "interested", "qualified", "converted", "lost"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await updateLeadStatus(ctx.db, {
        teamId: ctx.teamId!,
        leadId: input.leadId,
        status: input.status,
      });
      return row;
    }),

  convert: teamProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        clientId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await setLeadClient(ctx.db, {
        teamId: ctx.teamId!,
        leadId: input.leadId,
        clientId: input.clientId,
      });
      return row;
    }),
  recompute: teamProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await recomputeLeadScore(ctx.db, { teamId: ctx.teamId!, leadId: input.leadId });
      return row;
    }),
});
