import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import { getProductsEnriched } from "@Faworra/database/queries";
import { productMedia, and, eq } from "@Faworra/database/schema";

export const productsRouter = createTRPCRouter({
  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.products.findMany({
        where: (p, { and, eq, isNull }) => and(eq(p.teamId, ctx.teamId), eq(p.id, input.id), isNull(p.deletedAt)),
        limit: 1,
      } as any);
      return rows?.[0] || null;
    }),

  create: teamProcedure
    .input(
      z.object({
        name: z.string().min(1),
        status: z.enum(["active", "draft", "archived"]).default("active"),
        type: z.enum(["physical", "service", "digital", "bundle"]).default("physical"),
        categorySlug: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert((await import("@Faworra/database/schema")).products)
        .values({
          teamId: ctx.teamId,
          name: input.name,
          status: input.status as any,
          type: input.type as any,
          categorySlug: input.categorySlug ?? null,
          description: input.description ?? null,
        })
        .returning();
      return row;
    }),

  update: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        status: z.enum(["active", "draft", "archived"]).optional(),
        type: z.enum(["physical", "service", "digital", "bundle"]).optional(),
        categorySlug: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input as any;
      const [row] = await ctx.db
        .update((await import("@Faworra/database/schema")).products)
        .set({ ...data, updatedAt: new Date() })
        .where(
          (await import("@Faworra/database/schema")).and(
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.teamId,
              ctx.teamId,
            ),
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.id,
              id,
            ),
          ),
        )
        .returning();
      return row;
    }),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update((await import("@Faworra/database/schema")).products)
        .set({ deletedAt: new Date() })
        .where(
          (await import("@Faworra/database/schema")).and(
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.teamId,
              ctx.teamId,
            ),
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.id,
              input.id,
            ),
          ),
        )
        .returning();
      return row;
    }),
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

  mediaUpdate: teamProcedure
    .input(z.object({ id: z.string().uuid(), alt: z.string().optional(), position: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productMedia)
        .set({ alt: input.alt ?? undefined, position: input.position ?? undefined })
        .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, input.id)))
        .returning();
      return row;
    }),

  variantCreate: teamProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        name: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        price: z.number().nullable().optional(),
        currency: z.string().nullable().optional(),
        cost: z.number().nullable().optional(),
        fulfillmentType: z.enum(["stocked", "dropship", "made_to_order", "preorder"]).optional(),
        stockManaged: z.boolean().optional(),
        leadTimeDays: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { productVariants } = await import("@Faworra/database/schema");
      const [row] = await ctx.db
        .insert(productVariants)
        .values({
          teamId: ctx.teamId,
          productId: input.productId,
          name: input.name ?? null,
          sku: input.sku ?? null,
          barcode: input.barcode ?? null,
          price: input.price as any,
          currency: input.currency ?? null,
          cost: input.cost as any,
          fulfillmentType: (input.fulfillmentType as any) ?? "stocked",
          stockManaged: input.stockManaged ?? true,
          leadTimeDays: input.leadTimeDays ?? null,
        })
        .returning();
      return row;
    }),

  variantUpdate: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        price: z.number().nullable().optional(),
        currency: z.string().nullable().optional(),
        cost: z.number().nullable().optional(),
        fulfillmentType: z.enum(["stocked", "dropship", "made_to_order", "preorder"]).optional(),
        stockManaged: z.boolean().optional(),
        leadTimeDays: z.number().nullable().optional(),
        status: z.enum(["active","draft","archived"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { productVariants } = await import("@Faworra/database/schema");
      const { id, ...data } = input as any;
      const [row] = await ctx.db
        .update(productVariants)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(productVariants.teamId, ctx.teamId), eq(productVariants.id, id)))
        .returning();
      return row;
    }),

  variantDelete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { productVariants } = await import("@Faworra/database/schema");
      const [row] = await ctx.db
        .delete(productVariants)
        .where(
          and(
            eq(productVariants.teamId, ctx.teamId),
            eq(productVariants.id, input.id),
          ),
        )
        .returning();
      return row;
    }),

  variantsByProduct: teamProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { productVariants } = await import("@Faworra/database/schema");
      const rows = await ctx.db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.teamId, ctx.teamId), eq(productVariants.productId, input.productId)));
      return rows;
    }),

  inventoryByVariant: teamProcedure
    .input(z.object({ variantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { productInventory, inventoryLocations } = await import("@Faworra/database/schema");
      const rows = await ctx.db
        .select({
          locationId: productInventory.locationId,
          onHand: productInventory.onHand,
          allocated: productInventory.allocated,
          safetyStock: productInventory.safetyStock,
          locationName: inventoryLocations.name,
        })
        .from(productInventory)
        .leftJoin(
          inventoryLocations,
          and(
            eq(productInventory.locationId, inventoryLocations.id),
            eq(inventoryLocations.teamId, ctx.teamId),
          ),
        )
        .where(and(eq(productInventory.teamId, ctx.teamId), eq(productInventory.variantId, input.variantId)));
      return rows;
    }),

  inventoryLocations: teamProcedure.query(async ({ ctx }) => {
    const { inventoryLocations } = await import("@Faworra/database/schema");
    const rows = await ctx.db
      .select()
      .from(inventoryLocations)
      .where(eq(inventoryLocations.teamId, ctx.teamId));
    return rows;
  }),

  inventoryUpsert: teamProcedure
    .input(
      z.object({
        variantId: z.string().uuid(),
        entries: z.array(
          z.object({ locationId: z.string().uuid(), onHand: z.number().int().nonnegative(), allocated: z.number().int().nonnegative().default(0), safetyStock: z.number().int().nonnegative().default(0) }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { productInventory } = await import("@Faworra/database/schema");
      for (const e of input.entries) {
        await ctx.db
          .insert(productInventory)
          .values({
            teamId: ctx.teamId,
            variantId: input.variantId,
            locationId: e.locationId,
            onHand: e.onHand,
            allocated: e.allocated,
            safetyStock: e.safetyStock,
          })
          .onConflictDoUpdate({
            target: [productInventory.variantId, productInventory.locationId],
            set: {
              onHand: e.onHand,
              allocated: e.allocated,
              safetyStock: e.safetyStock,
              updatedAt: new Date(),
            },
          });
      }
      return { ok: true } as const;
    }),
});

export type ProductsRouter = typeof productsRouter;
