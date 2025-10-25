import { and, desc, eq, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import { productCategories, productCategoryMappings, transactionCategories } from "../schema";

export type CreateProductCategoryParams = {
  teamId: string;
  name: string;
  color?: string | null;
  description?: string | null;
  parentId?: string | null;
  system?: boolean | null;
};

export type UpdateProductCategoryParams = Partial<Omit<CreateProductCategoryParams, "teamId">> & {
  id: string;
};

function toSlug(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `category-${Date.now()}`;
}

async function uniqueSlug(db: DbClient, teamId: string, name: string) {
  const base = toSlug(name);
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.teamId, teamId), eq(productCategories.slug, slug)))
      .limit(1);
    if (!existing[0]) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function getProductCategoryById(db: DbClient, teamId: string, id: string) {
  const res = await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.teamId, teamId), eq(productCategories.id, id)))
    .limit(1);
  return res[0] || null;
}

export async function getProductCategoriesFlat(db: DbClient, teamId: string) {
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.teamId, teamId))
    .orderBy(desc(productCategories.system), productCategories.name);
}

export async function getProductCategories(db: DbClient, params: { teamId: string }) {
  const { teamId } = params;
  const all = await getProductCategoriesFlat(db, teamId);
  const byId = new Map<string, any>();
  const roots: any[] = [];
  for (const c of all) byId.set(c.id as string, { ...c, children: [] });
  for (const c of all) {
    const node = byId.get(c.id as string);
    if (c.parentId) {
      const p = byId.get(c.parentId as string);
      if (p) p.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function createProductCategory(db: DbClient, params: CreateProductCategoryParams) {
  const { teamId, name, color, description, parentId, system } = params;
  // validate parent
  if (parentId) {
    const parent = await getProductCategoryById(db, teamId, parentId);
    if (!parent) throw new Error("Parent category not found");
  }
  const slug = await uniqueSlug(db, teamId, name);
  const [row] = await db
    .insert(productCategories)
    .values({
      teamId,
      name,
      slug,
      color: color ?? null,
      description: description ?? null,
      parentId: parentId ?? null,
      system: Boolean(system) ?? false,
    })
    .returning();
  return row;
}

export async function updateProductCategory(
  db: DbClient,
  teamId: string,
  params: UpdateProductCategoryParams
) {
  const { id, name, color, description, parentId, system } = params;
  const current = await getProductCategoryById(db, teamId, id);
  if (!current) throw new Error("Category not found");
  if (current.system && name && name !== current.name) {
    // Protect system categories from rename
    throw new Error("System categories cannot be renamed");
  }
  if (parentId !== undefined && parentId !== current.parentId) {
    // Ensure no cycles (simple check: parent cannot be self)
    if (parentId === id) throw new Error("Cannot set category as its own parent");
  }
  const [row] = await db
    .update(productCategories)
    .set({
      name: name ?? current.name,
      color: color ?? current.color,
      description: description ?? current.description,
      parentId: parentId ?? current.parentId,
      system: system ?? current.system,
      updatedAt: new Date(),
    })
    .where(and(eq(productCategories.id, id), eq(productCategories.teamId, teamId)))
    .returning();
  return row;
}

export async function deleteProductCategory(db: DbClient, teamId: string, id: string) {
  const current = await getProductCategoryById(db, teamId, id);
  if (!current) throw new Error("Category not found");
  if (current.system) throw new Error("System categories cannot be deleted");
  const [row] = await db
    .delete(productCategories)
    .where(and(eq(productCategories.id, id), eq(productCategories.teamId, teamId)))
    .returning();
  return row;
}

// Mapping helpers
export async function upsertProductCategoryMapping(
  db: DbClient,
  params: { teamId: string; productCategoryId: string; transactionCategoryId: string }
) {
  const { teamId, productCategoryId, transactionCategoryId } = params;
  const [row] = await db
    .insert(productCategoryMappings)
    .values({ teamId, productCategoryId, transactionCategoryId })
    .onConflictDoUpdate({
      target: [productCategoryMappings.teamId, productCategoryMappings.productCategoryId],
      set: { transactionCategoryId, createdAt: sql`now()` },
    })
    .returning();
  return row;
}

export async function removeProductCategoryMapping(
  db: DbClient,
  params: { teamId: string; productCategoryId: string }
) {
  const { teamId, productCategoryId } = params;
  const [row] = await db
    .delete(productCategoryMappings)
    .where(
      and(
        eq(productCategoryMappings.teamId, teamId),
        eq(productCategoryMappings.productCategoryId, productCategoryId)
      )
    )
    .returning();
  return row;
}

export async function listProductCategoryMappings(db: DbClient, teamId: string) {
  // Join to include slugs/names for convenience
  const rows = await db
    .select({
      productCategoryId: productCategoryMappings.productCategoryId,
      transactionCategoryId: productCategoryMappings.transactionCategoryId,
    })
    .from(productCategoryMappings)
    .where(eq(productCategoryMappings.teamId, teamId));
  return rows;
}
