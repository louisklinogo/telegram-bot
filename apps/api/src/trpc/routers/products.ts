import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import { getProductsEnriched } from "@Faworra/database/queries";

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
});

export type ProductsRouter = typeof productsRouter;
