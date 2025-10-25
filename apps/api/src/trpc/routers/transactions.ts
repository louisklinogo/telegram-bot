import {
  getRecentTransactionsLite,
  getSpendingByCategory,
  getTransactionById,
  getTransactionStats,
  getTransactionsEnriched,
  getTransactionsWithClient,
  searchTransactions,
  softDeleteTransactionsBulk,
  updateTransactionsBulk,
} from "@Faworra/database/queries";
// Import from database schema barrel to avoid duplicate drizzle-orm type instances
import {
  and,
  eq,
  financialAccounts,
  invoices,
  teams,
  transactionAllocations,
  transactionAttachments,
  transactionCategories,
  transactions,
  transactionTags,
  users,
  usersOnTeam,
} from "@Faworra/database/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

// Internal helpers to deduplicate transaction creation logic
async function insertPaymentWithExtras(
  ctx: any,
  input: {
    amount: number;
    currency: string;
    description?: string;
    clientId?: string | null;
    orderId?: string | null;
    invoiceId?: string | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    transactionDate?: string | Date | null;
    excludeFromAnalytics?: boolean;
    tags?: string[];
    attachments?: Array<{
      path: string;
      filename?: string;
      contentType?: string | null;
      size?: number | null;
      type?: string | null;
      checksum?: string | null;
    }>;
  }
) {
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
      // Payments created via the Transactions form are considered manual entries
      manual: true,
      excludeFromAnalytics: input.excludeFromAnalytics ?? false,
    })
    .returning();

  // Optional invoice allocation (full amount)
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

  // Optional tags
  if (input.tags && input.tags.length) {
    await ctx.db
      .insert(transactionTags)
      .values(
        input.tags.map((tagId) => ({
          teamId: ctx.teamId,
          transactionId: created.id,
          tagId,
        }))
      )
      .onConflictDoNothing();
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
}

