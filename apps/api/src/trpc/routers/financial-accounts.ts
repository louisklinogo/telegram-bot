import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getFinancialAccounts,
  getFinancialAccountById,
  createFinancialAccount,
  updateFinancialAccount,
} from "@Faworra/database/queries";
import { activities } from "@Faworra/database/schema";

const createSchema = z.object({
  type: z.enum(["cash", "bank", "mobile_money", "card", "other"]),
  name: z.string().min(1).max(255),
  currency: z.string().length(3).optional().default("GHS"),
  provider: z.string().optional(),
  externalId: z.string().optional(),
  openingBalance: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  openingBalance: z.string().nullable().optional(),
});

export const financialAccountsRouter = createTRPCRouter({
  list: teamProcedure.query(async ({ ctx }) => {
    return getFinancialAccounts(ctx.db, { teamId: ctx.teamId });
  }),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getFinancialAccountById(ctx.db, ctx.teamId, input.id);
    }),

  create: teamProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await createFinancialAccount(ctx.db, { teamId: ctx.teamId, ...input });
      
      // Activity log
      await ctx.db.insert(activities).values({
        teamId: ctx.teamId,
        userId: ctx.userId,
        type: "financial_account.create",
        metadata: {
          id: row.id,
          name: row.name,
          type: row.type,
          currency: row.currency,
        } as any,
      });
      
      return row;
    }),

  update: teamProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const row = await updateFinancialAccount(ctx.db, ctx.teamId, { id, ...data });
      
      // Activity log
      await ctx.db.insert(activities).values({
        teamId: ctx.teamId,
        userId: ctx.userId,
        type: "financial_account.update",
        metadata: {
          id: row?.id,
          name: row?.name,
          status: row?.status,
        } as any,
      });
      
      return row;
    }),
});
