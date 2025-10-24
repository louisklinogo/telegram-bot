import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import { getProductsEnriched } from "@Faworra/database/queries";
import { productMedia, and, eq } from "@Faworra/database/schema";

export const productsRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z
        .object({
          search: z.string().min(1).optional(),
          status: z.array(z.enum(["active", "draft", "archived"])) .optional(),
          categorySlug: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z
            .object({ updatedAt: z.string().datetime(), id: z.string().uuid() })
            .nullish(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await getProductsEnriched(ctx.db, {
        teamId: ctx.teamId,
        search: input?.search,
        status: input?.status,
        categorySlug: input?.categorySlug,
        limit: input?.limit,
        cursor: input?.cursor
          ? { updatedAt: new Date(input.cursor.updatedAt), id: input.cursor.id }
          : null,
      });

      const last = rows.at(-1);
      const nextCursor = last
        ? { updatedAt: last.product.updatedAt as Date, id: last.product.id }
        : null;
      return { items: rows, nextCursor };
    }),

  mediaList: teamProcedure
    .input(
      z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional() })
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(productMedia)
        .where(
          and(
            eq(productMedia.teamId, ctx.teamId),
            eq(productMedia.productId, input.productId),
            input.variantId ? eq(productMedia.variantId, input.variantId) : ({} as any),
          ),
        );
      return rows;
    }),

  mediaAdd: teamProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        path: z.string().min(1),
        alt: z.string().optional(),
        isPrimary: z.boolean().optional(),
        position: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isPrimary) {
        await ctx.db
          .update(productMedia)
          .set({ isPrimary: false })
          .where(
            and(
              eq(productMedia.teamId, ctx.teamId),
              eq(productMedia.productId, input.productId),
              input.variantId ? eq(productMedia.variantId, input.variantId) : ({} as any),
            ),
          );
      }
      const [row] = await ctx.db
        .insert(productMedia)
        .values({
          teamId: ctx.teamId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          path: input.path,
          alt: input.alt ?? null,
          isPrimary: Boolean(input.isPrimary),
          position: input.position ?? null,
        })
        .returning();
      return row;
    }),

  mediaSetPrimary: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db
        .select()
        .from(productMedia)
        .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, input.id)));
      const row = current[0];
      if (!row) return null;
      await ctx.db
        .update(productMedia)
        .set({ isPrimary: false })
        .where(
          and(
            eq(productMedia.teamId, ctx.teamId),
            eq(productMedia.productId, row.productId),
            row.variantId ? eq(productMedia.variantId, row.variantId) : ({} as any),
          ),
        );
      const [updated] = await ctx.db
        .update(productMedia)
        .set({ isPrimary: true })
        .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, input.id)))
        .returning();
      return updated;
    }),

  mediaDelete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(productMedia)
        .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, input.id)))
        .returning();
      return deleted;
    }),
});

export type ProductsRouter = typeof productsRouter;
