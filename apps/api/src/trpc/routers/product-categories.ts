import {
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  getProductCategoryById,
  listProductCategoryMappings,
  removeProductCategoryMapping,
  updateProductCategory,
  upsertProductCategoryMapping,
} from "@Faworra/database/queries/product-categories";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

export const productCategoriesRouter = createTRPCRouter({
  list: teamProcedure.query(async ({ ctx }) =>
    getProductCategories(ctx.db, { teamId: ctx.teamId })
  ),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getProductCategoryById(ctx.db, ctx.teamId, input.id)),

  create: teamProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) =>
      createProductCategory(ctx.db, { teamId: ctx.teamId, ...input })
    ),

  update: teamProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => updateProductCategory(ctx.db, ctx.teamId, input as any)),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => deleteProductCategory(ctx.db, ctx.teamId, input.id)),

  mappings: teamProcedure.query(async ({ ctx }) => listProductCategoryMappings(ctx.db, ctx.teamId)),

  mapToTransaction: teamProcedure
    .input(
      z.object({ productCategoryId: z.string().uuid(), transactionCategoryId: z.string().uuid() })
    )
    .mutation(async ({ ctx, input }) =>
      upsertProductCategoryMapping(ctx.db, { teamId: ctx.teamId, ...input })
    ),

  unmap: teamProcedure
    .input(z.object({ productCategoryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      removeProductCategoryMapping(ctx.db, {
        teamId: ctx.teamId,
        productCategoryId: input.productCategoryId,
      })
    ),
});

export type ProductCategoriesRouter = typeof productCategoriesRouter;
