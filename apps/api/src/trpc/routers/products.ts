import { getProductsEnriched } from "@Faworra/database/queries";
import { and, asc, desc, eq, isNull, productMedia, products, sql } from "@Faworra/database/schema";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

export const productsRouter = createTRPCRouter({
  details: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { products, productVariants } = await import("@Faworra/database/schema");
      const productRows = await ctx.db
        .select({
          id: products.id,
          teamId: products.teamId,
          name: products.name,
          status: products.status,
          type: products.type,
          categorySlug: products.categorySlug,
          description: products.description,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(
          (await import("@Faworra/database/schema")).and(
            (await import("@Faworra/database/schema")).eq(products.teamId, ctx.teamId),
            (await import("@Faworra/database/schema")).eq(products.id, input.id),
            (await import("@Faworra/database/schema")).isNull(products.deletedAt)
          )
        )
        .limit(1);
      const product = productRows[0] || null;
      if (!product) return null;

      const variants = await ctx.db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          sku: productVariants.sku,
          barcode: productVariants.barcode,
          price: productVariants.price,
          currency: productVariants.currency,
          status: productVariants.status,
          fulfillmentType: productVariants.fulfillmentType,
          stockManaged: productVariants.stockManaged,
          leadTimeDays: productVariants.leadTimeDays,
          updatedAt: productVariants.updatedAt,
        })
        .from(productVariants)
        .where(
          (await import("@Faworra/database/schema")).and(
            (await import("@Faworra/database/schema")).eq(productVariants.teamId, ctx.teamId),
            (await import("@Faworra/database/schema")).eq(productVariants.productId, input.id)
          )
        );

      return { product, variants } as const;
    }),
  byId: teamProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(products)
      .where(
        and(eq(products.teamId, ctx.teamId), eq(products.id, input.id), isNull(products.deletedAt))
      )
      .limit(1);
    return rows[0] || null;
  }),

  create: teamProcedure
    .input(
      z.object({
        name: z.string().min(1),
        status: z.enum(["active", "draft", "archived"]).default("active"),
        type: z.enum(["physical", "service", "digital", "bundle"]).default("physical"),
        categorySlug: z.string().optional(),
        description: z.string().optional(),
      })
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
      })
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
              ctx.teamId
            ),
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.id,
              id
            )
          )
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
              ctx.teamId
            ),
            (await import("@Faworra/database/schema")).eq(
              (await import("@Faworra/database/schema")).products.id,
              input.id
            )
          )
        )
        .returning();
      return row;
    }),
  list: teamProcedure
    .input(
      z
        .object({
          search: z.string().min(1).optional(),
          status: z.array(z.enum(["active", "draft", "archived"])).optional(),
          categorySlug: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.object({ updatedAt: z.string().datetime(), id: z.string().uuid() }).nullish(),
        })
        .optional()
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
    .input(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(productMedia)
        .where(
          and(
            eq(productMedia.teamId, ctx.teamId),
            eq(productMedia.productId, input.productId),
            input.variantId ? eq(productMedia.variantId, input.variantId) : sql`true`
          )
        )
        .orderBy(
          desc(productMedia.isPrimary),
          asc(sql`COALESCE(${productMedia.position}, 2147483647)`),
          desc(productMedia.createdAt)
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
              input.variantId ? eq(productMedia.variantId, input.variantId) : sql`true`
            )
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

  mediaAddMany: teamProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        items: z
          .array(
            z.object({
              variantId: z.string().uuid().optional(),
              path: z.string().min(1),
              alt: z.string().optional(),
              isPrimary: z.boolean().optional(),
              position: z.number().int().optional(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hasPrimary = input.items.some((i) => i.isPrimary);
      if (hasPrimary) {
        // If any item is primary for a scope, clear current primary for that scope once
        const variantIds = Array.from(new Set(input.items.map((i) => i.variantId || null)));
        for (const vid of variantIds) {
          await ctx.db
            .update(productMedia)
            .set({ isPrimary: false })
            .where(
              and(
                eq(productMedia.teamId, ctx.teamId),
                eq(productMedia.productId, input.productId),
                vid ? eq(productMedia.variantId, vid) : sql`true`
              )
            );
        }
      }
      const values = input.items.map((i) => ({
        teamId: ctx.teamId,
        productId: input.productId,
        variantId: i.variantId ?? null,
        path: i.path,
        alt: i.alt ?? null,
        isPrimary: Boolean(i.isPrimary),
        position: i.position ?? null,
      }));
      const rows = await ctx.db.insert(productMedia).values(values).returning();
      return rows;
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
            row.variantId ? eq(productMedia.variantId, row.variantId) : sql`true`
          )
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
    .input(
      z.object({
        id: z.string().uuid(),
        alt: z.string().optional(),
        position: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productMedia)
        .set({ alt: input.alt ?? undefined, position: input.position ?? undefined })
        .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, input.id)))
        .returning();
      return row;
    }),

  mediaReorder: teamProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        order: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(
      async ({ ctx, input }) =>
        await ctx.db.transaction(async (tx) => {
          const scopeWhere = and(
            eq(productMedia.teamId, ctx.teamId),
            eq(productMedia.productId, input.productId),
            input.variantId ? eq(productMedia.variantId, input.variantId) : sql`true`
          );
          const rows = await tx
            .select({ id: productMedia.id })
            .from(productMedia)
            .where(scopeWhere)
            .orderBy(
              desc(productMedia.isPrimary),
              asc(sql`COALESCE(${productMedia.position}, 2147483647)`),
              desc(productMedia.createdAt)
            );
          const validSet = new Set(rows.map((r) => r.id));
          const requested = input.order.filter((id) => validSet.has(id));
          const requestedSet = new Set(requested);
          const remaining = rows.map((r) => r.id).filter((id) => !requestedSet.has(id));
          const finalOrder = [...requested, ...remaining];
          for (let i = 0; i < finalOrder.length; i++) {
            await tx
              .update(productMedia)
              .set({ position: i })
              .where(and(eq(productMedia.teamId, ctx.teamId), eq(productMedia.id, finalOrder[i])));
          }
          return { count: finalOrder.length } as const;
        })
    ),

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
      })
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
        status: z.enum(["active", "draft", "archived"]).optional(),
      })
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
        .where(and(eq(productVariants.teamId, ctx.teamId), eq(productVariants.id, input.id)))
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
        .where(
          and(
            eq(productVariants.teamId, ctx.teamId),
            eq(productVariants.productId, input.productId)
          )
        );
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
            eq(inventoryLocations.teamId, ctx.teamId)
          )
        )
        .where(
          and(
            eq(productInventory.teamId, ctx.teamId),
            eq(productInventory.variantId, input.variantId)
          )
        );
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
          z.object({
            locationId: z.string().uuid(),
            onHand: z.number().int().nonnegative(),
            allocated: z.number().int().nonnegative().default(0),
            safetyStock: z.number().int().nonnegative().default(0),
          })
        ),
      })
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
