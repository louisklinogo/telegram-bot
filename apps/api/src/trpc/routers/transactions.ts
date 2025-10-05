import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getTransactionsWithClient,
  getTransactionStats,
  getTransactionsEnriched,
  searchTransactions,
  updateTransactionsBulk,
  softDeleteTransactionsBulk,
} from "@cimantikos/database/queries";
import { invoices, transactions, transactionAllocations, financialAccounts, transactionCategories, transactionAttachments, usersOnTeam, users } from "@cimantikos/database/schema";
import { and, eq } from "drizzle-orm";

export const transactionsRouter = createTRPCRouter({
  // Unified create mutation (discriminated union)
  create: teamProcedure
    .input(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("payment"),
          amount: z.number().positive(),
          currency: z.string().min(3).max(3).default("GHS"),
          description: z.string().optional(),
          clientId: z.string().uuid().optional(),
          orderId: z.string().uuid().optional(),
          invoiceId: z.string().uuid().optional(),
          paymentMethod: z.string().optional(),
          paymentReference: z.string().optional(),
          transactionDate: z.string().datetime().optional(),
          excludeFromAnalytics: z.boolean().optional(),
          attachments: z
            .array(
              z.object({
                path: z.string(),
                filename: z.string().optional(),
                contentType: z.string().nullable().optional(),
                size: z.number().nullable().optional(),
                type: z.string().optional(),
                checksum: z.string().optional(),
              })
            )
            .optional(),
        }),
        z.object({
          kind: z.literal("entry"),
          type: z.enum(["payment", "expense", "refund", "adjustment"]).default("expense"),
          amount: z.number().positive(),
          currency: z.string().min(3).max(3).default("GHS"),
          description: z.string().min(1),
          date: z.string().optional(),
          accountId: z.string().uuid().optional(),
          categorySlug: z.string().optional(),
          assignedId: z.string().uuid().optional(),
          clientId: z.string().uuid().optional(),
          orderId: z.string().uuid().optional(),
          paymentMethod: z.string().optional(),
          paymentReference: z.string().optional(),
          notes: z.string().optional(),
          excludeFromAnalytics: z.boolean().optional(),
          attachments: z
            .array(
              z.object({
                path: z.string(),
                filename: z.string().optional(),
                contentType: z.string().nullable().optional(),
                size: z.number().nullable().optional(),
                type: z.string().optional(),
                checksum: z.string().optional(),
              })
            )
            .optional(),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      if (input.kind === "payment") {
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
            excludeFromAnalytics: input.excludeFromAnalytics ?? false,
          })
          .returning();

        if (input.invoiceId) {
          const inv = await ctx.db
            .select({ id: invoices.id })
            .from(invoices)
            .where(and(eq(invoices.id, input.invoiceId), eq(invoices.teamId, ctx.teamId)))
            .limit(1);
          if (!inv[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid invoice" });
          await ctx.db.insert(transactionAllocations).values({
            transactionId: created.id,
            invoiceId: input.invoiceId,
            amount: input.amount as any,
          });
        }

        if (input.attachments && input.attachments.length > 0) {
          const rows = input.attachments.map((a) => ({
            teamId: ctx.teamId,
            transactionId: created.id,
            name: a.filename ?? a.path.split("/").pop() ?? "file",
            path: a.path.split("/"),
            type: a.type ?? null,
            mimeType: (a.contentType ?? null) as any,
            size: (a.size as any) ?? null,
            checksum: a.checksum ?? null,
            uploadedBy: ctx.userId ?? null,
          }));
          await ctx.db.insert(transactionAttachments).values(rows);
        }

        return created;
      }

      // kind === 'entry'
      const trxNumber = `TX-${Date.now()}`;
      const today = new Date();
      const dateOnly = input.date ?? today.toISOString().slice(0, 10);

      const [created] = await ctx.db
        .insert(transactions)
        .values({
          teamId: ctx.teamId,
          date: dateOnly as any,
          name: input.description,
          description: input.description,
          internalId: trxNumber,
          transactionNumber: trxNumber,
          type: input.type,
          status: "completed",
          amount: input.amount as any,
          currency: input.currency,
          clientId: input.clientId ?? null,
          orderId: input.orderId ?? null,
          paymentMethod: input.paymentMethod ?? null,
          paymentReference: input.paymentReference ?? null,
          notes: input.notes ?? null,
          categorySlug: input.categorySlug ?? null,
          assignedId: input.assignedId ?? null,
          accountId: input.accountId ?? null,
          manual: true,
          transactionDate: today,
          excludeFromAnalytics: input.excludeFromAnalytics ?? false,
        })
        .returning();

      if (input.attachments && input.attachments.length > 0) {
        const rows = input.attachments.map((a) => ({
          teamId: ctx.teamId,
          transactionId: created.id,
          name: a.filename ?? a.path.split("/").pop() ?? "file",
          path: a.path.split("/"),
          type: a.type ?? null,
          mimeType: (a.contentType ?? null) as any,
          size: (a.size as any) ?? null,
          checksum: a.checksum ?? null,
          uploadedBy: ctx.userId ?? null,
        }));
        await ctx.db.insert(transactionAttachments).values(rows);
      }

      return created;
    }),
  // List financial accounts for selection in UI
  accounts: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency })
      .from(financialAccounts)
      .where(eq(financialAccounts.teamId, ctx.teamId));
    return rows;
  }),

  // Create financial account inline from UI
  accountsCreate: teamProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["cash", "bank", "mobile_money", "card", "other"]).default("cash"),
        currency: z.string().min(3).max(3).default("GHS"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(financialAccounts)
        .values({
          teamId: ctx.teamId,
          name: input.name,
          type: input.type,
          currency: input.currency,
          status: "active",
        })
        .returning({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency });
      return created;
    }),

  // List categories (flat) for selection in UI
  categories: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ slug: transactionCategories.slug, name: transactionCategories.name, color: transactionCategories.color })
      .from(transactionCategories)
      .where(eq(transactionCategories.teamId, ctx.teamId));
    return rows;
  }),
  // Team members for assignment (id, name, email)
  members: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: users.id, name: users.fullName, email: users.email })
      .from(usersOnTeam)
      .leftJoin(users, eq(usersOnTeam.userId, users.id))
      .where(eq(usersOnTeam.teamId, ctx.teamId));
    return rows.filter((r) => r.id);
  }),

  // Enriched list with filters, tags, attachments count, pagination cursor
  enrichedList: teamProcedure
    .input(
      z
        .object({
          type: z.enum(["payment", "expense", "refund", "adjustment"]).optional(),
          status: z.array(z.enum(["pending", "completed", "failed", "cancelled"]) ).optional(),
          categories: z.array(z.string()).optional(),
          tags: z.array(z.string().uuid()).optional(),
          assignedId: z.string().uuid().optional(),
          search: z.string().min(1).optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          hasAttachments: z.boolean().optional(),
          accounts: z.array(z.string().uuid()).optional(),
          amountMin: z.number().optional(),
          amountMax: z.number().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z
            .object({ date: z.string().nullable(), id: z.string() })
            .nullish(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const rows = await getTransactionsEnriched(ctx.db, {
        teamId: ctx.teamId,
        type: input?.type,
        status: input?.status,
        categories: input?.categories,
        tags: input?.tags,
        assignedId: input?.assignedId,
        search: input?.search,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        hasAttachments: input?.hasAttachments,
        accounts: input?.accounts,
        amountMin: input?.amountMin,
        amountMax: input?.amountMax,
        limit: input?.limit,
        cursor: input?.cursor
          ? {
              date: input.cursor.date ? new Date(input.cursor.date) : null,
              id: input.cursor.id,
            }
          : null,
      });

      const last = rows.at(-1);
      const nextCursor = last
        ? { date: last.transaction.date ? new Date(last.transaction.date).toISOString() : null, id: last.transaction.id }
        : null;
      return { items: rows, nextCursor };
    }),

  // FTS search using fts_vector
  search: teamProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await searchTransactions(ctx.db, { teamId: ctx.teamId, query: input.query, limit: input.limit });
      return rows;
    }),

  // Bulk update
  bulkUpdate: teamProcedure
    .input(
      z.object({
        transactionIds: z.array(z.string().uuid()).min(1),
        updates: z.object({
          categorySlug: z.string().optional(),
          status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
          assignedId: z.string().uuid().nullable().optional(),
          recurring: z.boolean().optional(),
          frequency: z
            .enum(["weekly", "biweekly", "monthly", "semi_monthly", "annually", "irregular"]) // matches enum
            .nullable()
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateTransactionsBulk(ctx.db, {
        teamId: ctx.teamId,
        transactionIds: input.transactionIds,
        updates: input.updates,
      });
      return { count: updated.length };
    }),

  // Bulk soft delete (manual only)
  bulkDelete: teamProcedure
    .input(z.object({ transactionIds: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const res = await softDeleteTransactionsBulk(ctx.db, {
        teamId: ctx.teamId,
        transactionIds: input.transactionIds,
      });
      return res;
    }),

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
        excludeFromAnalytics: z.boolean().optional(),
        attachments: z
          .array(
            z.object({
              path: z.string(),
              filename: z.string().optional(),
              contentType: z.string().nullable().optional(),
              size: z.number().nullable().optional(),
              type: z.string().optional(),
              checksum: z.string().optional(),
            })
          )
          .optional(),
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
          excludeFromAnalytics: input.excludeFromAnalytics ?? false,
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

      // Optional attachments
      if (input.attachments && input.attachments.length > 0) {
        const rows = input.attachments.map((a) => ({
          teamId: ctx.teamId,
          transactionId: created.id,
          name: a.filename ?? a.path.split("/").pop() ?? "file",
          path: a.path.split("/"),
          type: a.type ?? null,
          mimeType: (a.contentType ?? null) as any,
          size: (a.size as any) ?? null,
          checksum: a.checksum ?? null,
          uploadedBy: ctx.userId ?? null,
        }));
        await ctx.db.insert(transactionAttachments).values(rows);
      }

      return created;
    }),

  // Create a manual transaction (non-payment types or payments without allocation)
  createManual: teamProcedure
    .input(
      z.object({
        type: z.enum(["payment", "expense", "refund", "adjustment"]),
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).default("GHS"),
        description: z.string().min(1),
        date: z.string().optional(),
        accountId: z.string().uuid().optional(),
        categorySlug: z.string().optional(),
        assignedId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        notes: z.string().optional(),
        excludeFromAnalytics: z.boolean().optional(),
        attachments: z
          .array(
            z.object({
              path: z.string(),
              filename: z.string().optional(),
              contentType: z.string().nullable().optional(),
              size: z.number().nullable().optional(),
              type: z.string().optional(),
              checksum: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trxNumber = `TX-${Date.now()}`;
      const today = new Date();
      const dateOnly = input.date ?? today.toISOString().slice(0, 10);

      const [created] = await ctx.db
        .insert(transactions)
        .values({
          teamId: ctx.teamId,
          date: dateOnly as any,
          name: input.description,
          description: input.description,
          internalId: trxNumber,
          transactionNumber: trxNumber,
          type: input.type,
          status: "completed",
          amount: input.amount as any,
          currency: input.currency,
          clientId: input.clientId ?? null,
          orderId: input.orderId ?? null,
          paymentMethod: input.paymentMethod ?? null,
          paymentReference: input.paymentReference ?? null,
          notes: input.notes ?? null,
          categorySlug: input.categorySlug ?? null,
          assignedId: input.assignedId ?? null,
          accountId: input.accountId ?? null,
          manual: true,
          transactionDate: today,
          excludeFromAnalytics: input.excludeFromAnalytics ?? false,
        })
        .returning();

      if (input.attachments && input.attachments.length > 0) {
        const rows = input.attachments.map((a) => ({
          teamId: ctx.teamId,
          transactionId: created.id,
          name: a.filename ?? a.path.split("/").pop() ?? "file",
          path: a.path.split("/"),
          type: a.type ?? null,
          mimeType: (a.contentType ?? null) as any,
          size: (a.size as any) ?? null,
          checksum: a.checksum ?? null,
          uploadedBy: ctx.userId ?? null,
        }));
        await ctx.db.insert(transactionAttachments).values(rows);
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