async function insertEntryWithExtras(
  ctx: any,
  input: {
    type: "payment" | "expense" | "refund" | "adjustment";
    amount: number;
    currency: string;
    description: string;
    date?: string | null;
    accountId?: string | null;
    categorySlug?: string | null;
    assignedId?: string | null;
    clientId?: string | null;
    orderId?: string | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    notes?: string | null;
    excludeFromAnalytics?: boolean;
    tags?: string[];
    attachments?: Array<{
      path: string;
      filename?: string;
      contentType?: string | null;
      size?: number | null;
      type?: string | null;
      checksum?: string | null;
    }>;
  }
) {
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

  // Optional tags
  if (input.tags && input.tags.length) {
    await ctx.db
      .insert(transactionTags)
      .values(
        input.tags.map((tagId) => ({
          teamId: ctx.teamId,
          transactionId: created.id,
          tagId,
        }))
      )
      .onConflictDoNothing();
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

export const transactionsRouter = createTRPCRouter({
  // Unified create mutation (discriminated union)
  create: teamProcedure
    .input(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("payment"),
          amount: z.number().positive(),
          currency: z.string().min(3).max(3).optional(),
          description: z.string().optional(),
          clientId: z.string().uuid().optional(),
          orderId: z.string().uuid().optional(),
          invoiceId: z.string().uuid().optional(),
          paymentMethod: z.string().optional(),
          paymentReference: z.string().optional(),
          transactionDate: z.string().datetime().optional(),
          excludeFromAnalytics: z.boolean().optional(),
          tags: z.array(z.string().uuid()).optional(),
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
          currency: z.string().min(3).max(3).optional(),
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
          tags: z.array(z.string().uuid()).optional(),
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
      const teamCurrency = async () => {
        const row = await ctx.db
          .select({ baseCurrency: teams.baseCurrency })
          .from(teams)
          .where(eq(teams.id, ctx.teamId!))
          .limit(1);
        return row[0]?.baseCurrency || "GHS";
      };
      if (input.kind === "payment") {
        return insertPaymentWithExtras(ctx, {
          amount: input.amount,
          currency: input.currency ?? (await teamCurrency()),
          description: input.description,
          clientId: input.clientId ?? null,
          orderId: input.orderId ?? null,
          invoiceId: input.invoiceId ?? null,
          paymentMethod: input.paymentMethod ?? null,
          paymentReference: input.paymentReference ?? null,
          transactionDate: input.transactionDate ?? null,
          excludeFromAnalytics: input.excludeFromAnalytics,
          tags: input.tags,
          attachments: input.attachments,
        });
      }

      // kind === 'entry'
      return insertEntryWithExtras(ctx, {
        type: input.type,
        amount: input.amount,
        currency: input.currency ?? (await teamCurrency()),
        description: input.description,
        date: input.date ?? null,
        accountId: input.accountId ?? null,
        categorySlug: input.categorySlug ?? null,
        assignedId: input.assignedId ?? null,
        clientId: input.clientId ?? null,
        orderId: input.orderId ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentReference: input.paymentReference ?? null,
        notes: input.notes ?? null,
        excludeFromAnalytics: input.excludeFromAnalytics,
        tags: input.tags,
        attachments: input.attachments,
      });
    }),
  // List financial accounts for selection in UI
  accounts: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: financialAccounts.id,
        name: financialAccounts.name,
        currency: financialAccounts.currency,
      })
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
        currency: z.string().min(3).max(3).optional(),
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
        .returning({
          id: financialAccounts.id,
          name: financialAccounts.name,
          currency: financialAccounts.currency,
        });
      return created;
    }),

  // Create category
  categoriesCreate: teamProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z
          .string()
          .regex(/^#([0-9a-fA-F]{3}){1,2}$/)
          .optional(),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const toSlug = (s: string) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

      let base = toSlug(input.name);
      if (!base) base = `category-${Date.now()}`;

      // Ensure unique per team by appending numeric suffix
      let slug = base;
      let i = 2;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await ctx.db
          .select({ id: transactionCategories.id })
          .from(transactionCategories)
          .where(
            and(eq(transactionCategories.teamId, ctx.teamId), eq(transactionCategories.slug, slug))
          )
          .limit(1);
        if (!existing[0]) break;
        slug = `${base}-${i++}`;
      }

      const [created] = await ctx.db
        .insert(transactionCategories)
        .values({
          teamId: ctx.teamId,
          name: input.name,
          slug,
          color: input.color ?? null,
          parentId: input.parentId ?? null,
          system: false,
        })
        .returning({
          id: transactionCategories.id,
          name: transactionCategories.name,
          slug: transactionCategories.slug,
          color: transactionCategories.color,
        });

      return created;
    }),

  // List categories (flat) for selection in UI
  categories: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        slug: transactionCategories.slug,
        name: transactionCategories.name,
        color: transactionCategories.color,
      })
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

  // Amount bounds for dynamic slider
  amountBounds: teamProcedure.query(async ({ ctx }) => {
    const { getTransactionAmountBounds } = await import("@Faworra/database/queries");
    return getTransactionAmountBounds(ctx.db, { teamId: ctx.teamId });
  }),

  // Enriched list with filters, tags, attachments count, pagination cursor
  enrichedList: teamProcedure
    .input(
      z
        .object({
          type: z.enum(["payment", "expense", "refund", "adjustment"]).optional(),
          status: z.array(z.enum(["pending", "completed", "failed", "cancelled"])).optional(),
          categories: z.array(z.string()).optional(),
          tags: z.array(z.string().uuid()).optional(),
          assignedId: z.string().uuid().optional(),
          assignees: z.array(z.string().uuid()).optional(),
          isRecurring: z.boolean().optional(),
          search: z.string().min(1).optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          hasAttachments: z.boolean().optional(),
          accounts: z.array(z.string().uuid()).optional(),
          amountMin: z.number().optional(),
          amountMax: z.number().optional(),
          includeTags: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.object({ date: z.string().nullable(), id: z.string() }).nullish(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // DEBUG: log incoming start/end and cursor
      try {
        // eslint-disable-next-line no-console
        console.log("[enrichedList][api] input:", {
          startDate: input?.startDate,
          endDate: input?.endDate,
          cursor: input?.cursor,
        });
      } catch {}
      const rows = await getTransactionsEnriched(ctx.db, {
        teamId: ctx.teamId,
        type: input?.type,
        status: input?.status,
        categories: input?.categories,
        tags: input?.tags,
        assignedId: input?.assignedId,
        assignees: input?.assignees,
        isRecurring: input?.isRecurring,
        search: input?.search,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        hasAttachments: input?.hasAttachments,
        accounts: input?.accounts,
        amountMin: input?.amountMin,
        amountMax: input?.amountMax,
        includeTags: input?.includeTags,
        limit: input?.limit,
        cursor: input?.cursor
          ? {
              date: input.cursor.date ? new Date(input.cursor.date) : null,
              id: input.cursor.id,
            }
          : null,
      });

      const last = rows.at(-1);
      try {
        // eslint-disable-next-line no-console
        console.log("[enrichedList][api] returned:", {
          count: rows.length,
          sample: rows.slice(0, 10).map((r) => r.transaction.date),
        });
      } catch {}
      const nextCursor = last
        ? {
            date: last.transaction.date ? new Date(last.transaction.date).toISOString() : null,
            id: last.transaction.id,
          }
        : null;
      return { items: rows, nextCursor };
    }),

  // AI-like NL to filters parser (rule-based MVP)
  aiParse: teamProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const q = input.query.toLowerCase();
      const out: any = {};

      // type
      if (/\bpayment\b/.test(q)) out.type = "payment";
      else if (/\bexpense\b/.test(q)) out.type = "expense";
      else if (/\brefund\b/.test(q)) out.type = "refund";
      else if (/\badjustment\b/.test(q)) out.type = "adjustment";

      // status[]
      const statuses: string[] = [];
      if (/\bpending\b/.test(q)) statuses.push("pending");
      if (/\bcompleted\b/.test(q)) statuses.push("completed");
      if (/\bfailed\b/.test(q)) statuses.push("failed");
      if (/\bcancelled\b/.test(q)) statuses.push("cancelled");
      if (statuses.length) out.status = statuses as any;

      // attachments
      if (/with attachments?/.test(q)) out.hasAttachments = true;
      if (/without attachments?/.test(q)) out.hasAttachments = false;

      // recurring
      if (/\brecurring\b/.test(q)) out.isRecurring = true;

      // amount range
      const between = q.match(/between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/);
      if (between) {
        out.amountMin = Number(between[1]);
        out.amountMax = Number(between[2]);
      } else {
        const gt = q.match(/(?:>|over|>=|at\s+least)\s+(\d+(?:\.\d+)?)/);
        const lt = q.match(/(?:<|under|<=|at\s+most)\s+(\d+(?:\.\d+)?)/);
        if (gt) out.amountMin = Number(gt[1]);
        if (lt) out.amountMax = Number(lt[1]);
      }

      // date phrases
      const toISO = (d: Date) => d.toISOString();
      const startOfDay = (d: Date) =>
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const endOfDay = (d: Date) =>
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
      const now = new Date();
      if (/today/.test(q)) {
        out.startDate = toISO(startOfDay(now));
        out.endDate = toISO(endOfDay(now));
      } else if (/yesterday/.test(q)) {
        const y = new Date(now.getTime() - 86_400_000);
        out.startDate = toISO(startOfDay(y));
        out.endDate = toISO(endOfDay(y));
      } else if (/last\s+7\s+days/.test(q)) {
        const s = new Date(now.getTime() - 86_400_000 * 6);
        out.startDate = toISO(startOfDay(s));
        out.endDate = toISO(endOfDay(now));
      } else if (/last\s+30\s+days/.test(q)) {
        const s = new Date(now.getTime() - 86_400_000 * 29);
        out.startDate = toISO(startOfDay(s));
        out.endDate = toISO(endOfDay(now));
      } else if (/last\s+week/.test(q)) {
        const s = new Date(now.getTime() - 86_400_000 * 7);
        out.startDate = toISO(startOfDay(s));
        out.endDate = toISO(endOfDay(now));
      } else if (/this\s+month/.test(q)) {
        const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        out.startDate = toISO(s);
        out.endDate = toISO(endOfDay(now));
      } else if (/last\s+month/.test(q)) {
        const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
        out.startDate = toISO(s);
        out.endDate = toISO(e);
      }

      // explicit ISO dates: from YYYY-MM-DD to YYYY-MM-DD
      const range = q.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
      if (range) {
        const s = new Date(range[1] + "T00:00:00Z");
        const e = new Date(range[2] + "T23:59:59Z");
        out.startDate = toISO(s);
        out.endDate = toISO(e);
      }

      return out;
    }),

  // Get single transaction with full details
  byId: teamProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const row = await getTransactionById(ctx.db, { teamId: ctx.teamId, transactionId: input.id });
    return row;
  }),

  // FTS search using fts_vector
  search: teamProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await searchTransactions(ctx.db, {
        teamId: ctx.teamId,
        query: input.query,
        limit: input.limit,
      });
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
          excludeFromAnalytics: z.boolean().optional(),
          notes: z.string().nullable().optional(),
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
        currency: z.string().min(3).max(3).optional(),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db
        .select({ baseCurrency: teams.baseCurrency })
        .from(teams)
        .where(eq(teams.id, ctx.teamId!))
        .limit(1);
      const cur = input.currency ?? row[0]?.baseCurrency ?? "GHS";
      return insertPaymentWithExtras(ctx, {
        amount: input.amount,
        currency: cur,
        description: input.description,
        clientId: input.clientId ?? null,
        orderId: input.orderId ?? null,
        invoiceId: input.invoiceId ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentReference: input.paymentReference ?? null,
        transactionDate: input.transactionDate ?? null,
        excludeFromAnalytics: input.excludeFromAnalytics,
        attachments: input.attachments,
      });
    }),

  // Create a manual transaction (non-payment types or payments without allocation)
  createManual: teamProcedure
    .input(
      z.object({
        type: z.enum(["payment", "expense", "refund", "adjustment"]),
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).optional(),
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
      const row = await ctx.db
        .select({ baseCurrency: teams.baseCurrency })
        .from(teams)
        .where(eq(teams.id, ctx.teamId!))
        .limit(1);
      const cur = input.currency ?? row[0]?.baseCurrency ?? "GHS";
      return insertEntryWithExtras(ctx, {
        type: input.type,
        amount: input.amount,
        currency: cur,
        description: input.description,
        date: input.date ?? null,
        accountId: input.accountId ?? null,
        categorySlug: input.categorySlug ?? null,
        assignedId: input.assignedId ?? null,
        clientId: input.clientId ?? null,
        orderId: input.orderId ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentReference: input.paymentReference ?? null,
        notes: input.notes ?? null,
        excludeFromAnalytics: input.excludeFromAnalytics,
        attachments: input.attachments,
      });
    }),

  list: teamProcedure
    .input(
      z
        .object({
          type: z.enum(["payment", "expense", "refund", "adjustment"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.object({ transactionDate: z.string().nullable(), id: z.string() }).nullish(),
        })
        .optional()
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

  stats: teamProcedure
    .input(
      z
        .object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) =>
      getTransactionStats(ctx.db, {
        teamId: ctx.teamId,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
      })
    ),

  spending: teamProcedure
    .input(
      z
        .object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          limit: z.number().min(1).max(50).default(12),
        })
        .optional()
    )
    .query(async ({ ctx, input }) =>
      getSpendingByCategory(ctx.db, {
        teamId: ctx.teamId,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        limit: input?.limit ?? 12,
      })
    ),

  recentLite: teamProcedure
    .input(
      z
        .object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          limit: z.number().min(1).max(50).default(8),
        })
        .optional()
    )
    .query(async ({ ctx, input }) =>
      getRecentTransactionsLite(ctx.db, {
        teamId: ctx.teamId,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        limit: input?.limit ?? 8,
      })
    ),

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
        .where(
          and(
            eq(transactionAllocations.invoiceId, input.invoiceId),
            eq(transactions.teamId, ctx.teamId)
          )
        );

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
      })
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

  // Attachments: add to existing transaction
  attachmentsAdd: teamProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        attachments: z.array(
          z.object({
            path: z.string(),
            filename: z.string().optional(),
            contentType: z.string().nullable().optional(),
            size: z.number().nullable().optional(),
            type: z.string().optional(),
            checksum: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to team
      const trx = await ctx.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.teamId, ctx.teamId)))
        .limit(1);
      if (!trx[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid transaction" });

      if (!input.attachments.length) return { inserted: 0 };
      const rows = input.attachments.map((a) => ({
        teamId: ctx.teamId,
        transactionId: input.transactionId,
        name: a.filename ?? a.path.split("/").pop() ?? "file",
        path: a.path.split("/"),
        type: a.type ?? null,
        mimeType: (a.contentType ?? null) as any,
        size: (a.size as any) ?? null,
        checksum: a.checksum ?? null,
        uploadedBy: ctx.userId ?? null,
      }));
      const inserted = await ctx.db
        .insert(transactionAttachments)
        .values(rows)
        .returning({ id: transactionAttachments.id });
      return { inserted: inserted.length };
    }),

  // Attachments: remove from existing transaction
  attachmentsRemove: teamProcedure
    .input(z.object({ attachmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure attachment belongs to a transaction in team
      const own = await ctx.db
        .select({ id: transactionAttachments.id })
        .from(transactionAttachments)
        .leftJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
        .where(
          and(
            eq(transactionAttachments.id, input.attachmentId),
            eq(transactions.teamId, ctx.teamId)
          )
        )
        .limit(1);
      if (!own[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid attachment" });
      await ctx.db
        .delete(transactionAttachments)
        .where(eq(transactionAttachments.id, input.attachmentId));
      return { success: true };
    }),
});
