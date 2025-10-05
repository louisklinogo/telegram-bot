import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "../init";
import { getTransactionsWithClient, getTransactionStats } from "@cimantikos/database/queries";
import { invoices, transactions, transactionAllocations } from "@cimantikos/database/schema";
import { and, eq } from "drizzle-orm";

export const transactionsRouter = createTRPCRouter({
  createPayment: teamProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).default("GHS"),
        description: z.string().optional(),
        clientId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
        invoiceId: z.string().uuid().optional(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        transactionDate: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trxNumber = `TX-${Date.now()}`;
      const [created] = await ctx.db
        .insert(transactions)
        .values({
          teamId: ctx.teamId,
          date: new Date().toISOString().slice(0, 10),
          name: input.description ?? `Payment ${trxNumber}`,
          internalId: trxNumber,
          transactionNumber: trxNumber,
          type: "payment",
          status: "completed",
          amount: input.amount as any,
          currency: input.currency,
          description: input.description ?? `Payment ${trxNumber}`,
          clientId: input.clientId ?? null,
          orderId: input.orderId ?? null,
          invoiceId: input.invoiceId ?? null,
          paymentMethod: input.paymentMethod ?? null,
          paymentReference: input.paymentReference ?? null,
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        })
        .returning();

      if (input.invoiceId) {
        // Verify invoice belongs to team, then allocate full amount
        const inv = await ctx.db
          .select({ id: invoices.id })
          .from(invoices)
          .where(and(eq(invoices.id, input.invoiceId), eq(invoices.teamId, ctx.teamId)))
          .limit(1);
        if (!inv[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid invoice" });
        await ctx.db
          .insert(transactionAllocations)
          .values({
            transactionId: created.id,
            invoiceId: input.invoiceId,
            amount: input.amount as any,
          })
          .returning();
      }

      return created;
    }),

  list: teamProcedure
    .input(
      z
        .object({
          type: z.enum(["payment", "expense", "refund", "adjustment"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.object({ transactionDate: z.string().nullable(), id: z.string() }).nullish(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await getTransactionsWithClient(ctx.db, {
        teamId: ctx.teamId,
        type: input?.type,
        limit: input?.limit,
        cursor: input?.cursor
          ? {
              transactionDate: input.cursor.transactionDate
                ? new Date(input.cursor.transactionDate)
                : null,
              id: input.cursor.id,
            }
          : null,
      });
      const items = rows;
      const last = items.at(-1) as any | undefined;
      const nextCursor = last
        ? {
            transactionDate: last?.trx?.transactionDate
              ? new Date(last.trx.transactionDate).toISOString()
              : null,
            id: last?.trx?.id,
          }
        : null;
      return { items, nextCursor };
    }),

  stats: teamProcedure.query(async ({ ctx }) => {
    return getTransactionStats(ctx.db, ctx.teamId);
  }),

  allocationsByInvoice: teamProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // join allocations -> transactions for display
      const rows = await ctx.db
        .select({
          id: transactionAllocations.id,
          amount: transactionAllocations.amount,
          createdAt: transactionAllocations.createdAt,
          transactionNumber: transactions.transactionNumber,
          transactionDate: transactions.transactionDate,
        })
        .from(transactionAllocations)
        .leftJoin(transactions, eq(transactionAllocations.transactionId, transactions.id))
        .where(and(eq(transactionAllocations.invoiceId, input.invoiceId), eq(transactions.teamId, ctx.teamId)));

      return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        created_at: r.createdAt,
        transaction: {
          transaction_number: r.transactionNumber,
          transaction_date: r.transactionDate,
        },
      }));
    }),

  deleteAllocation: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // ensure allocation belongs to this team via transaction join
      const own = await ctx.db
        .select({ id: transactionAllocations.id })
        .from(transactionAllocations)
        .leftJoin(transactions, eq(transactionAllocations.transactionId, transactions.id))
        .where(and(eq(transactionAllocations.id, input.id), eq(transactions.teamId, ctx.teamId)))
        .limit(1);
      if (!own[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid allocation" });
      await ctx.db.delete(transactionAllocations).where(eq(transactionAllocations.id, input.id));
      return { success: true };
    }),

  allocate: teamProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        invoiceId: z.string().uuid(),
        amount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to team
      const trx = await ctx.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.teamId, ctx.teamId)))
        .limit(1);
      if (!trx[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid transaction" });

      // Verify invoice belongs to team
      const inv = await ctx.db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.id, input.invoiceId), eq(invoices.teamId, ctx.teamId)))
        .limit(1);
      if (!inv[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid invoice" });

      const inserted = await ctx.db
        .insert(transactionAllocations)
        .values({
          transactionId: input.transactionId,
          invoiceId: input.invoiceId,
          amount: input.amount as any,
        })
        .returning();

      return inserted[0];
    }),
});
