import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "../init";
import { and, eq } from "@Faworra/database/schema";
import { transactions, tags, transactionTags } from "@Faworra/database/schema";

export const transactionTagsRouter = createTRPCRouter({
  add: teamProcedure
    .input(z.object({ transactionId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [tx] = await ctx.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.teamId, ctx.teamId)))
        .limit(1);
      if (!tx) throw new TRPCError({ code: "FORBIDDEN", message: "Transaction not found" });

      const [tg] = await ctx.db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, input.tagId), eq(tags.teamId, ctx.teamId)))
        .limit(1);
      if (!tg) throw new TRPCError({ code: "FORBIDDEN", message: "Tag not found" });

      await ctx.db
        .insert(transactionTags)
        .values({ teamId: ctx.teamId, transactionId: input.transactionId, tagId: input.tagId })
        .onConflictDoNothing();

      return { ok: true } as const;
    }),

  remove: teamProcedure
    .input(z.object({ transactionId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(transactionTags)
        .where(
          and(
            eq(transactionTags.teamId, ctx.teamId),
            eq(transactionTags.transactionId, input.transactionId),
            eq(transactionTags.tagId, input.tagId),
          ),
        );
      return { ok: true } as const;
    }),
});
