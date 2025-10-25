import "dotenv/config";
import { db } from "@Faworra/database/client";
import {
  productCategories,
  productCategoryMappings,
  products,
  teams,
  transactionCategories,
} from "@Faworra/database/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

async function toTitle(slug: string) {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

async function main() {
  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .orderBy(desc(teams.createdAt as any))
    .execute();
  for (const team of teamRows) {
    const teamId = team.id as string;
    const distinct = await db
      .select({ slug: products.categorySlug })
      .from(products)
      .where(
        and(
          eq(products.teamId, teamId),
          isNull(products.deletedAt),
          sql`${products.categorySlug} IS NOT NULL`
        )
      )
      .groupBy(products.categorySlug);

    for (const row of distinct) {
      const slug = row.slug as string | null;
      if (!slug) continue;

      // Skip if product category already exists
      const existing = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(and(eq(productCategories.teamId, teamId), eq(productCategories.slug, slug)))
        .limit(1);
      let productCategoryId: string | null = existing[0]?.id || null;
      if (!productCategoryId) {
        // Resolve name from transactions category if exists else Title Case slug
        const trxCat = await db
          .select({ id: transactionCategories.id, name: transactionCategories.name })
          .from(transactionCategories)
          .where(
            and(eq(transactionCategories.teamId, teamId), eq(transactionCategories.slug, slug))
          )
          .limit(1);
        const name = trxCat[0]?.name || (await toTitle(slug));
        const [created] = await db
          .insert(productCategories)
          .values({
            teamId,
            name,
            slug,
            color: null,
            description: null,
            parentId: null,
            system: false,
          })
          .returning({ id: productCategories.id });
        productCategoryId = created.id as string;
      }

      // Create mapping if matching transaction category exists
      const trxCat = await db
        .select({ id: transactionCategories.id })
        .from(transactionCategories)
        .where(and(eq(transactionCategories.teamId, teamId), eq(transactionCategories.slug, slug)))
        .limit(1);
      if (trxCat[0]) {
        await db
          .insert(productCategoryMappings)
          .values({
            teamId,
            productCategoryId: productCategoryId!,
            transactionCategoryId: trxCat[0].id as string,
          })
          .onConflictDoNothing();
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log("Backfill complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
