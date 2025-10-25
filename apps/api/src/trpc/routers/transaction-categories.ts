import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getTransactionCategories,
  updateCategory,
} from "@Faworra/database/queries";
import { activities, and, eq, gte, transactions } from "@Faworra/database/schema";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  taxRate: z
    .union([z.number(), z.string()])
    .transform((v) => (v === null || v === undefined || v === "" ? null : String(v)))
    .nullable()
    .optional(),
  taxType: z.string().nullable().optional(),
  taxReportingCode: z.string().nullable().optional(),
  excluded: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

export const transactionCategoriesRouter = createTRPCRouter({
  list: teamProcedure.query(async ({ ctx }) =>
    getTransactionCategories(ctx.db, { teamId: ctx.teamId })
  ),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getCategoryById(ctx.db, ctx.teamId, input.id)),

  create: teamProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const row = await createCategory(ctx.db, { teamId: ctx.teamId, ...input } as any);
    // Denormalize exclude flag onto recent transactions for performance-sensitive queries
    if (row && input.excluded === true && row.slug) {
      const since = new Date();
      since.setMonth(since.getMonth() - 18);
      const sinceStr = since.toISOString().slice(0, 10);
      await ctx.db
        .update(transactions)
        .set({ excludeFromAnalytics: true })
        .where(
          and(
            eq(transactions.teamId, ctx.teamId),
            eq(transactions.categorySlug, row.slug),
            gte(transactions.date, sinceStr as any)
          )
        );
    }
    // Activity log
    await ctx.db.insert(activities).values({
      teamId: ctx.teamId,
      userId: ctx.userId,
      type: "category.create",
      metadata: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
      } as any,
    });
    return row;
  }),

  update: teamProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input as any;
    const row = await updateCategory(ctx.db, ctx.teamId, { id, ...data });
    // If excluded flag provided, mirror onto recent transactions for this category
    if (row && row.slug && input.excluded !== undefined) {
      const since = new Date();
      since.setMonth(since.getMonth() - 18);
      const sinceStr = since.toISOString().slice(0, 10);
      await ctx.db
        .update(transactions)
        .set({ excludeFromAnalytics: Boolean(input.excluded) })
        .where(
          and(
            eq(transactions.teamId, ctx.teamId),
            eq(transactions.categorySlug, row.slug),
            gte(transactions.date, sinceStr as any)
          )
        );
    }
    // Activity log
    await ctx.db.insert(activities).values({
      teamId: ctx.teamId,
      userId: ctx.userId,
      type: "category.update",
      metadata: {
        id: row?.id,
        name: row?.name,
        slug: row?.slug,
        parentId: row?.parentId,
      } as any,
    });
    return row;
  }),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await deleteCategory(ctx.db, ctx.teamId, input.id);
      // Activity log
      await ctx.db.insert(activities).values({
        teamId: ctx.teamId,
        userId: ctx.userId,
        type: "category.delete",
        metadata: {
          id: row?.id,
          name: row?.name,
          slug: row?.slug,
        } as any,
      });
      return row;
    }),

  seedChildren: teamProcedure.mutation(async ({ ctx }) => {
    const { seedCategoryHierarchy } = await import(
      "@Faworra/database/queries/transaction-categories"
    );
    const result = await seedCategoryHierarchy(ctx.db, ctx.teamId);
    // Activity log
    await ctx.db.insert(activities).values({
      teamId: ctx.teamId,
      userId: ctx.userId,
      type: "category.seed_children",
      metadata: { count: Array.isArray(result) ? result.length : 0 } as any,
    });
    return result;
  }),
});
