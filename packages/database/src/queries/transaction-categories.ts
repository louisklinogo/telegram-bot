import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import { transactionCategories } from "../schema";

export type CreateCategoryParams = {
  teamId: string;
  name: string;
  color?: string | null;
  description?: string | null;
  parentId?: string | null;
  taxRate?: string | null; // numeric(10,2) as string
  taxType?: string | null;
  taxReportingCode?: string | null;
  excluded?: boolean | null;
};

export type UpdateCategoryParams = Partial<Omit<CreateCategoryParams, "teamId">> & {
  id: string;
};

function sanitizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(db: DbClient, teamId: string, name: string) {
  const base = sanitizeSlug(name) || "category";
  let slug = base;
  let counter = 1;

  // Check existing slugs for this team
  // Loop with a reasonable upper bound
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: transactionCategories.id })
      .from(transactionCategories)
      .where(and(eq(transactionCategories.teamId, teamId), eq(transactionCategories.slug, slug)))
      .limit(1);
    if (existing.length === 0) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

export async function getCategoryById(db: DbClient, teamId: string, id: string) {
  const res = await db
    .select()
    .from(transactionCategories)
    .where(and(eq(transactionCategories.teamId, teamId), eq(transactionCategories.id, id)))
    .limit(1);
  return res[0] || null;
}

export async function getCategoriesFlat(db: DbClient, teamId: string) {
  return db
    .select()
    .from(transactionCategories)
    .where(eq(transactionCategories.teamId, teamId))
    .orderBy(desc(transactionCategories.system), transactionCategories.name);
}

async function hasChildren(db: DbClient, teamId: string, id: string) {
  const res = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(transactionCategories)
    .where(and(eq(transactionCategories.teamId, teamId), eq(transactionCategories.parentId, id)));
  return Number((res?.[0] as any)?.c || 0) > 0;
}

async function validateParent(db: DbClient, teamId: string, parentId: string | null | undefined) {
  if (!parentId) return;
  const parent = await getCategoryById(db, teamId, parentId);
  if (!parent) throw new Error("Parent category not found");
}

async function assertNoCycle(db: DbClient, teamId: string, selfId: string, newParentId: string | null | undefined) {
  if (!newParentId) return;
  if (newParentId === selfId) throw new Error("Cannot set category as its own parent");
  let cursor: string | null | undefined = newParentId;
  // Walk up the tree and ensure we don't encounter selfId
  for (let i = 0; i < 32 && cursor; i++) {
    const node = await getCategoryById(db, teamId, cursor);
    if (!node) break;
    if (node.id === selfId) throw new Error("Circular parent relationship is not allowed");
    cursor = node.parentId as string | null | undefined;
  }
}

export async function createCategory(db: DbClient, params: CreateCategoryParams) {
  const { teamId, name, color, description, parentId, taxRate, taxType, taxReportingCode, excluded } = params;
  await validateParent(db, teamId, parentId ?? null);

  const slug = await generateUniqueSlug(db, teamId, name);
  const [row] = await db
    .insert(transactionCategories)
    .values({
      teamId,
      name,
      slug,
      color: color ?? null,
      description: description ?? null,
      parentId: parentId ?? null,
      taxRate: taxRate ?? null,
      taxType: taxType ?? null,
      taxReportingCode: taxReportingCode ?? null,
      excluded: excluded ?? false,
      system: false,
    })
    .returning();
  return row;
}

export async function updateCategory(db: DbClient, teamId: string, params: UpdateCategoryParams) {
  const { id, name, color, description, parentId, taxRate, taxType, taxReportingCode, excluded } = params;
  const current = await getCategoryById(db, teamId, id);
  if (!current) throw new Error("Category not found");

  // Parent change protections
  if (parentId !== undefined && parentId !== current.parentId) {
    if (await hasChildren(db, teamId, id)) {
      throw new Error("Cannot change parent of a category that has children");
    }
    await validateParent(db, teamId, parentId ?? null);
    await assertNoCycle(db, teamId, id, parentId ?? null);
  }

  const [row] = await db
    .update(transactionCategories)
    .set({
      name: name ?? current.name,
      // slug policy: keep stable on rename (do not change slug automatically)
      color: color ?? current.color,
      description: description ?? current.description,
      parentId: parentId ?? current.parentId,
      taxRate: taxRate ?? current.taxRate,
      taxType: taxType ?? current.taxType,
      taxReportingCode: taxReportingCode ?? current.taxReportingCode,
      excluded: excluded ?? current.excluded,
      updatedAt: new Date(),
    })
    .where(and(eq(transactionCategories.id, id), eq(transactionCategories.teamId, teamId)))
    .returning();
  return row;
}

export async function deleteCategory(db: DbClient, teamId: string, id: string) {
  const current = await getCategoryById(db, teamId, id);
  if (!current) throw new Error("Category not found");
  if (current.system) throw new Error("System categories cannot be deleted");

  const [row] = await db
    .delete(transactionCategories)
    .where(and(eq(transactionCategories.id, id), eq(transactionCategories.teamId, teamId)))
    .returning();
  return row;
}
