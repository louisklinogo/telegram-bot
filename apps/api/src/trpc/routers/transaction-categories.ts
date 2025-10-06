import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getTransactionCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@cimantikos/database/queries";
import { activities } from "@cimantikos/database/schema";

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
  list: teamProcedure.query(async ({ ctx }) => {
    return getTransactionCategories(ctx.db, { teamId: ctx.teamId });
  }),

  byId: teamProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return getCategoryById(ctx.db, ctx.teamId, input.id);
  }),

  create: teamProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const row = await createCategory(ctx.db, { teamId: ctx.teamId, ...input } as any);
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

  delete: teamProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
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
});
