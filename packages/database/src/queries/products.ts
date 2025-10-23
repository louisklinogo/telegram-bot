import { and, desc, eq, ilike, isNull, sql, sum, min, max } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  products,
  productVariants,
  productInventory,
} from "../schema";

export type ProductListParams = {
  teamId: string;
  search?: string;
  status?: ("active" | "draft" | "archived")[];
  categorySlug?: string;
  limit?: number;
  cursor?: { updatedAt: Date; id: string } | null;
};

/**
 * List products with aggregated variant price range and total stock across locations.
 */
export async function getProductsEnriched(db: DbClient, params: ProductListParams) {
  const { teamId, search, status, categorySlug, limit = 50, cursor } = params;

  const rows = await db
    .select({
      product: products,
      variantsCount: sql<number>`COUNT(DISTINCT ${productVariants.id})`,
      priceMin: sql<string | null>`MIN(${productVariants.price})`,
      priceMax: sql<string | null>`MAX(${productVariants.price})`,
      stockOnHand: sql<number>`COALESCE(SUM(${productInventory.onHand}), 0)`,
      stockAllocated: sql<number>`COALESCE(SUM(${productInventory.allocated}), 0)`,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(productInventory, eq(productInventory.variantId, productVariants.id))
    .where(
      and(
        eq(products.teamId, teamId),
        isNull(products.deletedAt),
        categorySlug ? eq(products.categorySlug, categorySlug) : sql`true`,
        status && status.length ? sql`${products.status} = ANY(${status})` : sql`true`,
        search ? ilike(products.name, `%${search}%`) : sql`true`,
        cursor
          ? sql`${products.updatedAt} < ${cursor.updatedAt} OR (${products.updatedAt} = ${cursor.updatedAt} AND ${products.id} < ${cursor.id})`
          : sql`true`,
      ),
    )
    .groupBy(products.id)
    .orderBy(desc(products.updatedAt), desc(products.id))
    .limit(limit);

  return rows.map((r) => ({
    product: r.product,
    variantsCount: Number(r.variantsCount || 0),
    priceMin: r.priceMin != null ? Number(r.priceMin) : null,
    priceMax: r.priceMax != null ? Number(r.priceMax) : null,
    stockOnHand: Number(r.stockOnHand || 0),
    stockAllocated: Number(r.stockAllocated || 0),
  }));
}
