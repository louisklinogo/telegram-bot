import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { documents } from "../schema";

/**
 * Document queries for Vault feature
 */

export type GetDocumentsParams = {
  teamId: string;
  q?: string; // Search query
  tags?: string[]; // Filter by tags
  orderId?: string;
  invoiceId?: string;
  clientId?: string;
  start?: string; // Start date (ISO format)
  end?: string; // End date (ISO format)
  limit?: number;
  cursor?: string; // For pagination
};

export async function getDocuments(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: GetDocumentsParams
) {
  const { teamId, q, tags, orderId, invoiceId, clientId, start, end, limit = 20, cursor } = params;

  const conditions = [eq(documents.teamId, teamId), isNull(documents.deletedAt)];

  // Search by name
  if (q) {
    conditions.push(ilike(documents.name, `%${q}%`));
  }

  // Filter by tags (array overlap)
  if (tags && tags.length > 0) {
    conditions.push(sql`${documents.tags} && ${tags}`);
  }

  // Filter by relations
  if (orderId) {
    conditions.push(eq(documents.orderId, orderId));
  }
  if (invoiceId) {
    conditions.push(eq(documents.invoiceId, invoiceId));
  }
  if (clientId) {
    conditions.push(eq(documents.clientId, clientId));
  }

  // Date range filter
  if (start) {
    conditions.push(gte(documents.createdAt, new Date(start)));
  }
  if (end) {
    // Add 1 day to include the end date
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    conditions.push(lte(documents.createdAt, endDate));
  }

  // Cursor-based pagination
  if (cursor) {
    conditions.push(
      sql`${documents.createdAt} < (SELECT created_at FROM ${documents} WHERE id = ${cursor})`
    );
  }

  const results = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export type GetDocumentByIdParams = {
  id: string;
  teamId: string;
};

export async function getDocumentById(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: GetDocumentByIdParams
) {
  const { id, teamId } = params;

  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.teamId, teamId), isNull(documents.deletedAt)))
    .limit(1);

  return document;
}

export type CreateDocumentParams = {
  teamId: string;
  name: string;
  pathTokens: string[];
  mimeType?: string;
  size?: number;
  tags?: string[];
  orderId?: string;
  invoiceId?: string;
  clientId?: string;
  uploadedBy?: string;
  metadata?: Record<string, unknown>;
};

export async function createDocument(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: CreateDocumentParams
) {
  const [document] = await db
    .insert(documents)
    .values({
      teamId: params.teamId,
      name: params.name,
      pathTokens: params.pathTokens,
      mimeType: params.mimeType,
      size: params.size,
      tags: params.tags || [],
      orderId: params.orderId,
      invoiceId: params.invoiceId,
      clientId: params.clientId,
      uploadedBy: params.uploadedBy,
      metadata: params.metadata || {},
      processingStatus: "completed", // Set to completed immediately since we don't have background processing
    })
    .returning();

  return document;
}

export type UpdateDocumentParams = {
  id: string;
  teamId: string;
  name?: string;
  tags?: string[];
  processingStatus?: string;
  metadata?: Record<string, unknown>;
};

export async function updateDocument(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: UpdateDocumentParams
) {
  const { id, teamId, ...updates } = params;

  const [document] = await db
    .update(documents)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, id), eq(documents.teamId, teamId), isNull(documents.deletedAt)))
    .returning();

  return document;
}

export type DeleteDocumentParams = {
  id: string;
  teamId: string;
};

export async function deleteDocument(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: DeleteDocumentParams
) {
  const { id, teamId } = params;

  // Soft delete
  const [document] = await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.teamId, teamId), isNull(documents.deletedAt)))
    .returning();

  return document;
}

export type GetDocumentStatsParams = {
  teamId: string;
};

export async function getDocumentStats(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: GetDocumentStatsParams
) {
  const { teamId } = params;

  const [stats] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${documents.size}), 0)::bigint`,
    })
    .from(documents)
    .where(and(eq(documents.teamId, teamId), isNull(documents.deletedAt)));

  return stats;
}

export type GetDocumentsByTagsParams = {
  teamId: string;
  limit?: number;
};

export async function getAllDocumentTags(
  db: PostgresJsDatabase<Record<string, unknown>>,
  params: GetDocumentsByTagsParams
) {
  const { teamId } = params;

  // Get all unique tags across documents
  const result = await db
    .select({
      tag: sql<string>`unnest(${documents.tags})`,
      count: sql<number>`count(*)::int`,
    })
    .from(documents)
    .where(and(eq(documents.teamId, teamId), isNull(documents.deletedAt)))
    .groupBy(sql`unnest(${documents.tags})`)
    .orderBy(desc(sql`count(*)`));

  return result;
}
